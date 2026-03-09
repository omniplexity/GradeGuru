const LMStudioProvider = require('./providers/LMStudioProvider');
const OllamaProvider = require('./providers/OllamaProvider');
const GroqProvider = require('./providers/GroqProvider');
const TogetherProvider = require('./providers/TogetherProvider');
const OpenRouterProvider = require('./providers/OpenRouterProvider');

class ProviderRegistry {
  constructor(config = {}) {
    this.providers = [
      new LMStudioProvider(config.lmstudio || {}),
      new OllamaProvider(config.ollama || {}),
      new GroqProvider(config.groq || {}),
      new TogetherProvider(config.together || {}),
      new OpenRouterProvider(config.openrouter || {}),
    ];
    this.healthCache = new Map();
    this.ttl = Number.isFinite(config.healthCacheTtl) ? config.healthCacheTtl : 10000;
  }

  getProviderById(id) {
    return this.providers.find((provider) => provider.id === id) || null;
  }

  invalidateHealth(providerId = null) {
    if (!providerId) {
      this.healthCache.clear();
      return;
    }

    for (const provider of this.providers) {
      if (provider.id === providerId || provider.constructor.name === providerId) {
        this.healthCache.delete(provider.id);
        this.healthCache.delete(provider.constructor.name);
      }
    }
  }

  async checkHealth(provider) {
    const now = Date.now();
    const cacheKeys = [provider.id, provider.constructor.name];

    for (const key of cacheKeys) {
      const cached = this.healthCache.get(key);
      if (cached && now - cached.time < this.ttl) {
        return cached.status;
      }
    }

    let status = false;

    try {
      status = await provider.isAvailable();
    } catch {
      status = false;
    }

    const entry = { status, time: now };

    for (const key of cacheKeys) {
      this.healthCache.set(key, entry);
    }

    return status;
  }

  async getAvailableProviders() {
    const results = [];

    for (const provider of this.providers) {
      if (await this.checkHealth(provider)) {
        results.push(provider);
      }
    }

    return results.sort((left, right) => left.priority - right.priority);
  }
}

module.exports = ProviderRegistry;
