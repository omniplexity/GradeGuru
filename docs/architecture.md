# OmniAI Desktop Architecture

This document provides a comprehensive overview of the OmniAI Desktop system architecture, including the UI layer, backend model routing, plugin architecture, and execution models.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [UI Layer (Renderer Process)](#ui-layer-renderer-process)
3. [Backend Model Routing](#backend-model-routing)
4. [Plugin Architecture](#plugin-architecture)
5. [Local vs Remote Model Execution](#local-vs-remote-model-execution)
6. [Data Flow](#data-flow)
7. [Component Diagram](#component-diagram)

---

## System Architecture Overview

OmniAI Desktop is built on Electron, a framework that allows building cross-platform desktop applications using web technologies. The application follows a **multi-process architecture** with distinct responsibilities for each layer.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         OMNIAI DESKTOP                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────┐    ┌──────────────────────────┐     │
│  │     RENDERER PROCESS          │    │     MAIN PROCESS         │     │
│  │                              │    │                          │     │
│  │  ┌────────────────────────┐  │    │  ┌────────────────────┐  │     │
│  │  │    UI Components       │  │    │  │   Window Manager   │  │     │
│  │  │  (React/HTML/CSS)      │  │    │  │                    │  │     │
│  │  └────────────────────────┘  │    │  └────────────────────┘  │     │
│  │              │               │    │            │             │     │
│  │  ┌────────────────────────┐  │    │  ┌────────────────────┐  │     │
│  │  │   State Management    │  │    │  │  Model Router      │  │     │
│  │  │   (Context/Redux)     │  │◄───┼──│                    │  │     │
│  │  └────────────────────────┘  │    │  └────────────────────┘  │     │
│  │              │               │    │            │             │     │
│  │  ┌────────────────────────┐  │    │  ┌────────────────────┐  │     │
│  │  │   IPC Bridge          │  │◄───┼──│  Plugin Manager    │  │     │
│  │  │   (contextBridge)     │  │    │  │                    │  │     │
│  │  └────────────────────────┘  │    │  └────────────────────┘  │     │
│  │                              │    │            │             │     │
│  └──────────────────────────────┘    │  ┌────────────────────┐  │     │
│                                       │  │  Settings Manager │  │     │
│                                       │  │                    │  │     │
│                                       │  └────────────────────┘  │     │
│                                       │                          │     │
│                                       └──────────────────────────┘     │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                                   │
│                                                                        │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────┐  │
│  │  LM Studio │   │   Ollama    │   │   OpenAI    │   │ Custom   │  │
│  │  (Local)   │   │   (Local)   │   │   (Remote)  │   │   API    │  │
│  │  :1234     │   │  :11434     │   │ api.openai  │   │          │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └──────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Process Model

| Process | Responsibility | Technology |
|---------|----------------|------------|
| **Main Process** | Window management, IPC handling, model routing, plugin lifecycle | Node.js |
| **Renderer Process** | UI rendering, user interaction, state management | React + Web APIs |
| **GPU Process** | Hardware acceleration for UI rendering | Chromium |

---

## UI Layer (Renderer Process)

The renderer process handles all user-facing functionality, providing a modern, responsive interface built with web technologies.

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RENDERER PROCESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    App Shell                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │    │
│  │  │   Header    │  │   Sidebar   │  │  Main Area  │    │    │
│  │  │             │  │             │  │             │    │    │
│  │  │ • Title     │  │ • Model     │  │ • Chat      │    │    │
│  │  │ • Controls  │  │   Selector  │  │   View      │    │    │
│  │  │ • Status    │  │ • Plugins   │  │ • Settings  │    │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   State Layer                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │   Chat      │  │   Settings  │  │   Plugin   │     │    │
│  │  │   State     │  │   State     │  │   State    │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   IPC Bridge Layer                       │    │
│  │         (Preload Script via contextBridge)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key UI Components

| Component | Description | Location |
|-----------|-------------|----------|
| **ChatView** | Main conversation interface | `src/renderer/components/` |
| **MessageBubble** | Individual message display | `src/renderer/components/` |
| **ModelSelector** | Dropdown for model selection | `src/renderer/components/` |
| **SettingsPanel** | Configuration interface | `src/renderer/components/` |
| **PluginManager** | Plugin enable/disable UI | `src/renderer/components/` |

### State Management

The renderer process uses React Context for state management:

```javascript
// Example: Chat Context Structure
const ChatContext = {
  messages: [
    {
      id: 'msg_001',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: Date.now()
    },
    {
      id: 'msg_002',
      role: 'assistant',
      content: 'Hello! How can I help?',
      timestamp: Date.now()
    }
  ],
  currentModel: 'ollama-llama2',
  isStreaming: false,
  addMessage: (message) => { /* ... */ },
  clearConversation: () => { /* ... */ }
};
```

### IPC Communication

The renderer communicates with the main process through a secure IPC bridge:

```javascript
// In preload script (contextBridge)
contextBridge.exposeInMainWorld('api', {
  // Model operations
  sendMessage: (message, model) => 
    ipcRenderer.invoke('model:send', message, model),
  
  // Settings
  getSettings: () => 
    ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => 
    ipcRenderer.invoke('settings:save', settings),
  
  // Plugins
  getPlugins: () => 
    ipcRenderer.invoke('plugins:list'),
  togglePlugin: (pluginId, enabled) => 
    ipcRenderer.invoke('plugins:toggle', pluginId, enabled)
});
```

---

## Backend Model Routing

The Model Router is the core backend component that intelligently routes AI requests to appropriate providers based on configuration, model availability, and task requirements.

### Model Router Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODEL ROUTER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Router Engine                          │    │
│  │                                                          │    │
│  │   Input: { message, preferredModel, options }           │    │
│  │                      │                                   │    │
│  │              ┌───────┴───────┐                          │    │
│  │              │  Model        │                          │    │
│  │              │  Selection    │                          │    │
│  │              │  Strategy     │                          │    │
│  │              └───────┬───────┘                          │    │
│  │                      │                                   │    │
│  │              ┌───────┴───────┐                          │    │
│  │              │  Provider     │                          │    │
│  │              │  Adapter      │                          │    │
│  │              └───────┬───────┘                          │    │
│  │                      │                                   │    │
│  │   Output: { response, model, tokens }                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  LM Studio │  │   Ollama   │  │  OpenAI    │  │  Custom  │  │
│  │  Adapter   │  │   Adapter  │  │   Adapter  │  │   API    │  │
│  │            │  │            │  │            │  │  Adapter │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Supported Providers

| Provider | Type | Default Port/API | Protocol |
|----------|------|------------------|----------|
| **LM Studio** | Local | `http://localhost:1234` | REST (OpenAI-compatible) |
| **Ollama** | Local | `http://localhost:11434` | REST (OpenAI-compatible) |
| **OpenAI** | Remote | `api.openai.com/v1` | HTTPS/REST |
| **Custom API** | Both | Configurable | REST |

### Provider Selection Logic

```javascript
// Simplified model selection algorithm
class ModelRouter {
  selectProvider(request) {
    const { preferredModel, fallbackEnabled } = request;
    
    // 1. Check preferred model availability
    if (this.isProviderAvailable(preferredModel)) {
      return this.getProviderAdapter(preferredModel);
    }
    
    // 2. Fallback to default provider
    if (fallbackEnabled && this.defaultProvider) {
      return this.defaultProvider;
    }
    
    // 3. Find any available provider
    const available = this.findAvailableProviders();
    if (available.length > 0) {
      return available[0];
    }
    
    throw new Error('No available AI providers');
  }
  
  async sendRequest(request) {
    const provider = this.selectProvider(request);
    const adapter = this.getProviderAdapter(provider);
    
    return await adapter.send(request);
  }
}
```

### API Request Format

All providers use an OpenAI-compatible request format:

```javascript
// Standard request format
{
  model: "llama2",           // Model identifier
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant."
    },
    {
      role: "user", 
      content: "What is the capital of France?"
    }
  ],
  temperature: 0.7,          // Sampling temperature (0-2)
  max_tokens: 2048,         // Maximum tokens to generate
  stream: false             // Enable streaming responses
}
```

---

## Plugin Architecture

The plugin system allows extending OmniAI Desktop with custom functionality. Plugins run in a sandboxed environment within the main process.

### Plugin System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLUGIN SYSTEM                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Plugin Manager                         │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │    │
│  │  │  Loader   │  │  Registry │  │ Lifecycle │           │    │
│  │  │           │  │           │  │  Manager  │           │    │
│  │  └───────────┘  └───────────┘  └───────────┘           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Plugin Sandbox                         │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              Plugin Container                    │   │    │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │   │    │
│  │  │  │ Plugin  │  │ Plugin  │  │ Plugin  │          │   │    │
│  │  │  │    A    │  │    B    │  │    C    │          │   │    │
│  │  │  │         │  │         │  │         │          │   │    │
│  │  │  └─────────┘  └─────────┘  └─────────┘          │   │    │
│  │  │      │            │            │                │   │    │
│  │  │      └────────────┴────────────┘                │   │    │
│  │  │                   │                             │   │    │
│  │  │            ┌──────┴──────┐                     │   │    │
│  │  │            │ Plugin API  │                     │   │    │
│  │  │            │   Bridge    │                     │   │    │
│  │  │            └─────────────┘                     │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Permission System                      │    │
│  │  • Network Access    • File System    • Process Access │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLUGIN LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐                                                  │
│   │ DISABLED │                                                  │
│   └────┬─────┘                                                  │
│        │ enable                                                 │
│        ▼                                                        │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │  LOADING │ ──► │  LOADED  │ ──► │ ACTIVE   │              │
│   └──────────┘     └────┬─────┘     └────┬─────┘              │
│                         │                │                      │
│                         │ disable        │ error                │
│                         │                ▼                      │
│                         │          ┌──────────┐                 │
│                         └─────────►│  ERROR   │                 │
│                                    └──────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin API

Plugins have access to a limited API for security:

```javascript
// Available to plugins
const pluginAPI = {
  // Register commands
  registerCommand: (command) => { /* ... */ },
  
  // Hook into message processing
  onMessage: (handler) => { /* ... */ },
  
  // Access settings
  getSetting: (key) => { /* ... */ },
  
  // Make HTTP requests (if permitted)
  fetch: (url, options) => { /* ... */ },
  
  // Logging
  logger: {
    info: (msg) => { /* ... */ },
    warn: (msg) => { /* ... */ },
    error: (msg) => { /* ... */ }
  }
};
```

---

## Local vs Remote Model Execution

OmniAI Desktop supports both local and remote model execution, each with distinct characteristics and use cases.

### Local Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL EXECUTION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   OMNIAI DESKTOP                    LOCAL MODEL SERVER          │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │                 │    HTTP      │                 │          │
│  │  Model Router   │◄────────────►│  LM Studio      │          │
│  │                 │   (REST)     │  or Ollama      │          │
│  └─────────────────┘              └─────────────────┘          │
│                                          │                      │
│                                          ▼                      │
│                                  ┌─────────────────┐          │
│                                  │   GGUF/GGML     │          │
│                                  │   Model Files   │          │
│                                  │  (downloaded)   │          │
│                                  └─────────────────┘          │
│                                                                 │
│  Advantages:                    Disadvantages:                  │
│  • Privacy (data stays local)  • Requires GPU/hardware         │
│  • No internet needed          • Limited model size             │
│  • No API costs                • Initial download time          │
│  • Instant response            • Manual model management        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Remote Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                     REMOTE EXECUTION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   OMNIAI DESKTOP                    REMOTE API                 │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │                 │    HTTPS     │                 │          │
│  │  Model Router   │◄────────────►│  OpenAI API     │          │
│  │                 │   (REST)     │  or Custom      │          │
│  └─────────────────┘              └─────────────────┘          │
│                                             │                    │
│                                             ▼                    │
│                                    ┌─────────────────┐          │
│                                    │   GPT-4/Claude  │          │
│                                    │   or Custom     │          │
│                                    │   Models        │          │
│                                    └─────────────────┘          │
│                                                                 │
│  Advantages:                    Disadvantages:                  │
│  • Access to powerful models    • Internet required             │
│  • No local hardware needed      • API costs                    │
│  • Always up-to-date            • Privacy concerns              │
│  • Easy scaling                 • Potential latency             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Execution Decision Matrix

| Factor | Local | Remote |
|--------|-------|--------|
| **Privacy** | ✅ Maximum | ⚠️ Data sent to API |
| **Cost** | ✅ One-time hardware | ⚠️ Per-request cost |
| **Speed** | ✅ Low latency | ⚠️ Network dependent |
| **Availability** | ✅ Offline capable | ❌ Internet required |
| **Model Power** | ⚠️ Limited by hardware | ✅ SOTA models |
| **Setup** | ⚠️ Manual configuration | ✅ Quick start |

---

## Data Flow

### Message Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User Input                                                  │
│     ┌─────────────────┐                                         │
│     │ "Write a hello │                                         │
│     │  world in      │                                         │
│     │  Python"       │                                         │
│     └────────┬────────┘                                         │
│              │                                                  │
│              ▼                                                  │
│  2. Renderer Process                                           │
│     ┌─────────────────────────────────────────┐                │
│     │ Validate & Format Message                │                │
│     │ Add to conversation state               │                │
│     │ Emit via IPC to Main Process            │                │
│     └────────┬────────────────────────────────┘                │
│              │ IPC 'model:send'                                 │
│              ▼                                                  │
│  3. Main Process                                               │
│     ┌─────────────────────────────────────────┐                │
│     │ Model Router receives request           │                │
│     │ Selects provider (local/remote)         │                │
│     │ Formats request for provider            │                │
│     └────────┬────────────────────────────────┘                │
│              │                                                  │
│              ▼                                                  │
│  4. Provider Adapter                                           │
│     ┌─────────────────────────────────────────┐                │
│     │ HTTP POST to Provider                   │                │
│     │ • localhost:1234 (LM Studio)           │                │
│     │ • localhost:11434 (Ollama)              │                │
│     │ • api.openai.com (OpenAI)              │                │
│     └────────┬────────────────────────────────┘                │
│              │                                                  │
│              ▼                                                  │
│  5. Response Processing                                         │
│     ┌─────────────────────────────────────────┐                │
│     │ Parse response                          │                │
│     │ Extract content & metadata              │                │
│     │ Return to Main Process                  │                │
│     └────────┬────────────────────────────────┘                │
│              │ IPC response                                      │
│              ▼                                                  │
│  6. Renderer Process                                           │
│     ┌─────────────────────────────────────────┐                │
│     │ Update conversation state               │                │
│     │ Render new message                      │                │
│     │ Scroll to bottom                        │                │
│     └─────────────────────────────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Directory Structure

```
src/
├── main/
│   ├── main.js              # Application entry point
│   ├── preload.js           # Context bridge setup
│   ├── model-router/
│   │   ├── index.js         # Router main module
│   │   ├── providers/       # Provider adapters
│   │   │   ├── lmstudio.js
│   │   │   ├── ollama.js
│   │   │   ├── openai.js
│   │   │   └── custom.js
│   │   └── strategies/      # Selection strategies
│   └── plugins/
│       ├── manager.js       # Plugin lifecycle
│       ├── loader.js        # Plugin discovery
│       └── sandbox.js       # Security sandbox
│
├── renderer/
│   ├── index.html           # Main HTML entry
│   ├── index.js            # Renderer entry
│   ├── components/         # React components
│   │   ├── ChatView.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── ModelSelector.jsx
│   │   └── SettingsPanel.jsx
│   ├── contexts/           # React contexts
│   │   ├── ChatContext.jsx
│   │   └── SettingsContext.jsx
│   └── styles/             # CSS/styling
│
└── backend/
    └── services/           # Backend services
        ├── settings.js
        └── logger.js
```

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODULE DEPENDENCIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   main.js                                                       │
│   ├── WindowManager                                            │
│   ├── ModelRouter                                              │
│   │   └── ProviderAdapters                                     │
│   ├── PluginManager                                            │
│   │   ├── PluginLoader                                         │
│   │   └── PluginSandbox                                        │
│   └── SettingsManager                                          │
│                                                                 │
│   preload.js                                                   │
│   └── contextBridge (exposes API to renderer)                  │
│                                                                 │
│   renderer/index.js                                            │
│   ├── ChatContext                                              │
│   ├── SettingsContext                                          │
│   └── Components                                               │
│       ├── ChatView                                             │
│       ├── MessageBubble                                        │
│       ├── ModelSelector                                        │
│       └── SettingsPanel                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### IPC Security

- All IPC communication uses `contextBridge` to expose a limited API
- No direct Node.js access from renderer process
- Input validation on all IPC handlers

### Plugin Sandboxing

- Plugins run in isolated contexts
- Limited API surface
- Permission-based access control
- Resource quotas to prevent abuse

### Data Privacy

- Local models keep data on the user's machine
- No telemetry or data collection
- User data stored locally only
- Secure credential storage for API keys

---

## Performance Optimization

### Rendering Optimization

- Virtual scrolling for long conversations
- Lazy loading of components
- Memoization of expensive computations

### Network Optimization

- Connection pooling for API requests
- Request batching where supported
- Automatic retry with exponential backoff

### Memory Management

- Message history limits
- Streaming responses to reduce memory
- Garbage collection of unused models

---

## Next Steps

- [Plugin System Documentation](plugin-system.md) - Learn how to create plugins
- [Model Integration Guide](model-integration.md) - Configure AI providers
- [Development Guide](development-guide.md) - Set up development environment
- [Roadmap](roadmap.md) - See planned features
