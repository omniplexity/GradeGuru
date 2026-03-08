/**
 * GradeGuru - Conversation Store
 * Handles conversation persistence, message history management,
 * and export/import functionality.
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Conversation Store class - Manages conversation persistence
 */
class ConversationStore extends EventEmitter {
  constructor() {
    super();
    this.conversations = new Map();
    this.activeConversationId = null;
    this.dataDir = path.join(app.getPath('userData'), 'conversations');
    this.indexFile = path.join(this.dataDir, 'index.json');
    this.logger = this._initLogger();
    
    this._initialize();
  }

  /**
   * Initialize the conversation store
   * @private
   */
  _initialize() {
    this._ensureDataDir();
    this._loadIndex();
  }

  /**
   * Initialize logger
   * @private
   */
  _initLogger() {
    return {
      info: (...args) => console.log('[ConversationStore INFO]', new Date().toISOString(), ...args),
      warn: (...args) => console.warn('[ConversationStore WARN]', new Date().toISOString(), ...args),
      error: (...args) => console.error('[ConversationStore ERROR]', new Date().toISOString(), ...args),
      debug: (...args) => {
        if (process.env.DEBUG) console.log('[ConversationStore DEBUG]', new Date().toISOString(), ...args);
      }
    };
  }

  /**
   * Ensure data directory exists
   * @private
   */
  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      this.logger.info('Created conversations directory:', this.dataDir);
    }
  }

  /**
   * Load conversation index
   * @private
   */
  _loadIndex() {
    try {
      if (fs.existsSync(this.indexFile)) {
        const data = fs.readFileSync(this.indexFile, 'utf8');
        const index = JSON.parse(data);
        
        this.conversations = new Map(Object.entries(index));
        this.logger.info(`Loaded ${this.conversations.size} conversations from index`);
      } else {
        this.conversations = new Map();
        this._saveIndex();
        this.logger.info('Created new conversation index');
      }
    } catch (error) {
      this.logger.error('Failed to load conversation index:', error.message);
      this.conversations = new Map();
    }
  }

  /**
   * Save conversation index
   * @private
   */
  _saveIndex() {
    try {
      const index = Object.fromEntries(this.conversations);
      fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
    } catch (error) {
      this.logger.error('Failed to save conversation index:', error.message);
    }
  }

  /**
   * Get conversation file path
   * @private
   */
  _getConversationFilePath(id) {
    return path.join(this.dataDir, `${id}.json`);
  }

  /**
   * Generate unique conversation ID
   * @private
   */
  _generateId() {
    return crypto.randomUUID();
  }

  /**
   * Create a new conversation
   * @param {Object} options - Conversation options
   * @returns {Object} Created conversation
   */
  createConversation(options = {}) {
    const id = this._generateId();
    const now = new Date().toISOString();
    
    const conversation = {
      id,
      title: options.title || 'New Conversation',
      created: now,
      modified: now,
      model: options.model || null,
      provider: options.provider || null,
      messages: [],
      metadata: {
        messageCount: 0,
        lastMessageAt: null,
        ...options.metadata
      }
    };

    this.conversations.set(id, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();
    
    this.logger.info(`Created conversation: ${id}`);
    this.emit('conversationCreated', conversation);
    
    return conversation;
  }

  /**
   * Save conversation to individual file
   * @private
   */
  _saveConversationToFile(conversation) {
    try {
      const filePath = this._getConversationFilePath(conversation.id);
      fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
      this.logger.debug(`Saved conversation to file: ${conversation.id}`);
    } catch (error) {
      this.logger.error('Failed to save conversation to file:', error.message);
    }
  }

  /**
   * Load conversation from file
   * @private
   */
  _loadConversationFromFile(id) {
    try {
      const filePath = this._getConversationFilePath(id);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error(`Failed to load conversation ${id}:`, error.message);
    }
    return null;
  }

  /**
   * Get a conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Object|null} Conversation
   */
  getConversation(id) {
    // Check memory first
    if (this.conversations.has(id)) {
      return this.conversations.get(id);
    }
    
    // Try loading from file
    const conversation = this._loadConversationFromFile(id);
    if (conversation) {
      this.conversations.set(id, conversation);
      return conversation;
    }
    
    return null;
  }

  /**
   * Get all conversations (summary)
   * @returns {Array} List of conversation summaries
   */
  getAllConversations() {
    const summaries = [];
    
    for (const [id, conversation] of this.conversations) {
      summaries.push({
        id,
        title: conversation.title,
        created: conversation.created,
        modified: conversation.modified,
        model: conversation.model,
        provider: conversation.provider,
        messageCount: conversation.metadata?.messageCount || 0,
        lastMessageAt: conversation.metadata?.lastMessageAt
      });
    }
    
    // Sort by modified date (most recent first)
    return summaries.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  /**
   * Update conversation
   * @param {string} id - Conversation ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated conversation
   */
  updateConversation(id, updates) {
    const conversation = this.getConversation(id);
    if (!conversation) {
      this.logger.warn(`Conversation not found: ${id}`);
      return null;
    }

    // Apply updates
    Object.assign(conversation, updates, {
      modified: new Date().toISOString()
    });

    this.conversations.set(id, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();
    
    this.logger.debug(`Updated conversation: ${id}`);
    this.emit('conversationUpdated', conversation);
    
    return conversation;
  }

  /**
   * Delete a conversation
   * @param {string} id - Conversation ID
   * @returns {boolean} Success
   */
  deleteConversation(id) {
    if (!this.conversations.has(id)) {
      this.logger.warn(`Conversation not found: ${id}`);
      return false;
    }

    // Delete file
    try {
      const filePath = this._getConversationFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error(`Failed to delete conversation file:`, error.message);
    }

    this.conversations.delete(id);
    
    if (this.activeConversationId === id) {
      this.activeConversationId = null;
    }
    
    this._saveIndex();
    
    this.logger.info(`Deleted conversation: ${id}`);
    this.emit('conversationDeleted', { id });
    
    return true;
  }

  /**
   * Add a message to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message to add
   * @returns {Object|null} Updated conversation
   */
  addMessage(conversationId, message) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      this.logger.warn(`Conversation not found: ${conversationId}`);
      return null;
    }

    const messageObj = {
      id: this._generateId(),
      role: message.role, // 'user', 'assistant', 'system'
      content: message.content,
      timestamp: new Date().toISOString(),
      metadata: message.metadata || {}
    };

    conversation.messages.push(messageObj);
    conversation.metadata.messageCount = conversation.messages.length;
    conversation.metadata.lastMessageAt = messageObj.timestamp;
    conversation.modified = new Date().toISOString();

    // Auto-generate title from first user message if default
    if (conversation.title === 'New Conversation' && message.role === 'user') {
      conversation.title = this._generateTitle(message.content);
    }

    this.conversations.set(conversationId, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();
    
    this.logger.debug(`Added message to conversation: ${conversationId}`);
    this.emit('messageAdded', { conversationId, message: messageObj });
    
    return conversation;
  }

  /**
   * Generate title from message content
   * @private
   */
  _generateTitle(content) {
    // Take first line or first 50 characters
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
  }

  /**
   * Update a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated conversation
   */
  updateMessage(conversationId, messageId, updates) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      this.logger.warn(`Message not found: ${messageId}`);
      return null;
    }

    conversation.messages[messageIndex] = {
      ...conversation.messages[messageIndex],
      ...updates,
      editedAt: new Date().toISOString()
    };
    conversation.modified = new Date().toISOString();

    this.conversations.set(conversationId, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();
    
    this.emit('messageUpdated', { 
      conversationId, 
      message: conversation.messages[messageIndex] 
    });
    
    return conversation;
  }

  /**
   * Delete a message from a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} messageId - Message ID
   * @returns {Object|null} Updated conversation
   */
  deleteMessage(conversationId, messageId) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      this.logger.warn(`Message not found: ${messageId}`);
      return null;
    }

    conversation.messages.splice(messageIndex, 1);
    conversation.metadata.messageCount = conversation.messages.length;
    conversation.modified = new Date().toISOString();

    this.conversations.set(conversationId, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();
    
    this.emit('messageDeleted', { conversationId, messageId });
    
    return conversation;
  }

  /**
   * Get conversation messages
   * @param {string} conversationId - Conversation ID
   * @returns {Array} Messages
   */
  getMessages(conversationId) {
    const conversation = this.getConversation(conversationId);
    return conversation ? conversation.messages : [];
  }

  /**
   * Set active conversation
   * @param {string} id - Conversation ID
   */
  setActiveConversation(id) {
    if (id && !this.getConversation(id)) {
      this.logger.warn(`Cannot set active conversation: ${id} not found`);
      return;
    }
    
    this.activeConversationId = id;
    this.emit('activeConversationChanged', { id });
    this.logger.debug(`Active conversation set: ${id}`);
  }

  /**
   * Get active conversation
   * @returns {Object|null} Active conversation
   */
  getActiveConversation() {
    if (!this.activeConversationId) {
      return null;
    }
    return this.getConversation(this.activeConversationId);
  }

  /**
   * Export conversation to file
   * @param {string} conversationId - Conversation ID
   * @param {string} format - Export format ('json', 'markdown', 'txt')
   * @returns {string} Exported content
   */
  exportConversation(conversationId, format = 'json') {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      
      case 'markdown':
        return this._exportAsMarkdown(conversation);
      
      case 'txt':
        return this._exportAsText(conversation);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as Markdown format
   * @private
   */
  _exportAsMarkdown(conversation) {
    let md = `# ${conversation.title}\n\n`;
    md += `**Created:** ${conversation.created}\n`;
    md += `**Modified:** ${conversation.modified}\n`;
    md += `**Model:** ${conversation.model || 'N/A'}\n\n`;
    md += `---\n\n`;

    for (const msg of conversation.messages) {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      md += `### ${role}\n\n`;
      md += `${msg.content}\n\n`;
    }

    return md;
  }

  /**
   * Export as plain text
   * @private
   */
  _exportAsText(conversation) {
    let text = `${conversation.title}\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Created: ${conversation.created}\n`;
    text += `Modified: ${conversation.modified}\n`;
    text += `Model: ${conversation.model || 'N/A'}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;

    for (const msg of conversation.messages) {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      text += `[${role}]\n`;
      text += `${msg.content}\n\n`;
    }

    return text;
  }

  /**
   * Export conversation to file
   * @param {string} conversationId - Conversation ID
   * @param {string} exportPath - Path to save export
   * @param {string} format - Export format
   */
  exportConversationToFile(conversationId, exportPath, format = 'json') {
    const content = this.exportConversation(conversationId, format);
    fs.writeFileSync(exportPath, content, 'utf8');
    this.logger.info(`Exported conversation ${conversationId} to ${exportPath}`);
    return exportPath;
  }

  /**
   * Import conversation from file
   * @param {string} importPath - Path to import from
   * @returns {Object} Imported conversation
   */
  importConversation(importPath) {
    if (!fs.existsSync(importPath)) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    const content = fs.readFileSync(importPath, 'utf8');
    const extension = path.extname(importPath).toLowerCase();
    
    let conversation;
    
    if (extension === '.json') {
      conversation = JSON.parse(content);
    } else if (extension === '.md') {
      conversation = this._importFromMarkdown(content);
    } else {
      throw new Error(`Unsupported import format: ${extension}`);
    }

    // Generate new ID to avoid conflicts
    const newId = this._generateId();
    conversation.id = newId;
    conversation.imported = new Date().toISOString();
    conversation.modified = new Date().toISOString();

    // Save imported conversation
    this.conversations.set(newId, conversation);
    this._saveConversationToFile(conversation);
    this._saveIndex();

    this.logger.info(`Imported conversation from ${importPath}`);
    this.emit('conversationImported', conversation);
    
    return conversation;
  }

  /**
   * Import from Markdown format
   * @private
   */
  _importFromMarkdown(content) {
    const lines = content.split('\n');
    const conversation = {
      id: this._generateId(),
      title: 'Imported Conversation',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      messages: []
    };

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      conversation.title = titleMatch[1];
    }

    // Parse messages (simplified - looks for ### User/Assistant)
    let currentRole = null;
    let currentContent = [];

    for (const line of lines) {
      const roleMatch = line.match(/^###\s+(User|Assistant|System)$/i);
      if (roleMatch) {
        // Save previous message
        if (currentRole && currentContent.length > 0) {
          conversation.messages.push({
            id: this._generateId(),
            role: currentRole.toLowerCase(),
            content: currentContent.join('\n').trim(),
            timestamp: conversation.created
          });
        }
        currentRole = roleMatch[1];
        currentContent = [];
      } else if (currentRole && line.trim()) {
        currentContent.push(line);
      }
    }

    // Save last message
    if (currentRole && currentContent.length > 0) {
      conversation.messages.push({
        id: this._generateId(),
        role: currentRole.toLowerCase(),
        content: currentContent.join('\n').trim(),
        timestamp: conversation.created
      });
    }

    conversation.metadata = {
      messageCount: conversation.messages.length,
      lastMessageAt: conversation.messages.length > 0 
        ? conversation.messages[conversation.messages.length - 1].timestamp 
        : null
    };

    return conversation;
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage info
   */
  getStorageStats() {
    const conversations = this.getAllConversations();
    let totalMessages = 0;
    
    for (const conv of conversations) {
      totalMessages += conv.messageCount;
    }

    let totalSize = 0;
    try {
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      this.logger.error('Failed to calculate storage stats:', error.message);
    }

    return {
      conversationCount: conversations.length,
      totalMessages,
      totalSize,
      storageLocation: this.dataDir
    };
  }

  /**
   * Get storage location
   * @returns {string} Storage path
   */
  getStorageLocation() {
    return this.dataDir;
  }

  /**
   * Set custom storage location
   * @param {string} newPath - New storage path
   */
  setStorageLocation(newPath) {
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }

    // Move all conversation files
    try {
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        const src = path.join(this.dataDir, file);
        const dest = path.join(newPath, file);
        fs.renameSync(src, dest);
      }

      // Remove old directory if empty
      const remaining = fs.readdirSync(this.dataDir);
      if (remaining.length === 0) {
        fs.rmdirSync(this.dataDir);
      }

      this.dataDir = newPath;
      this.indexFile = path.join(this.dataDir, 'index.json');
      this._loadIndex();
      
      this.logger.info(`Storage location changed to: ${newPath}`);
      this.emit('storageLocationChanged', { path: newPath });
    } catch (error) {
      this.logger.error('Failed to change storage location:', error.message);
      throw error;
    }
  }

  /**
   * Search conversations
   * @param {string} query - Search query
   * @returns {Array} Matching conversations
   */
  searchConversations(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [id, conversation] of this.conversations) {
      // Search in title
      if (conversation.title.toLowerCase().includes(lowerQuery)) {
        results.push({ conversation, matchType: 'title' });
        continue;
      }

      // Search in messages
      const matchingMessages = conversation.messages.filter(
        m => m.content.toLowerCase().includes(lowerQuery)
      );
      
      if (matchingMessages.length > 0) {
        results.push({ 
          conversation, 
          matchType: 'messages',
          matchingMessages 
        });
      }
    }

    return results;
  }

  /**
   * Clear all conversations
   * @returns {boolean} Success
   */
  clearAllConversations() {
    try {
      // Delete all conversation files
      const files = fs.readdirSync(this.dataDir);
      for (const file of files) {
        if (file !== 'index.json') {
          fs.unlinkSync(path.join(this.dataDir, file));
        }
      }

      this.conversations.clear();
      this.activeConversationId = null;
      this._saveIndex();
      
      this.logger.info('Cleared all conversations');
      this.emit('allConversationsCleared');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to clear conversations:', error.message);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.removeAllListeners();
    this.logger.info('Conversation store destroyed');
  }
}

// Export singleton instance
module.exports = new ConversationStore();
module.exports.ConversationStore = ConversationStore;
