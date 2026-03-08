/**
 * OmniAI Desktop - Plugin Manager
 * Handles plugin discovery, loading, lifecycle management,
 * API exposure, event handling, and permissions.
 */

const { app, ipcMain, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Permission types
 */
const PERMISSIONS = {
  FILE_SYSTEM: 'fileSystem',
  NETWORK: 'network',
  SHELL: 'shell',
  IPC: 'ipc',
  CONVERSATION: 'conversation',
  MODEL: 'model',
  UI: 'ui',
  SETTINGS: 'settings'
};

/**
 * Default plugin permissions
 */
const DEFAULT_PERMISSIONS = [
  PERMISSIONS.CONVERSATION,
  PERMISSIONS.UI
];

/**
 * Plugin Manager class - Manages plugin lifecycle and API exposure
 */
class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
    this.pluginAPIs = new Map();
    this.pluginsDir = path.join(app.getPath('userData'), 'plugins');
    this.manifestFile = path.join(this.pluginsDir, 'manifest.json');
    this.logger = this._initLogger();
    this.permissionManager = new PermissionManager();
    this.eventBus = new EventEmitter();
    
    this._initialize();
  }

  /**
   * Initialize the plugin manager
   * @private
   */
  _initialize() {
    this._ensurePluginsDir();
    this._registerBuiltInAPIs();
    this._setupIPC();
    this.logger.info('Plugin manager initialized');
  }

  /**
   * Initialize logger
   * @private
   */
  _initLogger() {
    return {
      info: (...args) => console.log('[PluginManager INFO]', new Date().toISOString(), ...args),
      warn: (...args) => console.warn('[PluginManager WARN]', new Date().toISOString(), ...args),
      error: (...args) => console.error('[PluginManager ERROR]', new Date().toISOString(), ...args),
      debug: (...args) => {
        if (process.env.DEBUG) console.log('[PluginManager DEBUG]', new Date().toISOString(), ...args);
      }
    };
  }

  /**
   * Ensure plugins directory exists
   * @private
   */
  _ensurePluginsDir() {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
      this.logger.info('Created plugins directory:', this.pluginsDir);
    }
  }

  /**
   * Register built-in APIs available to all plugins
   * @private
   */
  _registerBuiltInAPIs() {
    this.pluginAPIs.set('console', {
      log: (...args) => console.log('[Plugin]', ...args),
      warn: (...args) => console.warn('[Plugin]', ...args),
      error: (...args) => console.error('[Plugin]', ...args)
    });

    this.pluginAPIs.set('eventBus', {
      on: (event, callback) => this.eventBus.on(event, callback),
      off: (event, callback) => this.eventBus.off(event, callback),
      emit: (event, data) => this.eventBus.emit(event, data)
    });
  }

  /**
   * Setup IPC handlers for plugin communication
   * @private
   */
  _setupIPC() {
    ipcMain.handle('plugin:invoke', async (event, pluginId, method, ...args) => {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.enabled) {
        throw new Error(`Plugin not found or disabled: ${pluginId}`);
      }
      
      if (!this.permissionManager.hasPermission(pluginId, PERMISSIONS.IPC)) {
        throw new Error(`Plugin ${pluginId} does not have IPC permission`);
      }

      const api = plugin.instance?.[method];
      if (typeof api === 'function') {
        return await api(...args);
      }
      throw new Error(`Method not found: ${method}`);
    });

    ipcMain.handle('plugin:list', () => {
      return this.getPluginList();
    });

    ipcMain.handle('plugin:load', async (event, pluginPath) => {
      return await this.loadPlugin(pluginPath);
    });

    ipcMain.handle('plugin:unload', async (event, pluginId) => {
      return await this.unloadPlugin(pluginId);
    });

    ipcMain.handle('plugin:enable', async (event, pluginId) => {
      return await this.enablePlugin(pluginId);
    });

    ipcMain.handle('plugin:disable', async (event, pluginId) => {
      return await this.disablePlugin(pluginId);
    });
  }

  /**
   * Discover available plugins
   * @returns {Promise<Array>} List of discovered plugins
   */
  async discoverPlugins() {
    const discovered = [];
    
    try {
      const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const pluginPath = path.join(this.pluginsDir, entry.name);
        const manifestPath = path.join(pluginPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            discovered.push({
              id: manifest.id || entry.name,
              name: manifest.name || entry.name,
              version: manifest.version || '0.0.0',
              description: manifest.description || '',
              author: manifest.author || 'Unknown',
              path: pluginPath,
              enabled: this.plugins.has(manifest.id || entry.name)
            });
          } catch (error) {
            this.logger.warn(`Failed to parse manifest in ${entry.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to discover plugins:', error.message);
    }

    return discovered;
  }

  /**
   * Load a plugin from path
   * @param {string} pluginPath - Path to plugin directory
   * @returns {Object} Loaded plugin info
   */
  async loadPlugin(pluginPath) {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Plugin manifest not found');
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Validate manifest
      if (!manifest.id || !manifest.main) {
        throw new Error('Invalid plugin manifest: missing id or main');
      }

      // Check if plugin already loaded
      if (this.plugins.has(manifest.id)) {
        this.logger.warn(`Plugin already loaded: ${manifest.id}`);
        return this.plugins.get(manifest.id);
      }

      // Load plugin main file
      const mainPath = path.join(pluginPath, manifest.main);
      if (!fs.existsSync(mainPath)) {
        throw new Error(`Plugin main file not found: ${manifest.main}`);
      }

      // Create plugin context
      const context = this._createPluginContext(manifest);
      
      // Load the plugin
      const PluginClass = require(mainPath);
      const pluginInstance = new PluginClass(context);
      
      // Initialize plugin
      if (typeof pluginInstance.initialize === 'function') {
        await pluginInstance.initialize();
      }

      // Store plugin
      const plugin = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        path: pluginPath,
        manifest,
        instance: pluginInstance,
        enabled: true,
        loadedAt: new Date().toISOString(),
        permissions: manifest.permissions || DEFAULT_PERMISSIONS
      };

      this.plugins.set(manifest.id, plugin);
      
      // Grant permissions
      this.permissionManager.grantPermissions(manifest.id, plugin.permissions);
      
      // Add menu items if defined
      if (manifest.menuItems) {
        this._addPluginMenuItems(manifest.id, manifest.menuItems);
      }

      this.logger.info(`Loaded plugin: ${manifest.id}`);
      this.emit('pluginLoaded', plugin);
      
      return plugin;
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Create plugin context with exposed APIs
   * @private
   */
  _createPluginContext(manifest) {
    const context = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      path: manifest.path,
      
      // APIs
      api: {
        conversation: this._getConversationAPI(manifest.id),
        model: this._getModelAPI(manifest.id),
        ui: this._getUIAPI(manifest.id),
        settings: this._getSettingsAPI(manifest.id),
        fs: this.permissionManager.hasPermission(manifest.id, PERMISSIONS.FILE_SYSTEM) 
          ? this._getFileSystemAPI(manifest.id) 
          : null,
        network: this.permissionManager.hasPermission(manifest.id, PERMISSIONS.NETWORK)
          ? this._getNetworkAPI(manifest.id)
          : null,
        shell: this.permissionManager.hasPermission(manifest.id, PERMISSIONS.SHELL)
          ? this._getShellAPI(manifest.id)
          : null
      },

      // Event emitter
      events: {
        on: (event, callback) => this.eventBus.on(`${manifest.id}:${event}`, callback),
        off: (event, callback) => this.eventBus.off(`${manifest.id}:${event}`, callback),
        emit: (event, data) => this.eventBus.emit(`${manifest.id}:${event}`, data)
      },

      // Logger
      logger: {
        info: (...args) => this.logger.info(`[${manifest.id}]`, ...args),
        warn: (...args) => this.logger.warn(`[${manifest.id}]`, ...args),
        error: (...args) => this.logger.error(`[${manifest.id}]`, ...args),
        debug: (...args) => this.logger.debug(`[${manifest.id}]`, ...args)
      }
    };

    return context;
  }

  /**
   * Get conversation API for plugin
   * @private
   */
  _getConversationAPI(pluginId) {
    if (!this.permissionManager.hasPermission(pluginId, PERMISSIONS.CONVERSATION)) {
      return null;
    }

    const conversationStore = require('./conversationStore');
    
    return {
      getAll: () => conversationStore.getAllConversations(),
      get: (id) => conversationStore.getConversation(id),
      create: (options) => conversationStore.createConversation(options),
      update: (id, updates) => conversationStore.updateConversation(id, updates),
      delete: (id) => conversationStore.deleteConversation(id),
      addMessage: (conversationId, message) => 
        conversationStore.addMessage(conversationId, message),
      getMessages: (conversationId) => conversationStore.getMessages(conversationId),
      search: (query) => conversationStore.searchConversations(query),
      export: (id, format) => conversationStore.exportConversation(id, format)
    };
  }

  /**
   * Get model API for plugin
   * @private
   */
  _getModelAPI(pluginId) {
    if (!this.permissionManager.hasPermission(pluginId, PERMISSIONS.MODEL)) {
      return null;
    }

    const modelRouter = require('./modelRouter');
    
    return {
      getProviders: () => modelRouter.getProviders(),
      getProviderConfig: (provider) => modelRouter.getProviderConfig(provider),
      discoverModels: (provider) => modelRouter.discoverModels(provider),
      discoverAllModels: () => modelRouter.discoverAllModels(),
      setActiveModel: (provider, model) => modelRouter.setActiveModel(provider, model),
      getActiveModel: () => modelRouter.getActiveModel(),
      chatCompletion: (messages, options) => modelRouter.chatCompletion(messages, options),
      testConnection: (provider) => modelRouter.testConnection(provider)
    };
  }

  /**
   * Get UI API for plugin
   * @private
   */
  _getUIAPI(pluginId) {
    if (!this.permissionManager.hasPermission(pluginId, PERMISSIONS.UI)) {
      return null;
    }

    return {
      showNotification: (title, body) => {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
          new Notification({ title, body }).show();
        }
      },
      showDialog: (options) => dialog.showDialog(options),
      showMessageBox: (options) => dialog.showMessageBox(options),
      openFile: (options) => dialog.showOpenDialog(options),
      saveFile: (options) => dialog.showSaveDialog(options)
    };
  }

  /**
   * Get settings API for plugin
   * @private
   */
  _getSettingsAPI(pluginId) {
    if (!this.permissionManager.hasPermission(pluginId, PERMISSIONS.SETTINGS)) {
      return null;
    }

    const settingsFile = path.join(app.getPath('userData'), 'plugins', pluginId, 'settings.json');
    
    return {
      get: (key, defaultValue) => {
        try {
          if (fs.existsSync(settingsFile)) {
            const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            return key ? settings[key] : settings;
          }
        } catch {}
        return defaultValue;
      },
      set: (key, value) => {
        let settings = {};
        try {
          if (fs.existsSync(settingsFile)) {
            settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
          }
        } catch {}
        
        settings[key] = value;
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
      }
    };
  }

  /**
   * Get filesystem API for plugin
   * @private
   */
  _getFileSystemAPI(pluginId) {
    return {
      readFile: (filePath, options) => fs.readFileSync(filePath, options),
      writeFile: (filePath, data, options) => fs.writeFileSync(filePath, data, options),
      exists: (filePath) => fs.existsSync(filePath),
      readDir: (dirPath) => fs.readdirSync(dirPath),
      createDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
      delete: (filePath) => fs.unlinkSync(filePath),
      stat: (filePath) => fs.statSync(filePath)
    };
  }

  /**
   * Get network API for plugin
   * @private
   */
  _getNetworkAPI(pluginId) {
    const https = require('https');
    const http = require('http');
    
    return {
      fetch: (url, options = {}) => {
        return new Promise((resolve, reject) => {
          const protocol = url.startsWith('https') ? https : http;
          const urlObj = new URL(url);
          
          const req = protocol.request({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          });
          
          req.on('error', reject);
          if (options.body) req.write(options.body);
          req.end();
        });
      }
    };
  }

  /**
   * Get shell API for plugin
   * @private
   */
  _getShellAPI(pluginId) {
    const { shell } = require('electron');
    
    return {
      openExternal: (url) => shell.openExternal(url),
      openPath: (path) => shell.openPath(path),
      showItemInFolder: (path) => shell.showItemInFolder(path)
    };
  }

  /**
   * Add plugin menu items
   * @private
   */
  _addPluginMenuItems(pluginId, menuItems) {
    // Implementation would add menu items to the application menu
    this.logger.debug(`Added menu items for plugin: ${pluginId}`);
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} Success
   */
  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.logger.warn(`Plugin not found: ${pluginId}`);
      return false;
    }

    try {
      // Call cleanup if exists
      if (typeof plugin.instance?.cleanup === 'function') {
        await plugin.instance.cleanup();
      }

      // Remove event listeners
      this.eventBus.removeAllListeners(`${pluginId}:`);

      // Remove menu items
      // (would implement menu removal here)

      this.plugins.delete(pluginId);
      this.permissionManager.revokeAllPermissions(pluginId);

      this.logger.info(`Unloaded plugin: ${pluginId}`);
      this.emit('pluginUnloaded', { id: pluginId });
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unload plugin ${pluginId}:`, error.message);
      return false;
    }
  }

  /**
   * Enable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} Success
   */
  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return await this.loadPlugin(plugin.path);
    }

    plugin.enabled = true;
    this.logger.info(`Enabled plugin: ${pluginId}`);
    this.emit('pluginEnabled', plugin);
    
    return true;
  }

  /**
   * Disable a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} Success
   */
  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    plugin.enabled = false;
    this.logger.info(`Disabled plugin: ${pluginId}`);
    this.emit('pluginDisabled', { id: pluginId });
    
    return true;
  }

  /**
   * Get list of loaded plugins
   * @returns {Array} Plugin list
   */
  getPluginList() {
    const list = [];
    
    for (const [id, plugin] of this.plugins) {
      list.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        enabled: plugin.enabled,
        loadedAt: plugin.loadedAt,
        permissions: plugin.permissions
      });
    }
    
    return list;
  }

  /**
   * Install plugin from archive
   * @param {string} archivePath - Path to plugin archive
   * @returns {Object} Installed plugin info
   */
  async installPlugin(archivePath) {
    // In a real implementation, this would extract the archive
    // For now, we'll assume it's a directory
    const pluginName = path.basename(archivePath);
    const destPath = path.join(this.pluginsDir, pluginName);
    
    if (fs.existsSync(destPath)) {
      throw new Error(`Plugin already exists: ${pluginName}`);
    }

    // Copy plugin files
    this._copyDirectory(archivePath, destPath);
    
    // Load the plugin
    return await this.loadPlugin(destPath);
  }

  /**
   * Uninstall plugin
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} Success
   */
  async uninstallPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Unload first
    await this.unloadPlugin(pluginId);

    // Delete plugin files
    try {
      fs.rmSync(plugin.path, { recursive: true, force: true });
      this.logger.info(`Uninstalled plugin: ${pluginId}`);
      this.emit('pluginUninstalled', { id: pluginId });
      return true;
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginId}:`, error.message);
      return false;
    }
  }

  /**
   * Copy directory recursively
   * @private
   */
  _copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this._copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Get plugin API
   * @param {string} name - API name
   * @returns {Object} API object
   */
  getAPI(name) {
    return this.pluginAPIs.get(name);
  }

  /**
   * Emit event to all enabled plugins
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  broadcastEvent(event, data) {
    for (const [id, plugin] of this.plugins) {
      if (plugin.enabled) {
        this.eventBus.emit(`${id}:${event}`, data);
      }
    }
    this.emit(event, data);
  }

  /**
   * Get plugins directory
   * @returns {string} Plugins directory path
   */
  getPluginsDirectory() {
    return this.pluginsDir;
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Unload all plugins
    for (const [id] of this.plugins) {
      this.unloadPlugin(id);
    }
    
    this.removeAllListeners();
    this.eventBus.removeAllListeners();
    this.logger.info('Plugin manager destroyed');
  }
}

/**
 * Permission Manager - Handles plugin permissions
 */
class PermissionManager {
  constructor() {
    this.pluginPermissions = new Map();
  }

  /**
   * Grant permissions to a plugin
   * @param {string} pluginId - Plugin ID
   * @param {Array} permissions - List of permissions
   */
  grantPermissions(pluginId, permissions) {
    const existing = this.pluginPermissions.get(pluginId) || new Set();
    permissions.forEach(p => existing.add(p));
    this.pluginPermissions.set(pluginId, existing);
  }

  /**
   * Revoke all permissions from a plugin
   * @param {string} pluginId - Plugin ID
   */
  revokeAllPermissions(pluginId) {
    this.pluginPermissions.delete(pluginId);
  }

  /**
   * Check if plugin has permission
   * @param {string} pluginId - Plugin ID
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  hasPermission(pluginId, permission) {
    const permissions = this.pluginPermissions.get(pluginId);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Get plugin permissions
   * @param {string} pluginId - Plugin ID
   * @returns {Array} List of permissions
   */
  getPermissions(pluginId) {
    return Array.from(this.pluginPermissions.get(pluginId) || []);
  }
}

// Export singleton instance
module.exports = new PluginManager();
module.exports.PluginManager = PluginManager;
module.exports.PermissionManager = PermissionManager;
module.exports.PERMISSIONS = PERMISSIONS;
