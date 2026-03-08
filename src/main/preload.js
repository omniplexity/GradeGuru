/**
 * Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ====================
  // IPC Communication
  // ====================

  /**
   * Send a message to the main process
   * @param {string} channel - The IPC channel to send on
   * @param {*} data - Data to send
   * @returns {Promise<*>} Response from main process
   */
  send: (channel, data) => {
    const validChannels = [
      'message:send',
      'plugin:install',
      'plugin:uninstall',
      'plugin:list',
      'settings:get',
      'settings:set',
      'model:select',
      'model:list',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    throw new Error(`Invalid channel: ${channel}`);
  },

  /**
   * Receive messages from the main process
   * @param {string} channel - The IPC channel to listen on
   * @param {Function} callback - Callback function to handle the message
   */
  on: (channel, callback) => {
    const validChannels = [
      'model:response',
      'model:stream',
      'model:error',
      'plugin:installed',
      'plugin:uninstalled',
      'settings:updated',
      'window:maximized',
      'window:unmaximized',
    ];
    if (validChannels.includes(channel)) {
      // Create a subscription and return cleanup function
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    throw new Error(`Invalid channel: ${channel}`);
  },

  /**
   * Remove a specific listener
   * @param {string} channel
   */
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // ====================
  // Window Controls
  // ====================

  /**
   * Minimize the window
   */
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),

  /**
   * Maximize or restore the window
   */
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),

  /**
   * Close the window
   */
  windowClose: () => ipcRenderer.invoke('window:close'),

  /**
   * Check if window is maximized
   * @returns {Promise<boolean>}
   */
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  /**
   * Listen for maximize state changes
   * @param {Function} callback
   */
  onWindowMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximized', () => callback(true));
    ipcRenderer.on('window:unmaximized', () => callback(false));
  },

  // ====================
  // Plugin Management
  // ====================

  /**
   * Get list of installed plugins
   * @returns {Promise<Array>}
   */
  getPlugins: () => ipcRenderer.invoke('plugin:list'),

  /**
   * Install a plugin
   * @param {string} pluginId
   * @returns {Promise<Object>}
   */
  installPlugin: (pluginId) => ipcRenderer.invoke('plugin:install', pluginId),

  /**
   * Uninstall a plugin
   * @param {string} pluginId
   * @returns {Promise<Object>}
   */
  uninstallPlugin: (pluginId) => ipcRenderer.invoke('plugin:uninstall', pluginId),

  // ====================
  // Settings
  // ====================

  /**
   * Get settings
   * @param {string} key - Optional settings key
   * @returns {Promise<Object>}
   */
  getSettings: (key) => ipcRenderer.invoke('settings:get', key),

  /**
   * Set settings
   * @param {string} key - Settings key
   * @param {*} value - Settings value
   * @returns {Promise<Object>}
   */
  setSettings: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // ====================
  // Model Management
  // ====================

  /**
   * Get list of available models
   * @returns {Promise<Array>}
   */
  getModels: () => ipcRenderer.invoke('model:list'),

  /**
   * Select a model
   * @param {string} modelId
   * @returns {Promise<Object>}
   */
  selectModel: (modelId) => ipcRenderer.invoke('model:select', modelId),

  // ====================
  // App Info
  // ====================

  /**
   * Get app version
   * @returns {Promise<string>}
   */
  getAppVersion: () => ipcRenderer.invoke('app:version'),

  /**
   * Get platform info
   * @returns {Promise<string>}
   */
  getPlatform: () => ipcRenderer.invoke('app:platform'),
});

console.log('[Preload] ElectronAPI exposed to renderer');
