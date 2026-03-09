const BaseProvider = require('./BaseProvider');

class LMStudioProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'lmstudio',
      name: 'LM Studio',
      defaultModel: 'local-model',
      priority: 1,
      ...config,
    });
    this.baseUrl = this.config.baseUrl || 'http://localhost:1234/v1';
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }

  capabilities() {
    return {
      streaming: true,
      vision: false,
      tools: false,
    };
  }

  async listModels() {
    try {
      const data = await this.requestJson(`${this.baseUrl}/models`);
      return (data.data || []).map((entry) => ({
        id: entry.id,
        name: entry.id,
        provider: this.name,
        capabilities: this.detectCapabilities(entry.id),
      }));
    } catch {
      return [];
    }
  }

  async generate({ model, messages }) {
    const data = await this.requestJson(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.resolveModel(model),
        messages,
        stream: false,
      }),
    });

    return data.choices?.[0]?.message?.content || '';
  }

  async *stream({ model, messages }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.resolveModel(model),
        messages,
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
        if (!line.startsWith('data:')) {
          continue;
        }
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') {
          continue;
        }

        const data = JSON.parse(payload);
        const chunk = data.choices?.[0]?.delta?.content;
        if (chunk) {
          yield {
            type: 'token',
            text: chunk,
          };
        }
      }
    }

    yield { type: 'end' };
  }
}

module.exports = LMStudioProvider;
