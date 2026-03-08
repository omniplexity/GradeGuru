/**
 * OmniAI Desktop - Sidebar Component
 * Manages conversation list, model selector, and settings access
 */

/**
 * Sidebar - Manages the sidebar UI
 * Handles conversation management, model selection, and settings
 */
class Sidebar {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.conversationsSelector = options.conversationsSelector || '#conversationsList';
    this.modelSelectSelector = options.modelSelectSelector || '#modelSelect';
    this.newChatBtnSelector = options.newChatBtnSelector || '#newChatBtn';
    this.settingsBtnSelector = options.settingsBtnSelector || '#settingsBtn';
    this.sidebarSelector = options.sidebarSelector || '#sidebar';
    
    this._conversationsList = null;
    this._modelSelect = null;
    this._newChatBtn = null;
    this._settingsBtn = null;
    this._sidebar = null;
    
    // Event callbacks
    this._onNewChat = options.onNewChat || null;
    this._onConversationSelect = options.onConversationSelect || null;
    this._onModelChange = options.onModelChange || null;
    this._onSettingsClick = options.onSettingsClick || null;
    
    // State
    this._conversations = [];
    this._currentConversationId = null;
    this._models = [];
    this._selectedModel = null;
    
    this._initialize();
  }
  
  /**
   * Initialize the component by getting DOM references
   * @private
   */
  _initialize() {
    this._conversationsList = document.querySelector(this.conversationsSelector);
    this._modelSelect = document.querySelector(this.modelSelectSelector);
    this._newChatBtn = document.querySelector(this.newChatBtnSelector);
    this._settingsBtn = document.querySelector(this.settingsBtnSelector);
    this._sidebar = document.querySelector(this.sidebarSelector);
    
    this._bindEvents();
  }
  
  /**
   * Bind event listeners
   * @private
   */
  _bindEvents() {
    if (this._newChatBtn) {
      this._newChatBtn.addEventListener('click', () => this._handleNewChat());
    }
    
    if (this._settingsBtn) {
      this._settingsBtn.addEventListener('click', () => this._handleSettings());
    }
    
    if (this._modelSelect) {
      this._modelSelect.addEventListener('change', (e) => this._handleModelChange(e));
    }
  }
  
  /**
   * Handle new chat button click
   * @private
   */
  _handleNewChat() {
    if (this._onNewChat) {
      this._onNewChat();
    }
  }
  
  /**
   * Handle settings button click
   * @private
   */
  _handleSettings() {
    if (this._onSettingsClick) {
      this._onSettingsClick();
    }
  }
  
  /**
   * Handle model selection change
   * @private
   * @param {Event} event
   */
  _handleModelChange(event) {
    const modelId = event.target.value;
    const model = this._models.find(m => m.id === modelId);
    
    if (model && this._onModelChange) {
      this._selectedModel = model;
      this._onModelChange(model);
    }
  }
  
  /**
   * Update the conversations list
   * @param {Array} conversations - Array of conversation objects
   * @param {string} currentId - Currently selected conversation ID
   */
  setConversations(conversations, currentId = null) {
    this._conversations = conversations || [];
    this._currentConversationId = currentId;
    this.renderConversations();
  }
  
  /**
   * Update the models list
   * @param {Array} models - Array of model objects
   * @param {Object} selectedModel - Currently selected model
   */
  setModels(models, selectedModel = null) {
    this._models = models || [];
    this._selectedModel = selectedModel;
    this.renderModels();
  }
  
  /**
   * Set the current conversation
   * @param {string} conversationId - ID of the conversation to select
   */
  setCurrentConversation(conversationId) {
    this._currentConversationId = conversationId;
    this.renderConversations();
  }
  
  /**
   * Render the conversations list
   */
  renderConversations() {
    if (!this._conversationsList) return;
    
    this._conversationsList.innerHTML = '';
    
    if (this._conversations.length === 0) {
      this._renderEmptyConversations();
      return;
    }
    
    this._conversations.forEach(conversation => {
      const item = this._createConversationItem(conversation);
      this._conversationsList.appendChild(item);
    });
  }
  
  /**
   * Render empty state for conversations
   * @private
   */
  _renderEmptyConversations() {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'conversation-item conversation-empty';
    emptyItem.innerHTML = `
      <i class="fas fa-comment-slash"></i>
      <span>No conversations yet</span>
    `;
    this._conversationsList.appendChild(emptyItem);
  }
  
  /**
   * Create a conversation list item element
   * @private
   * @param {Object} conversation - Conversation object
   * @returns {HTMLElement}
   */
  _createConversationItem(conversation) {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.dataset.conversationId = conversation.id;
    
    if (conversation.id === this._currentConversationId) {
      item.classList.add('active');
    }
    
    // Icon based on conversation state
    const icon = conversation.messages && conversation.messages.length > 0 
      ? '<i class="fas fa-message"></i>'
      : '<i class="fas fa-plus"></i>';
    
    // Truncate title
    const title = this._truncateTitle(conversation.title || 'New Conversation');
    
    item.innerHTML = `
      ${icon}
      <span class="conversation-title">${title}</span>
    `;
    
    // Click handler
    item.addEventListener('click', () => {
      if (this._onConversationSelect) {
        this._onConversationSelect(conversation.id);
      }
    });
    
    // Delete button (on hover)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'conversation-delete';
    deleteBtn.setAttribute('aria-label', 'Delete conversation');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleDeleteConversation(conversation.id);
    });
    
    item.appendChild(deleteBtn);
    
    return item;
  }
  
  /**
   * Handle conversation deletion
   * @private
   * @param {string} conversationId - ID of conversation to delete
   */
  _handleDeleteConversation(conversationId) {
    // Could trigger a confirmation dialog here
    // For now, just emit the event
    if (this._onConversationSelect) {
      // Pass delete flag
      this._conversations = this._conversations.filter(c => c.id !== conversationId);
      this.renderConversations();
    }
  }
  
  /**
   * Truncate conversation title
   * @private
   * @param {string} title - Title to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string}
   */
  _truncateTitle(title, maxLength = 25) {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  }
  
  /**
   * Render the model selector
   */
  renderModels() {
    if (!this._modelSelect) return;
    
    this._modelSelect.innerHTML = '';
    
    if (this._models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models available';
      this._modelSelect.appendChild(option);
      return;
    }
    
    this._models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${model.provider})`;
      
      if (this._selectedModel && this._selectedModel.id === model.id) {
        option.selected = true;
      }
      
      this._modelSelect.appendChild(option);
    });
  }
  
  /**
   * Toggle sidebar visibility (for mobile)
   */
  toggle() {
    if (this._sidebar) {
      this._sidebar.classList.toggle('open');
    }
  }
  
  /**
   * Show sidebar
   */
  show() {
    if (this._sidebar) {
      this._sidebar.classList.add('open');
    }
  }
  
  /**
   * Hide sidebar
   */
  hide() {
    if (this._sidebar) {
      this._sidebar.classList.remove('open');
    }
  }
  
  /**
   * Check if sidebar is visible
   * @returns {boolean}
   */
  isOpen() {
    return this._sidebar ? this._sidebar.classList.contains('open') : false;
  }
  
  /**
   * Set callback for new chat
   * @param {Function} callback
   */
  onNewChat(callback) {
    this._onNewChat = callback;
  }
  
  /**
   * Set callback for conversation selection
   * @param {Function} callback
   */
  onConversationSelect(callback) {
    this._onConversationSelect = callback;
  }
  
  /**
   * Set callback for model change
   * @param {Function} callback
   */
  onModelChange(callback) {
    this._onModelChange = callback;
  }
  
  /**
   * Set callback for settings click
   * @param {Function} callback
   */
  onSettingsClick(callback) {
    this._onSettingsClick = callback;
  }
  
  /**
   * Get the sidebar element
   * @returns {HTMLElement|null}
   */
  getElement() {
    return this._sidebar;
  }
  
  /**
   * Get the conversations list element
   * @returns {HTMLElement|null}
   */
  getConversationsList() {
    return this._conversationsList;
  }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sidebar;
}
