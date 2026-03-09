class Reranker {
  rerank(results, limit = 5) {
    const deduped = new Map();

    results.forEach((result) => {
      const current = deduped.get(result.id);
      const score = ((result.vectorScore || 0) * 0.7) + ((result.keywordScore || 0) * 0.3);
      const normalized = {
        ...result,
        score,
      };

      if (!current || current.score < normalized.score) {
        deduped.set(result.id, normalized);
      }
    });

    return Array.from(deduped.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }
}

module.exports = {
  Reranker,
};
