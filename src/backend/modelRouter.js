/**
 * OmniAI Desktop - Model Router
 * Handles routing requests to multiple AI providers with model discovery,
 * configuration management, and streaming response handling.
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Supported AI providers
 */
const PROVIDERS = {
  LM_STUDIO: 'lmstudio',
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  CUSTOM: 'custom'
};

/**
 * Default provider configurations
 */
const DEFAULT_CONFIGS = {
  [PROVIDERS.LM_STUDIO]: {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    timeout: 120000,
    streaming: true
  },
  [PROVIDERS.OLLAMA]: {
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    timeout: 120000,
    streaming: true
  },
  [PROVIDERS.OPENAI]: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    timeout: 60000,
    streaming: true
  },
  [PROVIDERS.CUSTOM]: {
    baseUrl: '',
    apiKey: '',
    timeout: 60000,
    streaming: true,
    headers: {}
  }
};

/**
 * Model Router class - Manages AI provider connections and request routing
 */
class ModelRouter extends EventEmitter {
  constructor() {
    super();
    this.providers = {};
    this.configs = {};
    this.activeProvider = null;
    this.activeModel = null;
    this.configDir = path.join(app.getPath('userData'), 'config');
    this.configFile = path.join(this.configDir, 'model-config.json');
    this.logger = this._initLogger();
    
    this._initialize();
  }

  /**
   * Initialize the model router
   * @private
   */
  _initialize() {
    this._ensureConfigDir();
    this._loadConfigs();
    this._registerProviders();
  }

  /**
   * Initialize logger
   * @private
   */
  _initLogger() {
    return {
      info: (...args) => console.log('[ModelRouter INFO]', new Date().toISOString(), ...args),
      warn: (...args) => console.warn('[ModelRouter WARN]', new Date().toISOString(), ...args),
      error: (...args) => console.error('[ModelRouter ERROR]', new Date().toISOString(), ...args),
      debug: (...args) => {
        if (process.env.DEBUG) console.log('[ModelRouter DEBUG]', new Date().toISOString(), ...args);
      }
    };
  }

  /**
   * Ensure config directory exists
   * @private
   */
  _ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      this.logger.info('Created config directory:', this.configDir);
    }
  }

  /**
   * Load provider configurations from file
   * @private
   */
  _loadConfigs() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        const savedConfigs = JSON.parse(data);
        
        // Merge with defaults
        for (const [provider, config] of Object.entries(savedConfigs)) {
          this.configs[provider] = { ...DEFAULT_CONFIGS[provider], ...config };
        }
        
        this.logger.info('Loaded provider configurations');
      } else {
        // Initialize with defaults
        this.configs = { ...DEFAULT_CONFIGS };
        this._saveConfigs();
        this.logger.info('Created default configurations');
      }
    } catch (error) {
      this.logger.error('Failed to load configurations:', error.message);
      this.configs = { ...DEFAULT_CONFIGS };
    }
  }

  /**
   * Save configurations to file
   * @private
   */
  _saveConfigs() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.configs, null, 2));
      this.logger.info('Saved provider configurations');
    } catch (error) {
      this.logger.error('Failed to save configurations:', error.message);
    }
  }

  /**
   * Register all providers
   * @private
   */
  _registerProviders() {
    this.providers[PROVIDERS.LM_STUDIO] = new LMStudioProvider();
    this.providers[PROVIDERS.OLLAMA] = new OllamaProvider();
    this.providers[PROVIDERS.OPENAI] = new OpenAIProvider();
    this.providers[PROVIDERS.CUSTOM] = new CustomProvider();
    
    this.logger.info('Registered providers:', Object.keys(this.providers));
  }

  /**
   * Get available providers
   * @returns {string[]} List of available provider names
   */
  getProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Get provider configuration
   * @param {string} provider - Provider name
   * @returns {Object} Provider configuration
   */
  getProviderConfig(provider) {
    return this.configs[provider] || DEFAULT_CONFIGS[provider];
  }

  /**
   * Update provider configuration
   * @param {string} provider - Provider name
   * @param {Object} config - New configuration
   */
  updateProviderConfig(provider, config) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    this.configs[provider] = { ...this.configs[provider], ...config };
    this._saveConfigs();
    this.logger.info(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Discover models from a specific provider
   * @param {string} provider - Provider name
   * @returns {Promise<Array>} List of available models
   */
  async discoverModels(provider) {
    const providerInstance = this.providers[provider];
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const config = this.configs[provider];
    if (!config || !config.baseUrl) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    try {
      this.logger.info(`Discovering models from ${provider}...`);
      const models = await providerInstance.discoverModels(config);
      this.logger.info(`Found ${models.length} models from ${provider}`);
      return models;
    } catch (error) {
      this.logger.error(`Failed to discover models from ${provider}:`, error.message);
      return [];
    }
  }

  /**
   * Discover models from all configured providers
   * @returns {Promise<Object>} Models grouped by provider
   */
  async discoverAllModels() {
    const results = {};
    
    for (const [provider, config] of Object.entries(this.configs)) {
      if (config.baseUrl) {
        results[provider] = await this.discoverModels(provider);
      }
    }
    
    return results;
  }

  /**
   * Set active provider and model
   * @param {string} provider - Provider name
   * @param {string} model - Model name
   */
  setActiveModel(provider, model) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    this.activeProvider = provider;
    this.activeModel = model;
    this.logger.info(`Active model set: ${model} @ ${provider}`);
    
    this.emit('modelChanged', { provider, model });
  }

  /**
   * Get active model info
   * @returns {Object} Active provider and model
   */
  getActiveModel() {
    return {
      provider: this.activeProvider,
      model: this.activeModel
    };
  }

  /**
   * Send a chat completion request
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response from AI
   */
  async chatCompletion(messages, options = {}) {
    if (!this.activeProvider || !this.activeModel) {
      throw new Error('No active model selected');
    }

    const provider = this.providers[this.activeProvider];
    const config = this.configs[this.activeProvider];
    
    const requestOptions = {
      model: this.activeModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? -1,
      stream: options.stream ?? false,
      ...options
    };

    try {
      this.logger.debug('Sending chat completion request:', {
        provider: this.activeProvider,
        model: this.activeModel,
        messageCount: messages.length
      });

      if (requestOptions.stream) {
        return this._handleStreamingResponse(provider, config, requestOptions);
      } else {
        return await provider.chatCompletion(config, requestOptions);
      }
    } catch (error) {
      this.logger.error('Chat completion failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle streaming responses
   * @private
   */
  async _handleStreamingResponse(provider, config, requestOptions) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      provider.streamChatCompletion(config, requestOptions)
        .on('data', (chunk) => {
          chunks.push(chunk);
          this.emit('streamChunk', chunk);
        })
        .on('error', (error) => {
          this.logger.error('Stream error:', error.message);
          reject(error);
        })
        .on('end', () => {
          const fullResponse = chunks.join('');
          try {
            const parsed = JSON.parse(fullResponse);
            resolve(parsed);
          } catch {
            resolve({ content: fullResponse });
          }
        });
    });
  }

  /**
   * Test provider connection
   * @param {string} provider - Provider name
   * @returns {Promise<Object>} Test result
   */
  async testConnection(provider) {
    const providerInstance = this.providers[provider];
    const config = this.configs[provider];
    
    if (!providerInstance || !config) {
      return { success: false, error: 'Provider not found or not configured' };
    }

    try {
      const models = await providerInstance.discoverModels(config);
      return { 
        success: true, 
        message: `Connection successful. Found ${models.length} models.` 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get model info from a specific provider
   * @param {string} provider - Provider name
   * @param {string} modelId - Model identifier
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo(provider, modelId) {
    const models = await this.discoverModels(provider);
    return models.find(m => m.id === modelId || m.name === modelId) || null;
  }

  /**
   * Export current configuration
   * @returns {Object} Current configuration
   */
  exportConfig() {
    return JSON.parse(JSON.stringify(this.configs));
  }

  /**
   * Import configuration
   * @param {Object} config - Configuration to import
   */
  importConfig(config) {
    for (const [provider, providerConfig] of Object.entries(config)) {
      if (this.providers[provider]) {
        this.configs[provider] = { ...DEFAULT_CONFIGS[provider], ...providerConfig };
      }
    }
    this._saveConfigs();
    this.logger.info('Configuration imported');
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.removeAllListeners();
    this.logger.info('Model router destroyed');
  }
}

/**
 * Base provider class
 */
class BaseProvider {
  async discoverModels(config) {
    throw new Error('Not implemented');
  }

  async chatCompletion(config, options) {
    throw new Error('Not implemented');
  }

  streamChatCompletion(config, options) {
    throw new Error('Not implemented');
  }

  /**
   * Make HTTP request
   * @protected
   */
  _makeRequest(config, endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, config.baseUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
          ...config.headers
        },
        timeout: config.timeout || 60000
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Request timeout')));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}

/**
 * LM Studio provider implementation
 */
class LMStudioProvider extends BaseProvider {
  async discoverModels(config) {
    try {
      const response = await this._makeRequest(config, '/models');
      if (response.data) {
        return response.data.map(model => ({
          id: model.id,
          name: model.id,
          provider: PROVIDERS.LM_STUDIO,
          contextLength: model.context_length || 4096,
          description: model.description || ''
        }));
      }
      return [];
    } catch (error) {
      // Fallback: try Ollama-compatible endpoint
      try {
        const response = await this._makeRequest(config, '/api/tags');
        if (response.models) {
          return response.models.map(model => ({
            id: model.name,
            name: model.name,
            provider: PROVIDERS.LM_STUDIO,
            contextLength: model.context_length || 4096,
            description: model.details?.description || ''
          }));
        }
      } catch {}
      throw error;
    }
  }

  async chatCompletion(config, options) {
    const response = await this._makeRequest(config, '/chat/completions', 'POST', {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: false
    });
    
    return {
      content: response.choices?.[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
    };
  }

  streamChatCompletion(config, options) {
    const emitter = new EventEmitter();
    
    (async () => {
      try {
        const response = await this._makeRequest(config, '/chat/completions', 'POST', {
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: true
        });
        
        emitter.emit('end');
      } catch (error) {
        emitter.emit('error', error);
      }
    })();
    
    return emitter;
  }
}

/**
 * Ollama provider implementation
 */
class OllamaProvider extends BaseProvider {
  async discoverModels(config) {
    const response = await this._makeRequest(config, '/api/tags');
    
    return response.models.map(model => ({
      id: model.name,
      name: model.name,
      provider: PROVIDERS.OLLAMA,
      contextLength: model.context_length || 4096,
      description: model.details?.description || ''
    }));
  }

  async chatCompletion(config, options) {
    const response = await this._makeRequest(config, '/api/chat', 'POST', {
      model: options.model,
      messages: options.messages,
      stream: false
    });
    
    return {
      content: response.message?.content || '',
      model: response.model
    };
  }

  streamChatCompletion(config, options) {
    const emitter = new EventEmitter();
    
    (async () => {
      try {
        const response = await this._makeRequest(config, '/api/chat', 'POST', {
          model: options.model,
          messages: options.messages,
          stream: true
        });
        
        emitter.emit('end');
      } catch (error) {
        emitter.emit('error', error);
      }
    })();
    
    return emitter;
  }
}

/**
 * OpenAI provider implementation
 */
class OpenAIProvider extends BaseProvider {
  async discoverModels(config) {
    const response = await this._makeRequest(config, '/models');
    
    return response.data.map(model => ({
      id: model.id,
      name: model.id,
      provider: PROVIDERS.OPENAI,
      contextLength: model.context_window || 4096,
      description: model.description || ''
    })).filter(m => !m.id.startsWith('gpt-'));
  }

  async chatCompletion(config, options) {
    const response = await this._makeRequest(config, '/chat/completions', 'POST', {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: false
    });
    
    return {
      content: response.choices?.[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
    };
  }

  streamChatCompletion(config, options) {
    const emitter = new EventEmitter();
    
    (async () => {
      try {
        const response = await this._makeRequest(config, '/chat/completions', 'POST', {
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: true
        });
        
        emitter.emit('end');
      } catch (error) {
        emitter.emit('error', error);
      }
    })();
    
    return emitter;
  }
}

/**
 * Custom API provider implementation
 */
class CustomProvider extends BaseProvider {
  async discoverModels(config) {
    // Custom providers may not have standard model discovery
    // Return empty or configured models
    return config.models || [];
  }

  async chatCompletion(config, options) {
    const endpoint = config.endpoint || '/chat';
    const response = await this._makeRequest(config, endpoint, 'POST', {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens
    });
    
    return {
      content: response.content || response.choices?.[0]?.message?.content || '',
      model: options.model
    };
  }

  streamChatCompletion(config, options) {
    const emitter = new EventEmitter();
    emitter.emit('end');
    return emitter;
  }
}

// Export singleton instance
module.exports = new ModelRouter();
module.exports.ModelRouter = ModelRouter;
module.exports.PROVIDERS = PROVIDERS;
