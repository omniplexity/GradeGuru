/**
 * GradeGuru - Renderer Application
 * Main application JavaScript for the chat interface
 */

// ====================
// State Management
// ====================
const AppState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  selectedModel: null,
  availableModels: [],
  isLoading: false,
  isStreaming: false,
};

// ====================
// DOM Elements
// ====================
const DOM = {
  // Sidebar
  sidebar: document.getElementById('sidebar'),
  newChatBtn: document.getElementById('newChatBtn'),
  conversationsList: document.getElementById('conversationsList'),
  modelSelect: document.getElementById('modelSelect'),
  settingsBtn: document.getElementById('settingsBtn'),
  
  // Chat Area
  chatArea: document.getElementById('chatArea'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  chatTitle: document.getElementById('chatTitle'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  messagesContainer: document.getElementById('messagesContainer'),
  welcomeMessage: document.getElementById('welcomeMessage'),
  messagesList: document.getElementById('messagesList'),
  
  // Input Area
  inputArea: document.getElementById('inputArea'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
};

// ====================
// Initialization
// ====================
async function initializeApp() {
  console.log('[Renderer] Initializing application...');
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up IPC listeners
  setupIPCListeners();
  
  // Load available models
  await loadModels();
  
  // Load conversations
  loadConversations();
  
  console.log('[Renderer] Application initialized');
}

// ====================
// Event Listeners
// ====================
function setupEventListeners() {
  // New Chat Button
  DOM.newChatBtn.addEventListener('click', handleNewChat);
  
  // Mobile Menu Toggle
  DOM.mobileMenuBtn.addEventListener('click', toggleSidebar);
  
  // Clear Chat Button
  DOM.clearChatBtn.addEventListener('click', handleClearChat);
  
  // Model Selection
  DOM.modelSelect.addEventListener('change', handleModelChange);
  
  // Settings Button
  DOM.settingsBtn.addEventListener('click', handleSettings);
  
  // Message Input
  DOM.messageInput.addEventListener('input', handleInputChange);
  DOM.messageInput.addEventListener('keydown', handleInputKeydown);
  
  // Send Button
  DOM.sendBtn.addEventListener('click', handleSendMessage);
  
  // Auto-resize textarea
  DOM.messageInput.addEventListener('input', autoResizeTextarea);
  
  // Window resize
  window.addEventListener('resize', handleWindowResize);
}

// ====================
// IPC Listeners
// ====================
function setupIPCListeners() {
  // Listen for model responses
  if (window.electronAPI) {
    window.electronAPI.on('model:response', handleModelResponse);
    window.electronAPI.on('model:stream', handleModelStream);
    window.electronAPI.on('model:error', handleModelError);
  }
}

// ====================
// Model Management
// ====================
async function loadModels() {
  try {
    if (window.electronAPI) {
      const models = await window.electronAPI.getModels();
      AppState.availableModels = models;
      renderModelSelector(models);
      
      // Select first model by default
      if (models.length > 0) {
        AppState.selectedModel = models[0];
        DOM.modelSelect.value = models[0].id;
      }
    }
  } catch (error) {
    console.error('[Renderer] Failed to load models:', error);
  }
}

function renderModelSelector(models) {
  DOM.modelSelect.innerHTML = '';
  
  if (models.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No models available';
    DOM.modelSelect.appendChild(option);
    return;
  }
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name} (${model.provider})`;
    DOM.modelSelect.appendChild(option);
  });
}

async function handleModelChange(event) {
  const modelId = event.target.value;
  const model = AppState.availableModels.find(m => m.id === modelId);
  
  if (model) {
    AppState.selectedModel = model;
    
    if (window.electronAPI) {
      try {
        await window.electronAPI.selectModel(modelId);
        console.log('[Renderer] Model selected:', model.name);
      } catch (error) {
        console.error('[Renderer] Failed to select model:', error);
      }
    }
  }
}

// ====================
// Conversation Management
// ====================
function loadConversations() {
  // Load conversations from localStorage
  const stored = localStorage.getItem('gradeguru_conversations');
  if (stored) {
    AppState.conversations = JSON.parse(stored);
    renderConversations();
  }
  
  // Create initial conversation if none exists
  if (AppState.conversations.length === 0) {
    createNewConversation();
  } else {
    // Load the most recent conversation
    const lastConversation = AppState.conversations[AppState.conversations.length - 1];
    selectConversation(lastConversation.id);
  }
}

function createNewConversation() {
  const conversation = {
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  AppState.conversations.push(conversation);
  saveConversations();
  renderConversations();
  selectConversation(conversation.id);
}

function selectConversation(conversationId) {
  AppState.currentConversationId = conversationId;
  const conversation = AppState.conversations.find(c => c.id === conversationId);
  
  if (conversation) {
    AppState.messages = conversation.messages || [];
    renderMessages();
    renderConversations();
  }
}

function saveConversations() {
  localStorage.setItem('gradeguru_conversations', JSON.stringify(AppState.conversations));
}

function renderConversations() {
  DOM.conversationsList.innerHTML = '';
  
  AppState.conversations.forEach(conversation => {
    const item = document.createElement('div');
    item.className = `conversation-item ${conversation.id === AppState.currentConversationId ? 'active' : ''}`;
    item.dataset.id = conversation.id;
    item.innerHTML = `
      <i class="fas fa-message"></i>
      <span>${escapeHtml(conversation.title)}</span>
    `;
    item.addEventListener('click', () => selectConversation(conversation.id));
    DOM.conversationsList.appendChild(item);
  });
}

// ====================
// Message Handling
// ====================
function handleInputChange(event) {
  const hasContent = event.target.value.trim().length > 0;
  DOM.sendBtn.disabled = !hasContent;
}

function handleInputKeydown(event) {
  // Send message on Enter (without Shift)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!DOM.sendBtn.disabled) {
      handleSendMessage();
    }
  }
}

function autoResizeTextarea() {
  DOM.messageInput.style.height = 'auto';
  DOM.messageInput.style.height = Math.min(DOM.messageInput.scrollHeight, 200) + 'px';
}

async function handleSendMessage() {
  const content = DOM.messageInput.value.trim();
  
  if (!content || AppState.isLoading) return;
  
  // Clear input
  DOM.messageInput.value = '';
  DOM.messageInput.style.height = 'auto';
  DOM.sendBtn.disabled = true;
  
  // Hide welcome message
  DOM.welcomeMessage.style.display = 'none';
  
  // Create user message
  const userMessage = {
    id: generateId(),
    role: 'user',
    content: content,
    timestamp: new Date().toISOString(),
  };
  
  // Add message to state and render
  AppState.messages.push(userMessage);
  renderMessage(userMessage);
  
  // Save to conversation
  const conversation = AppState.conversations.find(c => c.id === AppState.currentConversationId);
  if (conversation) {
    conversation.messages = AppState.messages;
    conversation.updatedAt = new Date().toISOString();
    
    // Update conversation title if it's the first message
    if (conversation.messages.length === 1) {
      conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
    }
    
    saveConversations();
    renderConversations();
  }
  
  // Send to main process
  await sendMessageToAI(content);
}

async function sendMessageToAI(content) {
  AppState.isLoading = true;
  
  // Show loading indicator
  showLoadingIndicator();
  
  try {
    if (window.electronAPI) {
      await window.electronAPI.send('message:send', {
        content,
        modelId: AppState.selectedModel?.id,
        conversationId: AppState.currentConversationId,
      });
    }
  } catch (error) {
    console.error('[Renderer] Failed to send message:', error);
    hideLoadingIndicator();
    
    // Show error message
    const errorMsg = {
      id: generateId(),
      role: 'assistant',
      content: 'Sorry, an error occurred while processing your request.',
      timestamp: new Date().toISOString(),
      isError: true,
    };
    
    AppState.messages.push(errorMsg);
    renderMessage(errorMsg);
  }
  
  AppState.isLoading = false;
}

function handleModelResponse(response) {
  hideLoadingIndicator();
  
  const assistantMessage = {
    id: response.id || generateId(),
    role: 'assistant',
    content: response.content,
    timestamp: response.timestamp || new Date().toISOString(),
  };
  
  AppState.messages.push(assistantMessage);
  renderMessage(assistantMessage);
  
  // Save to conversation
  const conversation = AppState.conversations.find(c => c.id === AppState.currentConversationId);
  if (conversation) {
    conversation.messages = AppState.messages;
    conversation.updatedAt = new Date().toISOString();
    saveConversations();
  }
}

function handleModelStream(chunk) {
  // Handle streaming response
  const lastMessage = AppState.messages[AppState.messages.length - 1];
  
  if (lastMessage && lastMessage.role === 'assistant') {
    lastMessage.content += chunk.content;
    updateMessageContent(lastMessage);
  } else {
    const message = {
      id: chunk.id || generateId(),
      role: 'assistant',
      content: chunk.content,
      timestamp: chunk.timestamp || new Date().toISOString(),
    };
    AppState.messages.push(message);
    renderMessage(message);
  }
}

function handleModelError(error) {
  hideLoadingIndicator();
  AppState.isLoading = false;
  
  console.error('[Renderer] Model error:', error);
  
  const errorMsg = {
    id: generateId(),
    role: 'assistant',
    content: `Error: ${error.message || 'An error occurred'}`,
    timestamp: new Date().toISOString(),
    isError: true,
  };
  
  AppState.messages.push(errorMsg);
  renderMessage(errorMsg);
}

// ====================
// Message Rendering
// ====================
function renderMessages() {
  DOM.messagesList.innerHTML = '';
  
  if (AppState.messages.length === 0) {
    DOM.welcomeMessage.style.display = 'flex';
    return;
  }
  
  DOM.welcomeMessage.style.display = 'none';
  
  AppState.messages.forEach(message => {
    renderMessage(message);
  });
  
  scrollToBottom();
}

function renderMessage(message) {
  const messageEl = createMessageElement(message);
  DOM.messagesList.appendChild(messageEl);
  scrollToBottom();
}

function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = `message message-${message.role}`;
  div.dataset.id = message.id;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  
  if (message.role === 'user') {
    avatar.innerHTML = '<i class="fas fa-user"></i>';
  } else {
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
  }
  
  const content = document.createElement('div');
  content.className = 'message-content';
  
  if (message.isError) {
    content.classList.add('message-error');
  }
  
  content.innerHTML = formatMessageContent(message.content);
  
  const timestamp = document.createElement('div');
  timestamp.className = 'message-timestamp';
  timestamp.textContent = formatTimestamp(message.timestamp);
  
  div.appendChild(avatar);
  div.appendChild(content);
  div.appendChild(timestamp);
  
  return div;
}

function updateMessageContent(message) {
  const messageEl = DOM.messagesList.querySelector(`[data-id="${message.id}"]`);
  if (messageEl) {
    const contentEl = messageEl.querySelector('.message-content');
    contentEl.innerHTML = formatMessageContent(message.content);
  }
}

function formatMessageContent(content) {
  // Escape HTML
  let formatted = escapeHtml(content);
  
  // Convert URLs to links
  formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  
  // Convert code blocks
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// ====================
// Loading Indicator
// ====================
function showLoadingIndicator() {
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
  
  DOM.messagesList.appendChild(loadingEl);
  scrollToBottom();
}

function hideLoadingIndicator() {
  const loadingEl = document.getElementById('loadingIndicator');
  if (loadingEl) {
    loadingEl.remove();
  }
}

// ====================
// UI Handlers
// ====================
function handleNewChat() {
  createNewConversation();
}

function handleClearChat() {
  if (AppState.messages.length === 0) return;
  
  AppState.messages = [];
  
  const conversation = AppState.conversations.find(c => c.id === AppState.currentConversationId);
  if (conversation) {
    conversation.messages = [];
    conversation.title = 'New Conversation';
    saveConversations();
    renderConversations();
  }
  
  renderMessages();
}

function handleSettings() {
  console.log('[Renderer] Settings clicked');
  // TODO: Implement settings modal
}

function toggleSidebar() {
  DOM.sidebar.classList.toggle('sidebar-open');
}

function handleWindowResize() {
  // Adjust layout for mobile
  if (window.innerWidth < 768) {
    DOM.sidebar.classList.remove('sidebar-open');
  }
}

// ====================
// Utilities
// ====================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  
  // Different year
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function scrollToBottom() {
  DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
}

// ====================
// Initialize
// ====================
document.addEventListener('DOMContentLoaded', initializeApp);
