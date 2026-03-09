const BaseProvider = require('./BaseProvider');

class TogetherProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      id: 'together',
      name: 'Together',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      priority: 4,
      ...config,
    });
    this.baseUrl = this.config.baseUrl || 'https://api.together.xyz/v1';
    this.apiKey = this.config.apiKey || process.env.TOGETHER_API_KEY;
  }

  async isAvailable() {
    return Boolean(this.apiKey);
  }

  capabilities() {
    return {
      streaming: true,
      vision: false,
      tools: false,
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

module.exports = TogetherProvider;
