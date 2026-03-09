const BaseProvider = require('./BaseProvider');

class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'openrouter',
      name: 'OpenRouter',
      defaultModel: 'openai/gpt-4o-mini',
      priority: 5,
      ...config,
    });
    this.baseUrl = this.config.baseUrl || 'https://openrouter.ai/api/v1';
    this.apiKey = this.config.apiKey || process.env.OPENROUTER_API_KEY;
  }

  async isAvailable() {
    return Boolean(this.apiKey);
  }

  capabilities() {
    return {
      streaming: true,
      vision: true,
      tools: true,
    };
  }

  getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generate({ model, messages }) {
    const data = await this.requestJson(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
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

module.exports = OpenRouterProvider;
