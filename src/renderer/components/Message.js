/**
 * GradeGuru - Message Component
 * Renders individual messages with formatting support
 */

/**
 * Message - Renders individual chat messages
 * Supports markdown-like formatting, code blocks, and copy functionality
 */
class Message {
  /**
   * @param {Object} props - Message properties
   * @param {string} props.role - Message role ('user' or 'assistant')
   * @param {string} props.content - Message content
   * @param {string} props.timestamp - ISO timestamp string
   * @param {string} props.id - Optional message ID
   * @param {boolean} props.isError - Whether this is an error message
   */
  constructor(props) {
    this.role = props.role || 'assistant';
    this.content = props.content || '';
    this.timestamp = props.timestamp || new Date().toISOString();
    this.id = props.id || this._generateId();
    this.isError = props.isError || false;
  }
  
  /**
   * Generate a unique ID
   * @private
   * @returns {string}
   */
  _generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Render the message as an HTML element
   * @returns {HTMLElement} The rendered message element
   */
  render() {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${this.role}`;
    messageEl.dataset.messageId = this.id;
    
    // Avatar
    const avatar = this._renderAvatar();
    messageEl.appendChild(avatar);
    
    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';
    
    // Content
    const content = this._renderContent();
    contentWrapper.appendChild(content);
    
    // Actions (copy button)
    const actions = this._renderActions();
    if (actions) {
      contentWrapper.appendChild(actions);
    }
    
    messageEl.appendChild(contentWrapper);
    
    // Timestamp
    const timestamp = this._renderTimestamp();
    messageEl.appendChild(timestamp);
    
    return messageEl;
  }
  
  /**
   * Render the avatar element
   * @private
   * @returns {HTMLElement}
   */
  _renderAvatar() {
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (this.role === 'user') {
      avatar.innerHTML = '<i class="fas fa-user"></i>';
      avatar.setAttribute('aria-label', 'User');
    } else {
      avatar.innerHTML = '<i class="fas fa-robot"></i>';
      avatar.setAttribute('aria-label', 'AI Assistant');
    }
    
    return avatar;
  }
  
  /**
   * Render the message content with formatting
   * @private
   * @returns {HTMLElement}
   */
  _renderContent() {
    const content = document.createElement('div');
    content.className = 'message-content';
    
    if (this.isError) {
      content.classList.add('message-error');
    }
    
    content.innerHTML = Message.formatContent(this.content);
    
    return content;
  }
  
  /**
   * Render action buttons (copy)
   * @private
   * @returns {HTMLElement|null}
   */
  _renderActions() {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.setAttribute('aria-label', 'Copy message');
    copyBtn.title = 'Copy to clipboard';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
    
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._copyToClipboard();
    });
    
    actions.appendChild(copyBtn);
    
    return actions;
  }
  
  /**
   * Render the timestamp element
   * @private
   * @returns {HTMLElement}
   */
  _renderTimestamp() {
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = Message.formatTimestamp(this.timestamp);
    timestamp.setAttribute('datetime', this.timestamp);
    
    return timestamp;
  }
  
  /**
   * Copy message content to clipboard
   * @private
   */
  async _copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.content);
      
      // Show feedback
      const btn = document.querySelector(`[data-message-id="${this.id}"] .message-action-btn`);
      if (btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.classList.remove('copied');
        }, 2000);
      }
    } catch (err) {
      console.error('[Message] Failed to copy to clipboard:', err);
    }
  }
  
  /**
   * Format message content with markdown-like styling
   * @param {string} content - Raw message content
   * @returns {string} HTML formatted content
   */
  static formatContent(content) {
    if (!content) return '';
    
    // Escape HTML to prevent XSS
    let formatted = Message.escapeHtml(content);
    
    // Convert URLs to clickable links
    formatted = formatted.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>'
    );
    
    // Convert code blocks (```language\ncode```)
    formatted = formatted.replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      '<pre class="code-block"><code class="language-$1">$2</code></pre>'
    );
    
    // Convert inline code (`code`)
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="inline-code">$1</code>'
    );
    
    // Convert bold (**text**)
    formatted = formatted.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong>$1</strong>'
    );
    
    // Convert italic (*text*)
    formatted = formatted.replace(
      /\*([^*]+)\*/g,
      '<em>$1</em>'
    );
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
  
  /**
   * Format timestamp for display
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted timestamp
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (isToday) {
      return timeStr;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }
    
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return `${dateStr} at ${timeStr}`;
  }
  
  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Create a message from a plain object
   * @param {Object} obj - Plain message object
   * @returns {Message} New Message instance
   */
  static fromObject(obj) {
    return new Message(obj);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.Message = Message;
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Message;
}
