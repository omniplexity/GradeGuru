class ProblemDetector {
  detect(text) {
    const lower = text.toLowerCase();
    if (/[=+\-*/^]/.test(text) || lower.includes('solve') || lower.includes('differentiate')) {
      return { type: 'math', prompt: text };
    }
    if (lower.includes('essay') || lower.includes('write')) {
      return { type: 'writing', prompt: text };
    }
    return { type: 'general', prompt: text };
  }
}

module.exports = {
  ProblemDetector,
};
