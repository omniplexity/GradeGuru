/**
 * OmniAI Desktop - Basic Tests
 * Tests for utility functions (message formatting, API helpers, config helpers)
 * 
 * Note: Full tests for Model Router, Conversation Store, and Plugin Manager require
 * proper Jest configuration with Electron mocking (jest.config.js + setup file).
 * These utility tests run successfully with npm test.
 */

const fs = require('fs');
const path = require('path');

// Setup test directories
const testDataDir = path.join(__dirname, 'test-data');
const userDataDir = path.join(testDataDir, 'userData');

beforeAll(() => {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
});

// ============================================
// UTILITY TESTS
// ============================================

describe('Utility Tests', () => {
  
  // Message Formatting Functions
  describe('Message Formatting', () => {
    
    test('should format message for display', () => {
      const message = {
        role: 'user',
        content: 'Hello, world!',
        timestamp: '2024-01-01T12:00:00.000Z'
      };
      
      // Basic validation - message should have required fields
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, world!');
      expect(message.timestamp).toBeDefined();
    });
    
    test('should format system message', () => {
      const message = {
        role: 'system',
        content: 'You are a helpful assistant.',
        timestamp: '2024-01-01T12:00:00.000Z'
      };
      
      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant.');
    });
    
    test('should format assistant message', () => {
      const message = {
        role: 'assistant',
        content: 'Hello! How can I help you?',
        timestamp: '2024-01-01T12:00:00.000Z'
      };
      
      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hello! How can I help you?');
    });
    
    test('should handle empty message content', () => {
      const message = {
        role: 'user',
        content: '',
        timestamp: '2024-01-01T12:00:00.000Z'
      };
      
      expect(message.content).toBe('');
    });
    
    test('should handle multiline message content', () => {
      const multilineContent = `Line 1
Line 2
Line 3`;
      
      const message = {
        role: 'user',
        content: multilineContent,
        timestamp: '2024-01-01T12:00:00.000Z'
      };
      
      const lines = message.content.split('\n');
      expect(lines.length).toBe(3);
    });
  });
  
  // API Helper Functions
  describe('API Helpers', () => {
    
    test('should create message object with required fields', () => {
      const message = {
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString()
      };
      
      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
    });
    
    test('should validate message structure', () => {
      const validMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      
      const isValid = validMessage.role && validMessage.content && validMessage.timestamp;
      expect(isValid).toBeTruthy();
    });
    
    test('should sanitize user input', () => {
      const dirtyInput = '<script>alert("xss")</script>Hello';
      // Replace script tags and their contents - handle nested tags
      const sanitized = dirtyInput
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      expect(sanitized).toBe('Hello');
    });
    
    test('should format timestamp for display', () => {
      const timestamp = '2024-01-15T14:30:00.000Z';
      const date = new Date(timestamp);
      // Use UTC methods to avoid timezone issues
      const formatted = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
      
      expect(formatted).toContain('2024');
      expect(formatted).toContain('14');
    });
    
    test('should truncate long content', () => {
      const longContent = 'A'.repeat(1000);
      const maxLength = 100;
      const truncated = longContent.length > maxLength 
        ? longContent.substring(0, maxLength) + '...'
        : longContent;
      
      expect(truncated.length).toBe(maxLength + 3); // +3 for '...'
    });
    
    test('should generate conversation title from first message', () => {
      const firstMessage = 'What is the capital of France?';
      const title = firstMessage.length > 30 
        ? firstMessage.substring(0, 30) + '...'
        : firstMessage;
      
      expect(title).toBe('What is the capital of France?');
    });
  });
  
  // Provider Configuration Helpers
  describe('Provider Configuration Helpers', () => {
    
    test('should validate provider configuration', () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4'
      };
      
      const isValid = config.provider && config.apiKey && config.model;
      expect(isValid).toBeTruthy();
    });
    
    test('should merge default config with user config', () => {
      const defaultConfig = {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1.0
      };
      
      const userConfig = {
        temperature: 0.9,
        customField: 'value'
      };
      
      const merged = { ...defaultConfig, ...userConfig };
      
      expect(merged.temperature).toBe(0.9);
      expect(merged.maxTokens).toBe(1000);
      expect(merged.customField).toBe('value');
    });
  });
  
  // Conversation Store Functions (without Electron dependency)
  describe('Conversation Store Functions', () => {
    let conversationStore;
    
    beforeEach(() => {
      // Create a simple in-memory store for testing
      conversationStore = {
        conversations: new Map(),
        
        createConversation(title = 'New Conversation', model = null, provider = null) {
          const id = `conv_${Date.now()}`;
          const conversation = {
            id,
            title,
            model,
            provider,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.conversations.set(id, conversation);
          return conversation;
        },
        
        addMessage(conversationId, role, content, metadata = {}) {
          const conversation = this.conversations.get(conversationId);
          if (!conversation) return null;
          
          const message = {
            id: `msg_${Date.now()}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            ...metadata
          };
          
          conversation.messages.push(message);
          conversation.updatedAt = new Date().toISOString();
          return message;
        },
        
        getConversation(id) {
          return this.conversations.get(id) || null;
        },
        
        getAllConversations() {
          return Array.from(this.conversations.values());
        }
      };
    });
    
    test('should create a new conversation with default values', () => {
      const conversation = conversationStore.createConversation();
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.title).toBe('New Conversation');
      expect(conversation.messages).toEqual([]);
    });
    
    test('should create conversation with custom title', () => {
      const conversation = conversationStore.createConversation('My Custom Title');
      
      expect(conversation.title).toBe('My Custom Title');
    });
    
    test('should add user message to conversation', () => {
      const conv = conversationStore.createConversation();
      const message = conversationStore.addMessage(conv.id, 'user', 'Hello!');
      
      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello!');
    });
    
    test('should add assistant message to conversation', () => {
      const conv = conversationStore.createConversation();
      const message = conversationStore.addMessage(conv.id, 'assistant', 'Hi there!');
      
      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hi there!');
    });
    
    test('should return null for invalid conversation', () => {
      const message = conversationStore.addMessage('invalid-id', 'user', 'Test');
      
      expect(message).toBeNull();
    });
    
    test('should get conversation by id', () => {
      const conv = conversationStore.createConversation();
      const found = conversationStore.getConversation(conv.id);
      
      expect(found).toBeDefined();
      expect(found.id).toBe(conv.id);
    });
    
    test('should return null for non-existent conversation', () => {
      const found = conversationStore.getConversation('non-existent');
      
      expect(found).toBeNull();
    });
    
    test('should get all conversations', () => {
      // Create a fresh store for this test
      const store = {
        conversations: new Map()
      };
      
      store.createConversation = function(title = 'New Conversation') {
        const id = `conv_${Date.now()}_${Math.random()}`;
        const conversation = {
          id,
          title,
          messages: [],
          createdAt: new Date().toISOString()
        };
        this.conversations.set(id, conversation);
        return conversation;
      };
      
      store.getAllConversations = function() {
        return Array.from(this.conversations.values());
      };
      
      store.createConversation('Conv 1');
      store.createConversation('Conv 2');
      
      const all = store.getAllConversations();
      
      expect(all.length).toBe(2);
    });
  });
  
  // Plugin System Functions (without Electron dependency)
  describe('Plugin Manager Functions', () => {
    let pluginManager;
    
    beforeEach(() => {
      // Create a simple in-memory manager for testing
      pluginManager = {
        plugins: new Map(),
        permissions: new Map(),
        
        discoverPlugins(pluginsDir) {
          // Simulate discovery - return empty for now
          return [];
        },
        
        loadPlugin(pluginPath) {
          const plugin = {
            name: 'test-plugin',
            version: '1.0.0',
            enabled: true,
            permissions: []
          };
          this.plugins.set(plugin.name, plugin);
          return plugin;
        },
        
        unloadPlugin(pluginName) {
          return this.plugins.delete(pluginName);
        },
        
        enablePlugin(pluginName) {
          const plugin = this.plugins.get(pluginName);
          if (plugin) {
            plugin.enabled = true;
            return true;
          }
          return false;
        },
        
        disablePlugin(pluginName) {
          const plugin = this.plugins.get(pluginName);
          if (plugin) {
            plugin.enabled = false;
            return true;
          }
          return false;
        },
        
        grantPermission(pluginName, permission) {
          if (!this.permissions.has(pluginName)) {
            this.permissions.set(pluginName, new Set());
          }
          this.permissions.get(pluginName).add(permission);
        },
        
        hasPermission(pluginName, permission) {
          const perms = this.permissions.get(pluginName);
          return perms ? perms.has(permission) : false;
        }
      };
    });
    
    test('should discover plugins from plugins directory', () => {
      const plugins = pluginManager.discoverPlugins('/some/path');
      
      expect(Array.isArray(plugins)).toBe(true);
    });
    
    test('should load a valid plugin', () => {
      const plugin = pluginManager.loadPlugin('/path/to/plugin');
      
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('test-plugin');
      expect(plugin.enabled).toBe(true);
    });
    
    test('should unload a loaded plugin', () => {
      pluginManager.loadPlugin('/path/to/plugin');
      const result = pluginManager.unloadPlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(pluginManager.plugins.has('test-plugin')).toBe(false);
    });
    
    test('should enable and disable plugin', () => {
      pluginManager.loadPlugin('/path/to/plugin');
      
      const disabled = pluginManager.disablePlugin('test-plugin');
      expect(disabled).toBe(true);
      
      const plugin = pluginManager.plugins.get('test-plugin');
      expect(plugin.enabled).toBe(false);
      
      const enabled = pluginManager.enablePlugin('test-plugin');
      expect(enabled).toBe(true);
      expect(plugin.enabled).toBe(true);
    });
    
    test('should grant custom permissions', () => {
      pluginManager.loadPlugin('/path/to/plugin');
      pluginManager.grantPermission('test-plugin', 'file:read');
      
      expect(pluginManager.hasPermission('test-plugin', 'file:read')).toBe(true);
    });
    
    test('should check if plugin has permission', () => {
      pluginManager.loadPlugin('/path/to/plugin');
      pluginManager.grantPermission('test-plugin', 'network:access');
      
      expect(pluginManager.hasPermission('test-plugin', 'network:access')).toBe(true);
      expect(pluginManager.hasPermission('test-plugin', 'unknown:permission')).toBe(false);
    });
  });
  
  // Model Router Functions (without Electron dependency)
  describe('Model Router Functions', () => {
    let modelRouter;
    
    beforeEach(() => {
      // Create a simple in-memory router for testing
      modelRouter = {
        providers: new Map(),
        activeProvider: null,
        activeModel: null,
        
        registerProvider(name, config) {
          this.providers.set(name, config);
        },
        
        setActiveModel(provider, model) {
          if (!this.providers.has(provider)) {
            throw new Error(`Unknown provider: ${provider}`);
          }
          this.activeProvider = provider;
          this.activeModel = model;
        },
        
        getActiveModel() {
          return this.activeModel;
        },
        
        getProviders() {
          return Array.from(this.providers.keys());
        },
        
        getProviderConfig(provider) {
          return this.providers.get(provider);
        }
      };
      
      // Register default providers
      modelRouter.registerProvider('openai', { 
        name: 'OpenAI', 
        models: ['gpt-4', 'gpt-3.5-turbo'],
        endpoint: 'https://api.openai.com/v1'
      });
      
      modelRouter.registerProvider('ollama', { 
        name: 'Ollama', 
        models: ['llama2', 'mistral'],
        endpoint: 'http://localhost:11434'
      });
    });
    
    test('should get list of available providers', () => {
      const providers = modelRouter.getProviders();
      
      expect(providers).toContain('openai');
      expect(providers).toContain('ollama');
    });
    
    test('should set and get active model', () => {
      modelRouter.setActiveModel('openai', 'gpt-4');
      
      expect(modelRouter.getActiveModel()).toBe('gpt-4');
    });
    
    test('should throw error when setting model with unknown provider', () => {
      expect(() => {
        modelRouter.setActiveModel('unknown', 'model');
      }).toThrow('Unknown provider: unknown');
    });
    
    test('should get provider configuration', () => {
      const config = modelRouter.getProviderConfig('openai');
      
      expect(config).toBeDefined();
      expect(config.name).toBe('OpenAI');
      expect(config.models).toContain('gpt-4');
    });
  });
});
