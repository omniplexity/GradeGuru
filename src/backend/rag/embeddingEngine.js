let pipelinePromise = null;

async function loadPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = import('@xenova/transformers').then((module) => module.pipeline);
  }
  return pipelinePromise;
}

function normalizeVector(values) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + (value * value), 0));
  if (!magnitude) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

class EmbeddingEngine {
  constructor({ pipelineFactory = null } = {}) {
    this.pipelineFactory = pipelineFactory;
    this.embedderPromise = null;
  }

  async getEmbedder() {
    if (!this.embedderPromise) {
      this.embedderPromise = (this.pipelineFactory
        ? Promise.resolve(this.pipelineFactory)
        : loadPipeline()).then((pipeline) => pipeline(
        'feature-extraction',
        'Xenova/nomic-embed-text-v1',
      ));
    }
    return this.embedderPromise;
  }

  async embed(text, { inputType = 'document' } = {}) {
    if (!text || !text.trim()) {
      return [];
    }

    const model = await this.getEmbedder();
    const prefix = inputType === 'query' ? 'search_query:' : 'search_document:';
    const result = await model(`${prefix} ${text}`, {
      pooling: 'mean',
      normalize: true,
    });

    return normalizeVector(Array.from(result.data || []));
  }

  similarity(left, right) {
    if (!left?.length || !right?.length || left.length !== right.length) {
      return 0;
    }

    let score = 0;
    for (let index = 0; index < left.length; index += 1) {
      score += left[index] * right[index];
    }
    return score;
  }
}

module.exports = {
  EmbeddingEngine,
};
