/**
 * GradeGuru - ChatView Component
 * Manages chat display and message handling
 */

/**
 * ChatView - Manages the chat display area
 * Provides methods for rendering messages, scrolling, and clearing
 */
class ChatView {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.containerSelector - CSS selector for messages container
   * @param {string} options.welcomeSelector - CSS selector for welcome message element
   */
  constructor(options = {}) {
    this.containerSelector = options.containerSelector || '#messagesList';
    this.welcomeSelector = options.welcomeSelector || '#welcomeMessage';
    
    this._container = null;
    this._welcomeElement = null;
    this._onMessageRendered = options.onMessageRendered || null;
    this._onScrollToBottom = options.onScrollToBottom || null;
    
    this._initialize();
  }
  
  /**
   * Initialize the component by getting DOM references
   * @private
   */
  _initialize() {
    this._container = document.querySelector(this.containerSelector);
    this._welcomeElement = document.querySelector(this.welcomeSelector);
    
    if (!this._container) {
      console.warn('[ChatView] Container element not found:', this.containerSelector);
    }
  }
  
  /**
   * Render all messages to the chat view
   * @param {Array} messages - Array of message objects
   */
  render(messages) {
    if (!this._container) return;
    
    this._container.innerHTML = '';
    
    if (!messages || messages.length === 0) {
      this._showWelcome();
      return;
    }
    
    this._hideWelcome();
    
    messages.forEach(message => {
      this.appendMessage(message);
    });
    
    this.scrollToBottom();
  }
  
  /**
   * Append a single message to the chat view
   * @param {Object} message - Message object with role, content, timestamp
   */
  appendMessage(message) {
    if (!this._container) return;
    
    const messageComponent = new Message(message);
    const messageElement = messageComponent.render();
    
    this._container.appendChild(messageElement);
    this.scrollToBottom();
    
    // Callback for external handlers
    if (this._onMessageRendered) {
      this._onMessageRendered(message, messageElement);
    }
  }
  
  /**
   * Update an existing message's content (for streaming)
   * @param {string} messageId - ID of the message to update
   * @param {string} newContent - New content to display
   */
  updateMessage(messageId, newContent) {
    if (!this._container) return;
    
    const messageElement = this._container.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) return;
    
    const contentElement = messageElement.querySelector('.message-content');
    if (contentElement) {
      contentElement.innerHTML = Message.formatContent(newContent);
    }
  }
  
  /**
   * Clear all messages from the chat view
   */
  clear() {
    if (!this._container) return;
    
    this._container.innerHTML = '';
    this._showWelcome();
  }
  
  /**
   * Scroll the container to the bottom
   */
  scrollToBottom() {
    if (!this._container) return;
    
    // Use smooth scrolling
    this._container.scrollTo({
      top: this._container.scrollHeight,
      behavior: 'smooth'
    });
    
    // Callback for external handlers
    if (this._onScrollToBottom) {
      this._onScrollToBottom();
    }
  }
  
  /**
   * Show the welcome message element
   * @private
   */
  _showWelcome() {
    if (this._welcomeElement) {
      this._welcomeElement.style.display = 'flex';
    }
  }
  
  /**
   * Hide the welcome message element
   * @private
   */
  _hideWelcome() {
    if (this._welcomeElement) {
      this._welcomeElement.style.display = 'none';
    }
  }
  
  /**
   * Show loading indicator
   * @returns {HTMLElement} The loading indicator element
   */
  showLoading() {
    if (!this._container) return null;
    
    const loadingEl = document.createElement('div');
    loadingEl.className = 'message message-assistant loading-message';
    loadingEl.id = 'loadingIndicator';
    
    loadingEl.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    this._container.appendChild(loadingEl);
    this.scrollToBottom();
    
    return loadingEl;
  }
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
      loadingEl.remove();
    }
  }
  
  /**
   * Set callback for when a message is rendered
   * @param {Function} callback - Callback function
   */
  onMessageRendered(callback) {
    this._onMessageRendered = callback;
  }
  
  /**
   * Set callback for when scrolled to bottom
   * @param {Function} callback - Callback function
   */
  onScrollToBottom(callback) {
    this._onScrollToBottom = callback;
  }
  
  /**
   * Get the container element
   * @returns {HTMLElement|null}
   */
  getContainer() {
    return this._container;
  }
  
  /**
   * Get the number of messages currently displayed
   * @returns {number}
   */
  getMessageCount() {
    return this._container ? this._container.children.length : 0;
  }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatView;
}
