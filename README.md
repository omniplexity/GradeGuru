# GradeGuru

<p align="center">
  <img src="build/icon.png" alt="GradeGuru Logo" width="128" height="128" />
</p>

<p align="center">
  <a href="https://github.com/your-org/gradeguru/releases">
    <img src="https://img.shields.io/github/v/release/your-org/gradeguru" alt="Latest Release" />
  </a>
  <a href="https://github.com/your-org/gradeguru/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/your-org/gradeguru" alt="License" />
  </a>
  <a href="https://github.com/your-org/gradeguru/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/your-org/gradeguru/main.yml" alt="Build Status" />
  </a>
</p>

## Overview

GradeGuru is a desktop AI assistant application that provides a unified interface for interacting with multiple AI models. Similar to ChatGPT's desktop application, GradeGuru brings the power of artificial intelligence directly to your desktop with support for both local and remote inference engines.

### Key Features

- **Multi-Model Support**: Connect to various AI models including LM Studio, Ollama, OpenAI, and custom inference engines
- **Plugin System**: Extend functionality with a powerful plugin architecture
- **Local Processing**: Run AI models locally for privacy and offline capability
- **Modern UI**: Clean, intuitive interface built with Electron
- **Model Routing**: Intelligent routing between different AI providers based on task requirements

## Screenshots

> **Note**: Replace these placeholders with actual screenshots of the application.

### Main Chat Interface
```
┌─────────────────────────────────────────────────────────────┐
│  GradeGuru                                    ─ □ ✕  │
├─────────────────────────────────────────────────────────────┤
│  [Model: GPT-4 ▼]                          [⚙️ Settings]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 Hello! How can I help you today?                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 I need help writing a Python function            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 Of course! I'd be happy to help you with that.   │   │
│  │     Could you tell me what the function should do? │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [📎] [Type your message...]                    [Send ➤]  │
└─────────────────────────────────────────────────────────────┘
```

### Settings Panel
```
┌─────────────────────────────────────────────────────────────┐
│                    Settings                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Model Providers                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ OpenAI                              [Configure]   │   │
│  │ ○ LM Studio (Local)                    [Configure]  │   │
│  │ ● Ollama (Local)                       [Configure]  │   │
│  │ ○ Custom API                              [Configure]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Plugin Management                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enabled Plugins                                     │   │
│  │ ☑ Code Helper                                      │   │
│  │ ☑ Document Generator                               │   │
│  │ ☐ Data Analyzer                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Save Settings]                              [Cancel]    │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Overview

GradeGuru follows a modern desktop application architecture built on Electron. The application is divided into three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   UI Layer                          │    │
│  │  • React Components                                 │    │
│  │  • State Management                                 │    │
│  │  • User Interaction Handler                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │ IPC
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS                           │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Model Router    │  │  Plugin Manager  │                │
│  │                  │  │                  │                │
│  │  • LM Studio     │  │  • Lifecycle     │                │
│  │  • Ollama        │  │  • Permissions   │                │
│  │  • OpenAI        │  │  • Sandboxing    │                │
│  │  • Custom APIs   │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  LM Studio  │  │   Ollama    │  │  OpenAI     │         │
│  │  (Local)    │  │   (Local)   │  │  (Remote)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Description |
|-----------|-------------|
| **Renderer Process** | Handles the UI and user interactions using modern web technologies |
| **Main Process** | Manages backend services, model routing, and plugin lifecycle |
| **Model Router** | Routes AI requests to appropriate providers based on configuration |
| **Plugin Manager** | Handles plugin loading, lifecycle, and permission management |

For detailed architecture information, see [Architecture Documentation](docs/architecture.md).

## Installation

### Prerequisites

Before installing GradeGuru, ensure you have the following:

- **Operating System**: Windows 10/11 (64-bit)
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: For cloning the repository

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/gradeguru.git
   cd gradeguru
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run in Development Mode**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

### Pre-built Releases

Download pre-built executables from the [Releases Page](https://github.com/your-org/gradeguru/releases):

- **NSIS Installer**: `GradeGuru-Setup-x.x.x.exe`
- **Portable Version**: `GradeGuru-x.x.x-portable.exe`

## Development Setup

### Setting Up Your Development Environment

For detailed development setup instructions, see the [Development Guide](docs/development-guide.md).

#### Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] At least 8GB RAM (16GB recommended for local models)

#### Local Model Setup

To run AI models locally, you'll need to install one of the following:

- **LM Studio**: Download from [lmstudio.ai](https://lmstudio.ai)
- **Ollama**: Download from [ollama.ai](https://ollama.ai)

### Running Development Server

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## Plugin Overview

GradeGuru features a powerful plugin system that allows developers to extend functionality. Plugins can:

- Add custom AI capabilities
- Integrate with external services
- Provide specialized UI components
- Add new model providers

### Available Plugins

| Plugin | Description |
|--------|-------------|
| [example-plugin](plugins/example-plugin/) | Sample plugin demonstrating the plugin API |

### Creating Your Own Plugin

For detailed information about creating plugins, see the [Plugin System Documentation](docs/plugin-system.md).

#### Quick Plugin Example

```javascript
// my-plugin/index.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Plugin initialization
  onLoad: async (api) => {
    console.log('Plugin loaded!');
  },
  
  // Register custom commands
  commands: [
    {
      name: 'greet',
      description: 'Greets the user',
      execute: async (args) => {
        return `Hello, ${args.name || 'World'}!`;
      }
    }
  ]
};
```

## Contribution Guidelines

We welcome contributions from the community! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use consistent formatting (ESLint configured)
- Write meaningful commit messages
- Include tests for new features
- Update documentation accordingly

### Reporting Issues

When reporting issues, please include:

- Detailed description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)

### Feature Requests

We'd love to hear your ideas! Please open an issue with:

- Clear description of the feature
- Use cases
- Potential implementation approaches

## Roadmap

GradeGuru is developed in phases. For detailed roadmap information, see [Roadmap Documentation](docs/roadmap.md).

### Current Phase: Phase 1 — Core Desktop Client

- ✅ Basic chat interface
- ⏳ Model integration (LM Studio, Ollama, OpenAI)
- ⏳ Settings management

### Upcoming Features

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 2 | Plugin System | Planned |
| Phase 3 | AI Agents | Planned |
| Phase 4 | Advanced Reasoning Tools | Planned |
| Phase 5 | Model Training Integration | Planned |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop app framework
- [LM Studio](https://lmstudio.ai/) - Local AI model runner
- [Ollama](https://ollama.ai/) - Local AI model inference
- [OpenAI](https://openai.com/) - AI research and deployment

## Support

- **Documentation**: Check the [docs](docs/) folder
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-org/gradeguru/issues)
- **Discussions**: Join the conversation on [GitHub Discussions](https://github.com/your-org/gradeguru/discussions)

---

<p align="center">
  Made with ❤️ by the GradeGuru Team
</p>
