# GradeGuru Development Guide

This guide provides comprehensive instructions for setting up a development environment, running the application, and following coding standards.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running Development Environment](#running-development-environment)
4. [Project Structure](#project-structure)
5. [Debugging Tips](#debugging-tips)
6. [Coding Standards](#coding-standards)
7. [Building for Production](#building-for-production)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **Operating System** | Windows 10 (64-bit) | Windows 11 |
| **Processor** | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 10 GB free | 50 GB SSD |
| **GPU** | Optional | NVIDIA RTX 3060+ (for local models) |

### Required Software

#### 1. Node.js

GradeGuru requires Node.js 18.x or higher.

**Installation:**

1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer (LTS version recommended)
3. Verify installation:

```powershell
node --version
# Should output: v18.x.x or higher

npm --version
# Should output: 9.x.x or higher
```

#### 2. Git

Required for version control and cloning repositories.

**Installation:**

1. Download Git from [git-scm.com](https://git-scm.com/)
2. Run the installer with default options
3. Verify installation:

```powershell
git --version
# Should output: git version 2.x.x
```

#### 3. Visual Studio Code (Recommended)

While any editor works, VS Code is recommended for Electron development.

**Recommended Extensions:**

- ESLint
- Prettier
- JavaScript (ESLint) 
- Electron

#### 4. Local AI Models (Optional)

For local AI inference, install one of:

- **LM Studio**: Download from [lmstudio.ai](https://lmstudio.ai)
- **Ollama**: Download from [ollama.ai](https://ollama.ai)

---

## Installation

### 1. Clone the Repository

```powershell
# Navigate to your development directory
cd C:\Users\YourName\Projects

# Clone the repository
git clone https://github.com/omniplexity/GradeGuru.git

# Navigate into the project
cd GradeGuru
```

### 2. Install Dependencies

```powershell
# Install all dependencies
npm install

# This will install:
# - electron (v28.0.0)
# - electron-builder (v24.9.0)
# - jest (v29.0.0)
# - eslint (v8.0.0)
```

### 3. Verify Installation

```powershell
# List installed packages
npm ls --depth=0
```

Expected output:

```
gradeguru@2.0.0
├── electron@40.x.x
├── electron-builder@24.9.0
├── eslint@8.0.0
└── jest@29.0.0
```

---

## Running Development Environment

### Development Mode

Start the application in development mode with hot reload:

```powershell
npm run dev
```

This will:

1. Launch the Electron application
2. Open the main window
3. Enable developer tools
4. Watch for file changes and reload automatically

### Understanding the Output

When running `npm run dev`, you'll see:

```
> gradeguru@2.0.0 dev
> electron .

[App] Starting GradeGuru...
[Main] Main process initialized
[Renderer] Loading UI components...
[Main] Window ready, displaying window
```

### Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production executable |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |

---

## Project Structure

Understanding the project structure is essential for effective development.

### Directory Overview

```
GradeGuru/
├── .github/                    # GitHub workflows and templates
├── build/                      # Build resources (icons, etc.)
├── dist/                       # Built application output
├── docs/                       # Documentation
├── node_modules/               # npm dependencies
├── plugins/                    # Plugin directory
│   └── example-plugin/         # Example plugin
├── scripts/                    # Build and utility scripts
├── src/                        # Source code
│   ├── backend/               # Backend services
│   ├── main/                  # Electron main process
│   └── renderer/              # UI (renderer process)
├── tests/                      # Test files
├── .gitignore
├── electron-builder.yml        # Build configuration
├── package.json               # Project metadata
└── README.md
```

### Source Code Structure

```
src/
├── main/
│   ├── main.js                # Application entry point
│   └── preload.js             # Context bridge (IPC)
│
├── renderer/
│   ├── index.html             # HTML entry
│   ├── index.js               # JavaScript entry
│   └── components/            # UI components
│
└── backend/
    └── services/             # Backend services
```

### Key Files

| File | Purpose |
|------|---------|
| [`src/main/main.js`](src/main/main.js) | Electron main process, window management |
| [`src/main/preload.js`](src/main/preload.js) | Secure IPC bridge |
| [`src/renderer/index.html`](src/renderer/index.html) | Main UI HTML |
| [`src/renderer/index.js`](src/renderer/index.js) | UI JavaScript |
| [`package.json`](package.json) | Project configuration |
| [`electron-builder.yml`](electron-builder.yml) | Build configuration |

---

## Debugging Tips

### Using Developer Tools

1. **Open DevTools**: Press `F12` or `Ctrl+Shift+I`
2. **Console Tab**: View logs and errors
3. **Network Tab**: Inspect API requests
4. **Elements Tab**: Inspect DOM elements

### Logging

#### Main Process Logging

Add logging to the main process:

```javascript
// In src/main/main.js
const logger = require('./backend/services/logger');

// Log messages
logger.info('Application started');
logger.error('Failed to connect to provider', { error: err.message });
logger.warn('Using fallback provider');
```

#### Renderer Process Logging

```javascript
// In renderer process
console.log('User clicked button');
console.error('Failed to send message', error);
```

### Common Debugging Scenarios

#### Scenario 1: Application Won't Start

**Symptoms**: Window doesn't appear, no errors

**Debugging Steps**:

1. Check if Node.js and npm are installed
2. Run `npm install` again
3. Check for errors in terminal
4. Try clearing the cache:

```powershell
rm -rf node_modules
npm cache clean --force
npm install
```

#### Scenario 2: IPC Communication Fails

**Symptoms**: UI doesn't respond to actions

**Debugging Steps**:

1. Open DevTools (F12)
2. Check console for errors
3. Verify preload script loads correctly
4. Check if main process is running

```javascript
// Add to preload.js to verify
console.log('Preload script loaded');
console.log('API available:', typeof window.api !== 'undefined');
```

#### Scenario 3: Model Not Connecting

**Symptoms**: "No response from model" errors

**Debugging Steps**:

1. Verify local model server is running
2. Check port availability:
   - LM Studio: `http://localhost:1234`
   - Ollama: `http://localhost:11434`
3. Test with curl:

```powershell
# Test LM Studio
curl http://localhost:1234/v1/models

# Test Ollama
curl http://localhost:11434/api/tags
```

### Debugging Best Practices

1. **Use Incremental Development**
   - Make small changes
   - Test frequently
   - Use version control

2. **Isolate Issues**
   - Test components individually
   - Use console logs strategically
   - Comment out code to isolate problems

3. **Check Error Messages**
   - Read full error stack traces
   - Search error messages online
   - Check GitHub issues

---

## Coding Standards

### JavaScript Style Guide

We follow standard JavaScript conventions with ESLint enforcement.

#### Formatting Rules

| Rule | Standard |
|------|----------|
| **Indentation** | 2 spaces |
| **Line Length** | 100 characters max |
| **Semicolons** | Required |
| **Quotes** | Single quotes for strings |
| **Commas** | Trailing commas allowed |

#### Example Code

```javascript
// Good ✓
const getModelResponse = async (message, model) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, model }),
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get response:', error);
    throw error;
  }
};

// Bad ✗
const getModelResponse = async(message, model) => {
  try{
    const response = await fetch('/api/chat', {
        'method': 'POST',
        'Content-Type': 'application/json'
    },
    JSON.stringify({message, model}))
    return response.json()
  } catch(error) { console.error(error); throw error; }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `modelList` |
| Constants | UPPER_SNAKE_CASE | `MAX_TOKENS`, `DEFAULT_MODEL` |
| Functions | camelCase | `sendMessage()`, `getSettings()` |
| Classes | PascalCase | `ModelRouter`, `PluginManager` |
| Files | kebab-case | `model-router.js`, `plugin-loader.js` |

### Code Organization

#### Main Process Structure

```javascript
// src/main/main.js

// 1. Imports
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 2. Configuration
const CONFIG = {
  windowWidth: 1200,
  windowHeight: 800,
};

// 3. Window management
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: CONFIG.windowWidth,
    height: CONFIG.windowHeight,
  });
  
  mainWindow.loadFile('src/renderer/index.html');
}

// 4. Event handlers
app.whenReady().then(createWindow);

// 5. IPC handlers
ipcMain.handle('model:send', async (event, message) => {
  // Handle message
});
```

#### Renderer Process Structure

```javascript
// src/renderer/index.js

// 1. DOM Elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// 2. Event Listeners
sendButton.addEventListener('click', handleSend);

// 3. Functions
async function handleSend() {
  const message = messageInput.value;
  await window.api.sendMessage(message);
}

// 4. Initialization
function init() {
  console.log('App initialized');
}

init();
```

### Commenting Standards

```javascript
/**
 * Sends a message to the AI model and returns the response.
 * 
 * @param {string} message - The user's message
 * @param {string} model - The model identifier
 * @returns {Promise<Object>} The model's response
 * 
 * @example
 * const response = await sendMessage('Hello AI', 'gpt-4');
 * console.log(response.content);
 */
async function sendMessage(message, model) {
  // Validate input
  if (!message || !model) {
    throw new Error('Message and model are required');
  }
  
  // Send request
  return await window.api.sendMessage(message, model);
}
```

### ESLint Configuration

Our ESLint configuration enforces these rules:

```json
{
  "extends": "eslint:recommended",
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
```

Run linting:

```powershell
npm run lint
```

---

## Building for Production

### Building the Application

Create a production build:

```powershell
npm run build
```

This will:

1. Clean the `dist/` directory
2. Package the application
3. Create Windows executables

### Build Outputs

After building, you'll find:

```
dist/
├── win-unpacked/              # Unpacked application
│   └── GradeGuru Desktop.exe
│
├── GradeGuru-1.0.0 Setup.exe    # NSIS Installer
└── GradeGuru-1.0.0-portable.exe # Portable version
```

### Building for Different Platforms

To build for other platforms, modify `electron-builder.yml`:

```yaml
# Build for Windows only
win:
  target:
    - target: nsis
      arch:
        - x64

# Add macOS (if on macOS)
# mac:
#   target:
#     - target: dmg
#       arch:
#         - x64
#         - arm64
```

---

## Troubleshooting

### Common Issues

#### Issue: "electron" not found

**Solution**:

```powershell
npm install electron --save-dev
```

#### Issue: Application window is blank

**Solution**:

1. Check DevTools for JavaScript errors
2. Verify HTML file path is correct
3. Check file permissions

#### Issue: Slow performance

**Solutions**:

1. Close unnecessary applications
2. Increase available RAM
3. Use production build instead of dev mode

#### Issue: Model connection fails

**Solutions**:

1. Verify model server is running
2. Check firewall settings
3. Verify correct port in settings

### Getting Help

1. Check [GitHub Issues](https://github.com/omniplexity/GradeGuru/issues)
2. Search existing discussions
3. Create a new issue with:
   - Steps to reproduce
   - Error messages
   - System information

---

## Additional Resources

### Documentation Links

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build)
- [Node.js Documentation](https://nodejs.org/docs)

### Learning Resources

- [Electron API Demos](https://github.com/electron/electron-api-demos)
- [Building Electron Apps](https://www.electronjs.org/docs/latest)

---

## Next Steps

Now that you have your development environment set up:

1. [Plugin System Documentation](plugin-system.md) - Learn to create plugins
2. [Model Integration Guide](model-integration.md) - Configure AI providers
3. [Architecture Documentation](architecture.md) - Understand the system
4. [Roadmap](roadmap.md) - See planned features
