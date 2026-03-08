# GradeGuru Model Integration Guide

This guide explains how to integrate various AI models and inference engines with GradeGuru, including LM Studio, Ollama, OpenAI, and custom APIs.

## Table of Contents

1. [Overview](#overview)
2. [LM Studio Integration](#lm-studio-integration)
3. [Ollama Integration](#ollama-integration)
4. [OpenAI Integration](#openai-integration)
5. [Custom API Integration](#custom-api-integration)
6. [API Request Examples](#api-request-examples)
7. [Configuration Reference](#configuration-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

GradeGuru supports multiple AI model providers through a unified adapter system. Each provider is implemented as an adapter that translates requests into the provider's specific API format.

### Supported Providers

| Provider | Type | Protocol | Default Port |
|----------|------|----------|--------------|
| **LM Studio** | Local | OpenAI-compatible REST | 1234 |
| **Ollama** | Local | OpenAI-compatible REST | 11434 |
| **OpenAI** | Remote | OpenAI REST API | api.openai.com |
| **Custom API** | Both | OpenAI-compatible REST | Configurable |

### How Model Routing Works

```
User Message
     │
     ▼
┌─────────────────┐
│  Model Router   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│Local  │  │Remote │
│Adapter│  │Adapter│
└───┬───┘  └───┬───┘
    │          │
    ▼          ▼
Local Model   Cloud API
Server        (OpenAI)
```

---

## LM Studio Integration

LM Studio is a desktop application for running local AI models. It provides an OpenAI-compatible API.

### Prerequisites

1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Install and launch LM Studio
3. Download a model (recommended: Llama 2, Mistral, or Phi-2)

### Starting the LM Studio Server

1. Open LM Studio
2. Navigate to the **Developer** tab (left sidebar)
3. Select your model from the dropdown
4. Click **Start Server**
5. Note the port (default: 1234)

```
┌─────────────────────────────────────────┐
│  LM Studio                      ─ □ ✕  │
├─────────────────────────────────────────┤
│  [🤖 Models] [💬 Chat] [🔧 Developer]  │
├─────────────────────────────────────────┤
│                                         │
│  Server Status: ● Running              │
│                                         │
│  Model: Llama 2 7B                     │
│  Port: 1234                            │
│  URL: http://localhost:1234           │
│                                         │
│  [Stop Server]  [OpenAI Compat]       │
│                                         │
└─────────────────────────────────────────┘
```

### Configuration

In GradeGuru settings, configure LM Studio:

```json
{
  "provider": "lmstudio",
  "baseUrl": "http://localhost:1234",
  "model": "llama2",
  "options": {
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

### Testing the Connection

```bash
# Test LM Studio API
curl http://localhost:1234/v1/models
```

Expected response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "llama2",
      "object": "model",
      "owned_by": "local"
    }
  ]
}
```

### Available Models

Popular models to run with LM Studio:

| Model | Size | RAM Required | Performance |
|-------|------|--------------|-------------|
| Phi-2 | 2.7GB | 4GB | Fast |
| Mistral 7B | 4.1GB | 8GB | Good |
| Llama 2 7B | 3.8GB | 8GB | Good |
| Llama 2 13B | 13GB | 16GB | Better |
| Codellama 7B | 3.8GB | 8GB | Code tasks |

---

## Ollama Integration

Ollama is another popular choice for running local AI models, with native support for many open-source models.

### Prerequisites

1. Download Ollama from [ollama.ai](https://ollama.ai)
2. Install Ollama
3. Pull a model using the command line

### Installing Models

```powershell
# Pull a model (Llama 2)
ollama pull llama2

# Pull Mistral
ollama pull mistral

# Pull CodeLlama for coding tasks
ollama pull codellama

# List available models
ollama list
```

### Starting Ollama Server

Ollama runs as a service by default on port 11434.

```powershell
# Start Ollama (runs as background service)
ollama serve

# Or simply run it
ollama
```

### Configuration

```json
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "llama2",
  "options": {
    "temperature": 0.7,
    "num_ctx": 4096,
    "num_gpu": 0
  }
}
```

### Testing the Connection

```bash
# Test Ollama API
curl http://localhost:11434/api/tags
```

Expected response:

```json
{
  "models": [
    {
      "name": "llama2:latest",
      "size": 3826793472,
      "modified_at": "2024-01-15T10:30:00Z"
    },
    {
      "name": "mistral:latest", 
      "size": 4109854720,
      "modified_at": "2024-01-14T08:20:00Z"
    }
  ]
}
```

### Ollama-Specific Options

Ollama supports additional parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `num_ctx` | integer | 2048 | Context window size |
| `num_gpu` | integer | 0 | GPU layers to use |
| `num_thread` | integer | auto | CPU threads |
| `repeat_penalty` | float | 1.1 | Repetition penalty |
| `top_k` | integer | 40 | Top-k sampling |
| `top_p` | float | 0.9 | Top-p (nucleus) sampling |

Example request:

```json
{
  "model": "llama2",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "options": {
    "temperature": 0.7,
    "num_ctx": 4096,
    "repeat_penalty": 1.2
  }
}
```

---

## OpenAI Integration

Connect to OpenAI's cloud API for access to GPT-4, GPT-3.5 Turbo, and other models.

### Prerequisites

1. Create an OpenAI account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key
3. Add billing information (required for API access)

### Getting Your API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy and save the key securely

⚠️ **Important**: The key is only shown once. Store it securely!

### Configuration

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-your-api-key-here",
  "model": "gpt-4",
  "options": {
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

### Available Models

| Model | Context | Training Data | Use Case |
|-------|---------|---------------|----------|
| **gpt-4** | 8K/32K | Up to Sep 2023 | Complex reasoning |
| **gpt-4-turbo** | 128K | Up to Apr 2024 | Latest capabilities |
| **gpt-3.5-turbo** | 16K | Up to Sep 2021 | Fast, cost-effective |
| **gpt-3.5-turbo-16k** | 16K | Up to Sep 2021 | Longer context |

### Configuration via Environment Variable

For security, you can set the API key via environment variable:

```powershell
# Windows
set OPENAI_API_KEY=sk-your-key-here

# Then in config:
{
  "provider": "openai",
  "apiKey": "env:OPENAI_API_KEY",
  "model": "gpt-4"
}
```

### Testing the Connection

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-api-key"
```

---

## Custom API Integration

GradeGuru can connect to any OpenAI-compatible API, allowing integration with:

- Self-hosted OpenAI-compatible servers
- Local inference engines
- Third-party AI services
- Custom model deployments

### Compatible Services

| Service | URL | Notes |
|---------|-----|-------|
| **LocalAI** | http://localhost:8080 | OpenAI-compatible |
| **Text Generation WebUI** | http://localhost:5000 | With OpenAI extension |
| **KoboldAI** | http://localhost:5001 | Various endpoints |
| **FastChat** | http://localhost:8000 | Vicuna, etc. |
| **Anyscale** | https://api.endpoints.anyscale.com | Managed service |
| **Together AI** | https://api.together.xyz | Managed service |

### Configuration

```json
{
  "provider": "custom",
  "baseUrl": "http://localhost:8080/v1",
  "apiKey": "optional-api-key",
  "model": "your-model-name",
  "options": {
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

### LocalAI Example

[LocalAI](https://localai.io/) is a self-hosted OpenAI-compatible API.

1. Run LocalAI with Docker:

```bash
docker run -p 8080:8080 localai/localai:latest
```

2. Configure GradeGuru:

```json
{
  "provider": "custom",
  "baseUrl": "http://localhost:8080/v1",
  "model": "gpt4all-j",
  "options": {}
}
```

### Text Generation WebUI Example

1. Start Text Generation WebUI with OpenAI API extension:
   - Use the `--api` flag or enable in settings
   
2. Configure:

```json
{
  "provider": "custom",
  "baseUrl": "http://localhost:5000/v1",
  "model": "vicuna-13b-v1.5",
  "options": {}
}
```

---

## API Request Examples

All providers use the OpenAI-compatible chat completions format.

### Basic Chat Request

```javascript
// HTTP Request
POST {baseUrl}/chat/completions
Content-Type: application/json
Authorization: Bearer {apiKey}

{
  "model": "llama2",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 512
}
```

**Response:**

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "llama2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 30,
    "completion_tokens": 8,
    "total_tokens": 38
  }
}
```

### Streaming Request

```javascript
// Enable streaming for real-time responses
{
  "model": "llama2",
  "messages": [
    { "role": "user", "content": "Write a story about a robot." }
  ],
  "stream": true
}
```

**Response (streaming):**

```json
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama2","choices":[{"index":0,"delta":{"content":"Once"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama2","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama2","choices":[{"index":0,"delta":{"content":" a"},"finish_reason":null}]}

data: [DONE]
```

### Code Completion Example

```json
{
  "model": "codellama",
  "messages": [
    {
      "role": "user",
      "content": "Write a function to calculate fibonacci numbers in Python"
    }
  ],
  "temperature": 0.2,
  "max_tokens": 512
}
```

### Image Generation (if supported)

```json
{
  "model": "stability-ai",
  "prompt": "A beautiful sunset over the ocean",
  "num_images": 1
}
```

### Embeddings Request

```json
{
  "model": "text-embedding-ada-002",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

---

## Configuration Reference

### Settings File Format

Create or edit `settings.json`:

```json
{
  "activeProvider": "ollama",
  "providers": {
    "lmstudio": {
      "enabled": true,
      "baseUrl": "http://localhost:1234",
      "defaultModel": "llama2",
      "options": {
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 0.9,
        "repeat_penalty": 1.1
      }
    },
    "ollama": {
      "enabled": true,
      "baseUrl": "http://localhost:11434",
      "defaultModel": "llama2",
      "options": {
        "temperature": 0.7,
        "num_ctx": 4096,
        "num_gpu": 0
      }
    },
    "openai": {
      "enabled": true,
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "env:OPENAI_API_KEY",
      "defaultModel": "gpt-4",
      "options": {
        "temperature": 0.7,
        "max_tokens": 2048
      }
    },
    "custom": {
      "enabled": false,
      "baseUrl": "http://localhost:8080/v1",
      "apiKey": "",
      "defaultModel": "",
      "options": {}
    }
  },
  "fallback": {
    "enabled": true,
    "provider": "openai"
  }
}
```

### Provider Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | false | Enable/disable provider |
| `baseUrl` | string | - | API endpoint URL |
| `apiKey` | string | - | API key (or env:VAR_NAME) |
| `defaultModel` | string | - | Default model ID |
| `options.temperature` | float | 0.7 | Sampling temperature (0-2) |
| `options.max_tokens` | integer | 2048 | Max response tokens |
| `options.top_p` | float | 1.0 | Nucleus sampling |
| `options.frequency_penalty` | float | 0.0 | Frequency penalty |
| `options.presence_penalty` | float | 0.0 | Presence penalty |

### Model Selection

You can switch between models within each provider:

```javascript
// Via UI
// 1. Click model selector dropdown
// 2. Choose from available models
// 3. Selection persists

// Via API
await window.api.sendMessage("Hello", {
  provider: "ollama",
  model: "mistral"
});
```

---

## Troubleshooting

### Connection Issues

#### Problem: "Connection refused"

**Causes:**
- Provider server not running
- Wrong port number
- Firewall blocking connection

**Solutions:**

1. Check server is running:
   ```powershell
   # LM Studio
   curl http://localhost:1234/v1/models
   
   # Ollama
   curl http://localhost:11434/api/tags
   ```

2. Verify port in settings

3. Check firewall settings

#### Problem: "Authentication failed"

**Causes:**
- Invalid API key
- Missing API key
- Expired API key

**Solutions:**

1. Verify API key format
2. Check key is still valid
3. Regenerate key if needed

### Model Issues

#### Problem: "Model not found"

**Causes:**
- Model not downloaded
- Wrong model name
- Model not loaded in provider

**Solutions:**

1. Download model in provider app
2. Verify model name matches exactly
3. Reload/restart provider server

#### Problem: Slow responses

**Causes:**
- Large model running
- Insufficient RAM/GPU
- Network latency (for remote)

**Solutions:**

1. Use smaller model
2. Reduce context size
3. Check system resources

### Response Issues

#### Problem: "Empty response"

**Causes:**
- Model loading
- Context too long
- Rate limiting

**Solutions:**

1. Wait for model to load
2. Reduce message history
3. Check rate limits

#### Problem: Poor quality responses

**Solutions:**

1. Adjust temperature (try 0.5-0.9)
2. Increase max_tokens
3. Try different model
4. Check prompt engineering

---

## Best Practices

### Security

- ✅ Store API keys in environment variables
- ✅ Never commit keys to version control
- ✅ Use separate keys for development/production
- ❌ Don't hardcode API keys in config files

### Performance

- ✅ Use local models for privacy/speed
- ✅ Clear conversation history periodically
- ✅ Use appropriate context sizes
- ❌ Don't use GPT-4 for simple tasks

### Cost Management

- ✅ Set max_tokens limits
- ✅ Use gpt-3.5-turbo for simple tasks
- ✅ Monitor usage in provider dashboard
- ✅ Implement caching where possible

---

## Related Documentation

- [Architecture Overview](architecture.md)
- [Plugin System](plugin-system.md)
- [Development Guide](development-guide.md)
- [Roadmap](roadmap.md)
