class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.id = config.id || 'base';
    this.name = config.name || 'Base Provider';
    this.defaultModel = config.defaultModel || null;
    this.priority = Number.isFinite(config.priority) ? config.priority : 999;
  }

  async isAvailable() {
    return false;
  }

  capabilities() {
    return {
      streaming: false,
      vision: false,
      tools: false,
    };
  }

  async listModels() {
    return [];
  }

  detectCapabilities(modelId = '') {
    const normalized = String(modelId).toLowerCase();
    return {
      streaming: true,
      chat: true,
      vision: /(vision|vl|multimodal|gemma-3)/.test(normalized),
      reasoning: /(reason|r1|o1|o3|deepseek)/.test(normalized),
    };
  }

  resolveModel(model) {
    return model || this.config.model || this.defaultModel;
  }

  async generate({ model, messages, stream = false }) {
    throw new Error(`${this.name} provider does not implement generate()`);
  }

  async *stream({ model, messages }) {
    const response = await this.generate({ model, messages, stream: false });
    if (response) {
      yield {
        type: 'token',
        text: response,
      };
    }
    yield { type: 'end' };
  }

  async requestJson(url, init = {}) {
    const response = await fetch(url, init);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${this.name} request failed (${response.status}): ${text || response.statusText}`);
    }
    return response.json();
  }
}

module.exports = BaseProvider;
