const BaseProvider = require('./BaseProvider');

class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'ollama',
      name: 'Ollama',
      defaultModel: 'llama3',
      priority: 2,
      ...config,
    });
    this.baseUrl = this.config.baseUrl || 'http://localhost:11434';
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  capabilities() {
    return {
      streaming: true,
      vision: true,
      tools: false,
    };
  }

  async listModels() {
    try {
      const data = await this.requestJson(`${this.baseUrl}/api/tags`);
      return (data.models || []).map((entry) => ({
        id: entry.name,
        name: entry.name,
        provider: this.name,
        capabilities: this.detectCapabilities(entry.name),
      }));
    } catch {
      return [];
    }
  }

  formatPrompt(messages) {
    return messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');
  }

  async generate({ model, messages }) {
    const data = await this.requestJson(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.resolveModel(model),
        prompt: this.formatPrompt(messages),
        stream: false,
      }),
    });

    return data.response || '';
  }

  async *stream({ model, messages }) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.resolveModel(model),
        prompt: this.formatPrompt(messages),
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      yield* super.stream({ model, messages });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (!line) {
          continue;
        }
        const data = JSON.parse(line);
        if (data.response) {
          yield {
            type: 'token',
            text: data.response,
          };
        }
      }
    }

    yield { type: 'end' };
  }
}

module.exports = OllamaProvider;
