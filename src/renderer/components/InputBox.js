/**
 * OmniAI Desktop - InputBox Component
 * Manages message input with auto-resize, send button, and keyboard handling
 */

/**
 * InputBox - Manages the message input area
 * Handles text input, keyboard shortcuts, and auto-resize
 */
class InputBox {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.inputSelector = options.inputSelector || '#messageInput';
    this.sendBtnSelector = options.sendBtnSelector || '#sendBtn';
    
    this._input = null;
    this._sendBtn = null;
    
    // Configuration
    this.maxHeight = options.maxHeight || 200;
    this.minHeight = options.minHeight || 44;
    this.maxLength = options.maxLength || 10000;
    this.showCharCount = options.showCharCount !== false;
    
    // Event callbacks
    this._onSend = options.onSend || null;
    this._onInput = options.onInput || null;
    this._onTyping = options.onTyping || null;
    
    // State
    this._isTyping = false;
    this._typingTimeout = null;
    
    this._initialize();
  }
  
  /**
   * Initialize the component by getting DOM references
   * @private
   */
  _initialize() {
    this._input = document.querySelector(this.inputSelector);
    this._sendBtn = document.querySelector(this.sendBtnSelector);
    
    if (this._input) {
      this._bindEvents();
      this._updateSendButton();
    }
  }
  
  /**
   * Bind event listeners
   * @private
   */
  _bindEvents() {
    // Input event for auto-resize and button state
    this._input.addEventListener('input', (e) => this._handleInput(e));
    
    // Keyboard handling
    this._input.addEventListener('keydown', (e) => this._handleKeydown(e));
    
    // Send button
    if (this._sendBtn) {
      this._sendBtn.addEventListener('click', () => this._handleSend());
    }
    
    // Focus/blur events
    this._input.addEventListener('focus', () => this._handleFocus());
    this._input.addEventListener('blur', () => this._handleBlur());
  }
  
  /**
   * Handle input event
   * @private
   * @param {Event} event
   */
  _handleInput(event) {
    // Auto-resize
    this._autoResize();
    
    // Update send button state
    this._updateSendButton();
    
    // Character count
    this._updateCharCount();
    
    // Typing indicator
    this._handleTyping();
    
    // Callback
    if (this._onInput) {
      this._onInput(event.target.value);
    }
  }
  
  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeydown(event) {
    // Send on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this._handleSend();
      return;
    }
    
    // Newline on Shift+Enter (default behavior)
    // Could add more keyboard shortcuts here
  }
  
  /**
   * Handle send button click
   * @private
   */
  _handleSend() {
    const content = this.getValue().trim();
    
    if (!content || this.isDisabled()) {
      return;
    }
    
    // Callback
    if (this._onSend) {
      this._onSend(content);
    }
    
    // Clear input after send
    this.clear();
  }
  
  /**
   * Handle focus event
   * @private
   */
  _handleFocus() {
    this._input.classList.add('focused');
  }
  
  /**
   * Handle blur event
   * @private
   */
  _handleBlur() {
    this._input.classList.remove('focused');
  }
  
  /**
   * Handle typing indicator
   * @private
   */
  _handleTyping() {
    if (!this._onTyping) return;
    
    // Clear existing timeout
    if (this._typingTimeout) {
      clearTimeout(this._typingTimeout);
    }
    
    // Only trigger if not already typing
    if (!this._isTyping) {
      this._isTyping = true;
      this._onTyping(true);
    }
    
    // Set timeout to stop typing indicator
    this._typingTimeout = setTimeout(() => {
      this._isTyping = false;
      this._onTyping(false);
    }, 1000);
  }
  
  /**
   * Auto-resize the textarea
   * @private
   */
  _autoResize() {
    if (!this._input) return;
    
    // Reset height to get correct scrollHeight
    this._input.style.height = 'auto';
    
    // Calculate new height
    const scrollHeight = this._input.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, this.minHeight), this.maxHeight);
    
    this._input.style.height = newHeight + 'px';
    
    // Add overflow class if needed
    if (scrollHeight > this.maxHeight) {
      this._input.classList.add('overflowing');
    } else {
      this._input.classList.remove('overflowing');
    }
  }
  
  /**
   * Update send button state
   * @private
   */
  _updateSendButton() {
    if (!this._sendBtn) return;
    
    const hasContent = this.getValue().trim().length > 0;
    this._sendBtn.disabled = !hasContent;
    
    if (hasContent) {
      this._sendBtn.classList.add('active');
    } else {
      this._sendBtn.classList.remove('active');
    }
  }
  
  /**
   * Update character count display
   * @private
   */
  _updateCharCount() {
    let counter = document.querySelector('.input-char-count');
    const length = this.getValue().length;
    const remaining = this.maxLength - length;
    
    if (!this.showCharCount) return;
    
    if (!counter && length > 0) {
      // Create counter element
      counter = document.createElement('div');
      counter.className = 'input-char-count';
      this._input.parentNode.appendChild(counter);
    }
    
    if (counter) {
      counter.textContent = `${length}/${this.maxLength}`;
      
      // Add warning class if near limit
      if (remaining < 100) {
        counter.classList.add('warning');
      } else {
        counter.classList.remove('warning');
      }
      
      // Hide if empty
      if (length === 0) {
        counter.style.display = 'none';
      } else {
        counter.style.display = 'block';
      }
    }
  }
  
  /**
   * Get the input value
   * @returns {string}
   */
  getValue() {
    return this._input ? this._input.value : '';
  }
  
  /**
   * Set the input value
   * @param {string} value
   */
  setValue(value) {
    if (this._input) {
      this._input.value = value;
      this._autoResize();
      this._updateSendButton();
      this._updateCharCount();
    }
  }
  
  /**
   * Clear the input
   */
  clear() {
    this.setValue('');
  }
  
  /**
   * Focus the input
   */
  focus() {
    if (this._input) {
      this._input.focus();
    }
  }
  
  /**
   * Blur the input
   */
  blur() {
    if (this._input) {
      this._input.blur();
    }
  }
  
  /**
   * Check if input is disabled
   * @returns {boolean}
   */
  isDisabled() {
    return this._sendBtn ? this._sendBtn.disabled : true;
  }
  
  /**
   * Disable the input
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    if (this._input) {
      this._input.disabled = disabled;
    }
    if (this._sendBtn) {
      this._sendBtn.disabled = disabled;
    }
  }
  
  /**
   * Set placeholder text
   * @param {string} placeholder
   */
  setPlaceholder(placeholder) {
    if (this._input) {
      this._input.placeholder = placeholder;
    }
  }
  
  /**
   * Set callback for send event
   * @param {Function} callback
   */
  onSend(callback) {
    this._onSend = callback;
  }
  
  /**
   * Set callback for input event
   * @param {Function} callback
   */
  onInput(callback) {
    this._onInput = callback;
  }
  
  /**
   * Set callback for typing indicator
   * @param {Function} callback
   */
  onTyping(callback) {
    this._onTyping = callback;
  }
  
  /**
   * Get the input element
   * @returns {HTMLElement|null}
   */
  getInput() {
    return this._input;
  }
  
  /**
   * Get the send button element
   * @returns {HTMLElement|null}
   */
  getSendButton() {
    return this._sendBtn;
  }
  
  /**
   * Get character count
   * @returns {number}
   */
  getCharCount() {
    return this.getValue().length;
  }
  
  /**
   * Check if input is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.getValue().trim().length === 0;
  }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputBox;
}
