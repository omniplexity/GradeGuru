# GradeGuru Plugin System

This document provides comprehensive documentation for the GradeGuru plugin system, including the plugin API, lifecycle management, permissions, and examples for creating new plugins.

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Plugin Lifecycle](#plugin-lifecycle)
4. [Plugin API](#plugin-api)
5. [Plugin Permissions](#plugin-permissions)
6. [Creating a Plugin](#creating-a-plugin)
7. [Example Plugins](#example-plugins)
8. [Plugin Configuration](#plugin-configuration)

---

## Overview

The GradeGuru plugin system allows developers to extend the application's functionality through a modular, secure architecture. Plugins can:

- Add custom AI capabilities
- Integrate with external services
- Provide specialized UI components
- Add new model providers
- Extend the chat interface with custom features

### Plugin System Features

| Feature | Description |
|---------|-------------|
| **Sandboxed Execution** | Plugins run in isolation for security |
| **Lifecycle Management** | Automatic load, enable, disable, and unload |
| **Permission System** | Granular control over system access |
| **Event System** | Subscribe to application events |
| **Command Registration** | Add custom slash commands |

---

## Plugin Architecture

### Directory Structure

```
plugins/
├── example-plugin/           # Plugin directory
│   ├── index.js             # Main plugin file
│   ├── manifest.json         # Plugin metadata
│   ├── package.json          # npm package (optional)
│   ├── README.md            # Plugin documentation
│   └── assets/              # Static assets
│
└── my-custom-plugin/        # Another example
    ├── index.js
    └── manifest.json
```

### Plugin Manifest

Every plugin must have a `manifest.json` file:

```json
{
  "id": "example-plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "description": "A demonstration plugin",
  "author": "Your Name",
  "main": "index.js",
  "permissions": {
    "network": true,
    "filesystem": false,
    "commands": true
  },
  "dependencies": {}
}
```

### Required Manifest Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (kebab-case) |
| `name` | string | Human-readable name |
| `version` | string | Semantic version (x.y.z) |
| `description` | string | Brief description |
| `main` | string | Entry point file |

---

## Plugin Lifecycle

Plugins go through a defined lifecycle managed by the Plugin Manager.

### Lifecycle States

```
┌─────────────────────────────────────────────────────────────┐
│                    PLUGIN LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐                                              │
│   │ DISABLED │  Initial state - not loaded                 │
│   └────┬─────┘                                              │
│        │                                                    │
│        │ enable()                                           │
│        ▼                                                    │
│   ┌──────────┐                                              │
│   │ LOADING  │  Loading plugin files                        │
│   └────┬─────┘                                              │
│        │                                                    │
│        │ onLoad()                                           │
│        ▼                                                    │
│   ┌──────────┐                                              │
│   │  LOADED  │  Files loaded, initializing                 │
│   └────┬─────┘                                              │
│        │                                                    │
│        │ onEnable()                                         │
│        ▼                                                    │
│   ┌──────────┐                                              │
│   │  ACTIVE  │  Fully operational                          │
│   └────┬─────┘                                              │
│        │                                                    │
│        │ onDisable() / onError()                           │
│        ▼                                                    │
│   ┌──────────┐                                              │
│   │ ERROR    │  Failed - requires restart to recover       │
│   └──────────┘                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Lifecycle Hooks

Plugins can define lifecycle hook methods:

```javascript
// plugins/my-plugin/index.js

module.exports = {
  // Called when plugin files are loaded
  onLoad: async (api) => {
    console.log('Plugin loaded, initializing...');
    // Initialize resources
  },
  
  // Called when plugin is enabled (after onLoad)
  onEnable: async (api) => {
    console.log('Plugin enabled');
    // Start services, register handlers
  },
  
  // Called when plugin is disabled
  onDisable: async (api) => {
    console.log('Plugin disabled');
    // Clean up resources
  },
  
  // Called when plugin is being unloaded
  onUnload: async (api) => {
    console.log('Plugin unloading');
    // Final cleanup
  }
};
```

---

## Plugin API

The Plugin API is the interface through which plugins interact with the application.

### API Object

When lifecycle hooks are called, an `api` object is passed:

```javascript
{
  // Plugin identification
  plugin: {
    id: 'my-plugin',
    version: '1.0.0',
    name: 'My Plugin'
  },
  
  // Core functionality
  registerCommand: Function,
  registerEventHandler: Function,
  addUIComponent: Function,
  
  // Data access
  getSettings: Function,
  setSettings: Function,
  getConversation: Function,
  
  // External access
  fetch: Function,
  
  // Logging
  logger: {
    info: Function,
    warn: Function,
    error: Function,
    debug: Function
  }
}
```

### API Reference

#### registerCommand

Register a slash command that users can invoke in the chat.

```javascript
api.registerCommand({
  name: 'weather',
  description: 'Get weather for a location',
  usage: '/weather <city>',
  handler: async (args, context) => {
    const city = args.join(' ');
    const response = await api.fetch(
      `https://api.weather.com/v3/wx?city=${encodeURIComponent(city)}`
    );
    return `Weather in ${city}: ${response.temp}°F`;
  }
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Command name (without /) |
| `description` | string | Help text |
| `usage` | string | Usage example |
| `handler` | function | Command handler |

**Handler Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `args` | array | Command arguments |
| `context` | object | Chat context |

#### registerEventHandler

Subscribe to application events.

```javascript
api.registerEventHandler({
  event: 'message:received',
  handler: async (event) => {
    // Process incoming message
    console.log('New message:', event.message);
  }
});
```

**Available Events:**

| Event | Description | Data |
|-------|-------------|------|
| `message:sent` | User sent a message | `{ message }` |
| `message:received` | AI responded | `{ message }` |
| `model:changed` | Model was switched | `{ model }` |
| `conversation:start` | New conversation | `{ id }` |
| `conversation:end` | Conversation closed | `{ id }` |
| `settings:changed` | Settings updated | `{ settings }` |

#### addUIComponent

Add a custom UI component to the interface.

```javascript
api.addUIComponent({
  id: 'my-custom-panel',
  position: 'sidebar', // 'sidebar', 'header', 'message'
  render: (container) => {
    // Create and append DOM elements
    const div = document.createElement('div');
    div.innerHTML = '<h3>My Plugin</h3><p>Custom content</p>';
    container.appendChild(div);
  }
});
```

**Positions:**

| Position | Description |
|----------|-------------|
| `sidebar` | Left sidebar panel |
| `header` | Top header area |
| `message` | Inside message bubble |
| `settings` | Settings panel tab |

#### getSettings / setSettings

Access plugin-specific settings.

```javascript
// Get setting
const apiKey = await api.getSettings('apiKey');

// Set setting
await api.setSettings({
  apiKey: 'sk-xxx',
  theme: 'dark'
});
```

#### fetch

Make HTTP requests (requires network permission).

```javascript
const response = await api.fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({ query: 'test' })
});

const data = await response.json();
```

### Logger

Built-in logging for debugging.

```javascript
api.logger.info('Plugin started');
api.logger.warn('Rate limit approaching');
api.logger.error('Request failed', error);
api.logger.debug('Payload:', payload);
```

---

## Plugin Permissions

The permission system controls what resources plugins can access.

### Permission Types

| Permission | Description | Default |
|------------|-------------|---------|
| `network` | Make HTTP/HTTPS requests | `false` |
| `filesystem` | Read/write local files | `false` |
| `commands` | Register slash commands | `true` |
| `events` | Subscribe to events | `true` |
| `ui` | Add UI components | `true` |
| `settings` | Access app settings | `false` |
| `conversation` | Read conversation history | `false` |

### Declaring Permissions

In `manifest.json`:

```json
{
  "id": "my-plugin",
  "permissions": {
    "network": true,
    "commands": true,
    "events": true,
    "filesystem": false,
    "settings": false
  }
}
```

### Permission Enforcement

If a plugin attempts an action without permission:

```javascript
// Without network permission
await api.fetch('https://api.example.com');
// Throws: PermissionError: Network access not granted

// Without filesystem permission
await api.readFile('/path/to/file');
// Throws: PermissionError: Filesystem access not granted
```

---

## Creating a Plugin

### Step-by-Step Guide

#### 1. Create Plugin Directory

```powershell
mkdir plugins/my-awesome-plugin
cd plugins/my-awesome-plugin
```

#### 2. Create Manifest

```json
// plugins/my-awesome-plugin/manifest.json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does awesome things",
  "author": "Your Name",
  "main": "index.js",
  "permissions": {
    "network": true,
    "commands": true,
    "events": true
  }
}
```

#### 3. Create Main Plugin File

```javascript
// plugins/my-awesome-plugin/index.js

module.exports = {
  // Plugin metadata
  name: 'my-awesome-plugin',
  version: '1.0.0',
  
  // Lifecycle hooks
  onLoad: async (api) => {
    api.logger.info('My Awesome Plugin loaded');
  },
  
  onEnable: async (api) => {
    // Register a command
    api.registerCommand({
      name: 'hello',
      description: 'Says hello',
      usage: '/hello [name]',
      handler: async (args) => {
        const name = args[0] || 'World';
        return `Hello, ${name}! 👋`;
      }
    });
    
    // Subscribe to messages
    api.registerEventHandler({
      event: 'message:received',
      handler: async (event) => {
        api.logger.debug('AI responded:', event.message.content);
      }
    });
    
    api.logger.info('My Awesome Plugin enabled');
  },
  
  onDisable: async (api) => {
    api.logger.info('My Awesome Plugin disabled');
  }
};
```

#### 4. Test Your Plugin

1. Restart the application
2. Check the plugin is listed in settings
3. Enable the plugin
4. Try the `/hello` command

---

## Example Plugins

### Example 1: Simple Greeting Plugin

A minimal plugin that responds to a slash command.

```javascript
// plugins/greeting/index.js
module.exports = {
  name: 'greeting',
  version: '1.0.0',
  
  onLoad: async (api) => {
    api.logger.info('Greeting plugin loaded');
  },
  
  onEnable: async (api) => {
    api.registerCommand({
      name: 'greet',
      description: 'Greets the user',
      usage: '/greet [name]',
      handler: async (args) => {
        const hour = new Date().getHours();
        let greeting = 'Hello';
        
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        const name = args[0] || 'there';
        return `${greeting}, ${name}!`;
      }
    });
  }
};
```

**Manifest:**

```json
{
  "id": "greeting",
  "name": "Greeting Plugin",
  "version": "1.0.0",
  "description": "Adds greeting commands",
  "main": "index.js",
  "permissions": {
    "commands": true
  }
}
```

### Example 2: External API Plugin

A plugin that fetches data from an external API.

```javascript
// plugins/weather/index.js
module.exports = {
  name: 'weather',
  version: '1.0.0',
  
  async onLoad(api) {
    api.logger.info('Weather plugin loaded');
  },
  
  async onEnable(api) {
    // Register weather command
    api.registerCommand({
      name: 'weather',
      description: 'Get weather for a city',
      usage: '/weather <city>',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Please specify a city: /weather <city>';
        }
        
        const city = args.join(' ');
        
        try {
          const response = await api.fetch(
            `https://api.open-meteo.com/v1/forecast?city=${encodeURIComponent(city)}&current_weather=true`
          );
          
          if (!response.ok) {
            return `Could not find weather for "${city}"`;
          }
          
          const data = await response.json();
          const weather = data.current_weather;
          
          return `Weather in ${city}: ${weather.temperature}°C, wind ${weather.windspeed} km/h`;
        } catch (error) {
          api.logger.error('Weather fetch failed', error);
          return 'Failed to fetch weather data';
        }
      }
    });
  }
};
```

**Manifest:**

```json
{
  "id": "weather",
  "name": "Weather Plugin",
  "version": "1.0.0",
  "description": "Get weather information",
  "main": "index.js",
  "permissions": {
    "commands": true,
    "network": true
  }
}
```

### Example 3: Message Processor Plugin

A plugin that processes every message.

```javascript
// plugins/message-processor/index.js
module.exports = {
  name: 'message-processor',
  version: '1.0.0',
  
  async onLoad(api) {
    this.api = api;
  },
  
  async onEnable(api) {
    // Process user messages before sending
    api.registerEventHandler({
      event: 'message:sent',
      handler: async (event) => {
        const message = event.message;
        
        // Add word count
        const wordCount = message.content.split(/\s+/).length;
        api.logger.debug(`User message: ${wordCount} words`);
        
        // Modify message (example: add emphasis)
        if (message.content.includes('!')) {
          message.content = message.content.replace(/!/g, '!!');
        }
      }
    });
    
    // Process AI responses
    api.registerEventHandler({
      event: 'message:received',
      handler: async (event) => {
        const message = event.message;
        
        // Log response length
        api.logger.info(`AI response: ${message.content.length} characters`);
      }
    });
  }
};
```

**Manifest:**

```json
{
  "id": "message-processor",
  "name": "Message Processor",
  "version": "1.0.0",
  "description": "Process chat messages",
  "main": "index.js",
  "permissions": {
    "events": true
  }
}
```

### Example 4: Settings-Backed Plugin

A plugin that persists user configuration.

```javascript
// plugins/custom-model/index.js
module.exports = {
  name: 'custom-model',
  version: '1.0.0',
  
  async onLoad(api) {
    this.api = api;
  },
  
  async onEnable(api) {
    // Initialize default settings
    const current = await api.getSettings();
    if (!current.endpoint) {
      await api.setSettings({
        endpoint: 'http://localhost:8080',
        modelName: 'custom-model',
        temperature: 0.7
      });
    }
    
    // Register settings UI
    api.addUIComponent({
      id: 'custom-model-settings',
      position: 'settings',
      render: (container) => {
        const div = document.createElement('div');
        div.innerHTML = `
          <h3>Custom Model Settings</h3>
          <label>Endpoint: <input type="text" id="endpoint" /></label>
          <label>Model: <input type="text" id="model" /></label>
        `;
        container.appendChild(div);
      }
    });
    
    api.registerCommand({
      name: 'model-info',
      description: 'Show current model info',
      handler: async () => {
        const settings = await api.getSettings();
        return `Model: ${settings.modelName}\nEndpoint: ${settings.endpoint}`;
      }
    });
  }
};
```

**Manifest:**

```json
{
  "id": "custom-model",
  "name": "Custom Model",
  "version": "1.0.0",
  "description": "Custom model integration",
  "main": "index.js",
  "permissions": {
    "commands": true,
    "settings": true,
    "ui": true
  }
}
```

---

## Plugin Configuration

### Enabling/Disabling Plugins

1. Open Settings (gear icon)
2. Navigate to Plugins section
3. Toggle plugin enabled/disabled
4. Restart required for some changes

### Plugin Data Storage

Plugins can store data in:

```javascript
// Local storage (key-value)
await api.setSettings({ key: 'value' });
const value = await api.getSettings('key');

// Full settings object
const allSettings = await api.getSettings();
```

### Distributing Plugins

To share your plugin:

1. Create a GitHub repository
2. Include:
   - `manifest.json`
   - `index.js` (or main entry point)
   - `README.md`
3. Document installation instructions
4. Submit to plugin registry (future feature)

---

## Best Practices

### Security

- ✅ Request minimum permissions needed
- ✅ Validate all user input
- ✅ Sanitize data from external sources
- ❌ Don't expose API keys in code
- ❌ Don't make requests to untrusted domains

### Performance

- ✅ Cache expensive operations
- ✅ Use async/await properly
- ✅ Clean up resources on disable
- ❌ Don't block the main thread
- ❌ Don't make excessive API calls

### User Experience

- ✅ Provide clear command descriptions
- ✅ Handle errors gracefully
- ✅ Log important events
- ❌ Don't spam the user
- ❌ Don't make assumptions about input

---

## Troubleshooting

### Plugin Not Loading

1. Check `manifest.json` is valid JSON
2. Verify `main` file exists
3. Check console for errors
4. Ensure all required fields present

### Permission Denied

1. Update `manifest.json` with required permissions
2. Rebuild or restart the application
3. Check permission is supported

### Command Not Working

1. Verify command is registered in `onEnable`
2. Check command name doesn't conflict
3. Ensure handler returns a string

---

## Future Features

Planned plugin system enhancements:

- **Plugin Marketplace**: Browse and install plugins
- **Plugin Dependencies**: Support plugin-to-plugin dependencies
- **Advanced Permissions**: Granular permission controls
- **Plugin Templates**: Scaffolding for new plugins
- **Plugin Testing Framework**: Built-in testing utilities

---

## Related Documentation

- [Architecture Overview](architecture.md)
- [Model Integration](model-integration.md)
- [Development Guide](development-guide.md)
