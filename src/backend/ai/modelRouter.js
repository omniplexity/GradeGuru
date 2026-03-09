const fs = require('fs');
const path = require('path');
const ProviderRegistry = require('./providerRegistry');

const OFFLINE_MODEL = {
  id: 'offline-academic',
  name: 'Offline Academic Draft',
  provider: 'Built-in',
  providerId: 'offline',
  type: 'fallback',
  model: 'offline-academic',
  capabilities: {
    chat: true,
    streaming: true,
    offline: true,
    reasoning: false,
    vision: false,
  },
};

const MODEL_CATALOG = [
  OFFLINE_MODEL,
  {
    id: 'lmstudio-local',
    name: 'LM Studio Local',
    provider: 'LM Studio',
    providerId: 'lmstudio',
    type: 'local',
    model: 'local-model',
    capabilities: { chat: true, streaming: true, offline: true, reasoning: true, vision: false },
  },
  {
    id: 'ollama-local',
    name: 'Ollama Local',
    provider: 'Ollama',
    providerId: 'ollama',
    type: 'local',
    model: 'llama3',
    capabilities: { chat: true, streaming: true, offline: true, reasoning: true, vision: true },
  },
  {
    id: 'groq-fast',
    name: 'Groq Fast',
    provider: 'Groq',
    providerId: 'groq',
    type: 'api',
    model: 'llama-3.3-70b-versatile',
    capabilities: { chat: true, streaming: true, offline: false, reasoning: true, vision: false, tools: true },
  },
  {
    id: 'together-cloud',
    name: 'Together Cloud',
    provider: 'Together',
    providerId: 'together',
    type: 'api',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    capabilities: { chat: true, streaming: true, offline: false, reasoning: true, vision: false },
  },
  {
    id: 'openrouter-cloud',
    name: 'OpenRouter Cloud',
    provider: 'OpenRouter',
    providerId: 'openrouter',
    type: 'api',
    model: 'openai/gpt-4o-mini',
    capabilities: { chat: true, streaming: true, offline: false, reasoning: true, vision: true, tools: true },
  },
];

const DEFAULT_ROUTING_ORDER = ['lmstudio', 'ollama', 'groq', 'together', 'openrouter'];

class ModelRouter {
  constructor(appOrConfig = {}) {
    const options = normalizeOptions(appOrConfig);
    this.configPath = options.configPath;
    this.providerPreference = options.providerPreference || 'local-first';
    this.routingOrder = Array.isArray(options.routingOrder) && options.routingOrder.length > 0
      ? options.routingOrder
      : DEFAULT_ROUTING_ORDER;
    this.registry = options.registry || new ProviderRegistry(options.providers);
    this.config = this.loadConfig();
    this.metrics = {
      requests: 0,
      failures: 0,
      providerUsage: {},
    };
    this.circuitBreakerThreshold = Number.isFinite(options.circuitBreakerThreshold)
      ? options.circuitBreakerThreshold
      : 2;
    this.circuitBreakerCooldownMs = Number.isFinite(options.circuitBreakerCooldownMs)
      ? options.circuitBreakerCooldownMs
      : 30000;
    this.providerFailures = new Map();
  }

  loadConfig() {
    if (this.configPath && fs.existsSync(this.configPath)) {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    }

    const config = { selectedModelId: OFFLINE_MODEL.id };
    if (this.configPath) {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }
    return config;
  }

  saveConfig() {
    if (!this.configPath) {
      return;
    }
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  listModels() {
    return MODEL_CATALOG.slice();
  }

  selectModel(modelId) {
    const model = this.getModelById(modelId) || OFFLINE_MODEL;
    this.config.selectedModelId = model.id;
    this.saveConfig();
    return model;
  }

  getSelectedModel() {
    return this.getModelById(this.config.selectedModelId) || OFFLINE_MODEL;
  }

  getModelById(modelId) {
    return this.listModels().find((entry) => entry.id === modelId) || null;
  }

  async selectProvider(modelIdOrRequirements = null, maybeRequirements = {}) {
    const modelId = typeof modelIdOrRequirements === 'string' ? modelIdOrRequirements : null;
    const requirements = typeof modelIdOrRequirements === 'string'
      ? (maybeRequirements || {})
      : (modelIdOrRequirements || {});
    const candidates = await this.getCandidateProviders(modelId, requirements);
    if (!candidates.length) {
      throw new Error('No compatible providers available');
    }
    return candidates[0];
  }

  async generate(payload) {
    const messages = payload.messages || this.buildMessages(payload);
    const selections = await this.getProviderSelections(payload.modelId, messages, payload, {
      require: payload.require,
    });
    this.metrics.requests += 1;
    let lastError = null;

    for (const selection of selections) {
      if (!selection.provider) {
        return selection.offlineText;
      }

      try {
        this.recordProviderUsage(selection.provider);
        const result = await selection.provider.generate({
          model: selection.model.model,
          messages,
          stream: false,
          temperature: payload.temperature,
          maxTokens: payload.maxTokens,
        });
        this.clearProviderFailure(selection.provider);
        return result;
      } catch (error) {
        lastError = error;
        this.recordProviderFailure(selection.provider);
        continue;
      }
    }

    if (lastError) {
      this.metrics.failures += 1;
    }
    return this.buildOfflineDraft(payload, messages);
  }

  async *stream(payload) {
    const messages = payload.messages || this.buildMessages(payload);
    const selections = await this.getProviderSelections(payload.modelId, messages, payload, {
      require: payload.require,
    });
    this.metrics.requests += 1;
    let lastError = null;

    for (const selection of selections) {
      if (!selection.provider) {
        yield* streamOfflineText(selection.offlineText);
        return;
      }

      try {
        this.recordProviderUsage(selection.provider);
        yield* selection.provider.stream({
          model: selection.model.model,
          messages,
        });
        return;
      } catch (error) {
        lastError = error;
        this.recordProviderFailure(selection.provider);
        continue;
      }
    }

    if (lastError) {
      this.metrics.failures += 1;
    }
    yield* streamOfflineText(this.buildOfflineDraft(payload, messages));
  }

  async streamText(payload, onChunk) {
    const messageId = `assistant-${Date.now()}`;
    const result = await this.executeStream(payload, (chunk) => {
      if (chunk.type === 'token') {
        onChunk({ id: messageId, content: chunk.text, done: false });
      }
      if (chunk.type === 'end') {
        onChunk({ id: messageId, content: '', done: true });
      }
    });

    return {
      id: messageId,
      content: result.content,
      model: result.model,
      error: result.error,
    };
  }

  buildMessages({ assignment, context, plan, userMessage }) {
    const relevantChunks = context?.relevantChunks || [];
    const systemSections = [
      'You are GradeGuru, an academic assistant.',
      assignment ? `Assignment: ${assignment.title}` : null,
      assignment?.instructions ? `Instructions: ${assignment.instructions}` : null,
      assignment?.rubric ? `Rubric: ${assignment.rubric}` : null,
      plan?.length ? `Plan:\n${plan.map((step, index) => `${index + 1}. ${step}`).join('\n')}` : null,
      relevantChunks.length
        ? `Retrieved context:\n${relevantChunks.map((chunk) => `- ${chunk.chunkText}`).join('\n')}`
        : 'Retrieved context:\n- No uploaded source excerpts yet.',
      'Respond with actionable academic help and keep the answer grounded in the provided assignment context.',
    ].filter(Boolean);

    return [
      { role: 'system', content: systemSections.join('\n\n') },
      { role: 'user', content: userMessage || 'Help with the assignment.' },
    ];
  }

  async routeRequest(modelId = null, messages = [], payload = {}, options = {}) {
    const selections = await this.getProviderSelections(modelId, messages, payload, options);
    return selections[0];
  }

  async getProviderSelections(modelId = null, messages = [], payload = {}, options = {}) {
    const requirements = options.require || payload.require || {};
    const candidateModels = this.getCandidateModels(
      modelId,
      options.excludeProviderIds || [],
      requirements,
    );
    const availableProviders = await this.registry.getAvailableProviders();
    const availableById = new Map(availableProviders.map((provider) => [provider.id, provider]));
    const selections = [];

    for (const model of candidateModels) {
      if (model.providerId === 'offline') {
        continue;
      }
      const provider = availableById.get(model.providerId);
      if (provider && this.isProviderCompatible(provider, model, requirements) && !this.isCircuitOpen(provider)) {
        selections.push({ provider, model });
      }
    }

    selections.push({
      provider: null,
      model: OFFLINE_MODEL,
      offlineText: this.buildOfflineDraft(payload, messages),
    });

    return selections;
  }

  async getCandidateProviders(modelId = null, requirements = {}) {
    const candidateModels = this.getCandidateModels(modelId, [], requirements);
    const availableProviders = await this.registry.getAvailableProviders();
    const availableById = new Map(availableProviders.map((provider) => [provider.id, provider]));
    const candidates = [];
    const seen = new Set();

    for (const model of candidateModels) {
      if (model.providerId === 'offline') {
        continue;
      }

      const provider = availableById.get(model.providerId);
      if (!provider || seen.has(provider.id)) {
        continue;
      }

      if (this.isProviderCompatible(provider, model, requirements) && !this.isCircuitOpen(provider)) {
        candidates.push(provider);
        seen.add(provider.id);
      }
    }

    return candidates;
  }

  getCandidateModels(modelId = null, excludeProviderIds = [], requirements = {}) {
    const selectedModel = this.getModelById(modelId) || this.getSelectedModel();
    const selectedProviderId = selectedModel.providerId;
    const orderedProviderIds = this.getOrderedProviderIds(selectedProviderId)
      .filter((providerId) => !excludeProviderIds.includes(providerId));

    const orderedModels = orderedProviderIds
      .map((providerId) => this.listModels().find((model) => model.providerId === providerId))
      .filter((model) => model && this.matchesRequirements(model.capabilities, requirements));

    if (selectedModel.providerId === 'offline') {
      return [...orderedModels, OFFLINE_MODEL];
    }

    const deduped = [];
    const seen = new Set();
    for (const model of [selectedModel, ...orderedModels, OFFLINE_MODEL]) {
      if (!seen.has(model.id) && this.matchesRequirements(model.capabilities, requirements)) {
        deduped.push(model);
        seen.add(model.id);
      }
    }
    return deduped;
  }

  async executeStream(payload, onEvent) {
    const messages = payload.messages || this.buildMessages(payload);
    const selections = await this.getProviderSelections(payload.modelId, messages, payload, {
      require: payload.require,
    });
    this.metrics.requests += 1;
    let lastError = null;
    let content = '';

    for (const selection of selections) {
      if (!selection.provider) {
        for await (const chunk of streamOfflineText(selection.offlineText)) {
          if (chunk.type === 'token') {
            content += chunk.text;
          }
          onEvent(chunk);
        }

        return {
          content,
          model: OFFLINE_MODEL,
          error: lastError,
        };
      }

      try {
        this.recordProviderUsage(selection.provider);

        for await (const chunk of selection.provider.stream({
          model: selection.model.model,
          messages,
          temperature: payload.temperature,
          maxTokens: payload.maxTokens,
        })) {
          if (chunk?.type === 'token' && chunk.text) {
            content += chunk.text;
          }
          if (chunk) {
            onEvent(chunk);
          }
        }

        this.clearProviderFailure(selection.provider);
        return {
          content,
          model: selection.model,
          error: lastError,
        };
      } catch (error) {
        lastError = error;
        content = '';
        this.recordProviderFailure(selection.provider);
      }
    }

    this.metrics.failures += 1;
    const offlineText = this.buildOfflineDraft(payload, messages);
    for await (const chunk of streamOfflineText(offlineText)) {
      if (chunk.type === 'token') {
        content += chunk.text;
      }
      onEvent(chunk);
    }
    return {
      content,
      model: OFFLINE_MODEL,
      error: lastError,
    };
  }

  isProviderCompatible(provider, model, requirements = {}) {
    return this.matchesRequirements(provider.capabilities(), requirements)
      && this.matchesRequirements(model.capabilities || {}, requirements);
  }

  matchesRequirements(capabilities = {}, requirements = {}) {
    return Object.keys(requirements).every((key) => !requirements[key] || Boolean(capabilities[key]));
  }

  getProviderFailureState(provider) {
    return this.providerFailures.get(provider.id) || { count: 0, openUntil: 0 };
  }

  isCircuitOpen(provider) {
    const state = this.getProviderFailureState(provider);
    return state.openUntil > Date.now();
  }

  recordProviderUsage(provider) {
    const name = provider.constructor.name;
    this.metrics.providerUsage[name] = (this.metrics.providerUsage[name] || 0) + 1;
  }

  clearProviderFailure(provider) {
    this.providerFailures.delete(provider.id);
  }

  recordProviderFailure(provider) {
    const state = this.getProviderFailureState(provider);
    const count = state.count + 1;
    const openUntil = count >= this.circuitBreakerThreshold
      ? Date.now() + this.circuitBreakerCooldownMs
      : 0;

    this.providerFailures.set(provider.id, { count, openUntil });
  }

  getOrderedProviderIds(preferredProviderId = null) {
    const baseOrder = this.providerPreference === 'cloud-first'
      ? ['groq', 'together', 'openrouter', 'lmstudio', 'ollama']
      : this.routingOrder;

    if (!preferredProviderId || preferredProviderId === 'offline') {
      return baseOrder.slice();
    }

    return [preferredProviderId, ...baseOrder.filter((providerId) => providerId !== preferredProviderId)];
  }

  buildOfflineDraft(payload = {}, messages = []) {
    const assignment = payload.assignment || { title: 'Untitled assignment' };
    const plan = payload.plan || [];
    const context = payload.context || {};
    const relevantChunks = context.relevantChunks || [];
    const userMessage = payload.userMessage || messages[messages.length - 1]?.content || 'Help with the assignment.';

    return [
      `Model: ${OFFLINE_MODEL.name}`,
      `Assignment: ${assignment.title}`,
      '',
      'Plan:',
      ...(plan.length ? plan.map((step, index) => `${index + 1}. ${step}`) : ['1. Review instructions and define the target output.']),
      '',
      `I reviewed the assignment instructions, rubric, and retrieved context for the request "${userMessage}".`,
      '',
      'Retrieved context summary:',
      relevantChunks.map((chunk) => `- ${chunk.chunkText}`).join('\n') || '- No uploaded source excerpts yet.',
      '',
      'Draft direction:',
      'Start with the strongest rubric-weighted section, keep each paragraph tied to the assignment question, and reserve a final pass for rubric compliance.',
    ].join('\n');
  }
}

function normalizeOptions(appOrConfig) {
  if (appOrConfig && typeof appOrConfig.getPath === 'function') {
    return {
      configPath: path.join(appOrConfig.getPath('userData'), 'model-router.json'),
      providerPreference: 'local-first',
      providers: {},
      circuitBreakerThreshold: undefined,
      circuitBreakerCooldownMs: undefined,
    };
  }

  const options = appOrConfig || {};
  return {
    configPath: Object.prototype.hasOwnProperty.call(options, 'configPath')
      ? options.configPath
      : path.join(process.cwd(), '.gradeguru', 'model-router.json'),
    providerPreference: options.providerPreference || 'local-first',
    routingOrder: options.routingOrder,
    providers: {
      lmstudio: options.lmstudio || (options.providers && options.providers.lmstudio) || {},
      ollama: options.ollama || (options.providers && options.providers.ollama) || {},
      groq: options.groq || (options.providers && options.providers.groq) || {},
      together: options.together || (options.providers && options.providers.together) || {},
      openrouter: options.openrouter || (options.providers && options.providers.openrouter) || {},
    },
    registry: options.registry || null,
    circuitBreakerThreshold: options.circuitBreakerThreshold,
    circuitBreakerCooldownMs: options.circuitBreakerCooldownMs,
  };
}

async function* streamOfflineText(text) {
  for (const piece of chunkText(text, 120)) {
    yield {
      type: 'token',
      text: piece,
    };
  }
  yield { type: 'end' };
}

function chunkText(text, size) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

module.exports = {
  ModelRouter,
};
