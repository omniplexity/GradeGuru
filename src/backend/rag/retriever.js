function groupSources(results) {
  const groups = [];

  for (const result of results) {
    let placed = false;

    for (const group of groups) {
      if (Math.abs(group.score - result.score) < 0.05) {
        group.items.push(result);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push({ score: result.score, items: [result] });
    }
  }

  return groups;
}

class Retriever {
  constructor(embeddingEngine) {
    this.embeddingEngine = embeddingEngine;
    this.metrics = {
      retrieval: {
        vectorQueries: 0,
        keywordQueries: 0,
        reranks: 0,
      },
    };
  }

  keywordSearch(db, assignmentId, query, limit = 10) {
    this.metrics.retrieval.keywordQueries += 1;
    const terms = Array.from(new Set(
      (query.toLowerCase().match(/[a-z0-9]{3,}/g) || []).slice(0, 8),
    ));

    if (!terms.length) {
      return [];
    }

    const statement = db.prepare(`
      SELECT
        id,
        source_id AS sourceId,
        assignment_id AS assignmentId,
        chunk_index AS chunkIndex,
        chunk_text AS chunkText,
        embedding,
        embedding_json AS embeddingJson
      FROM source_chunks
      WHERE assignment_id = ?
    `);

    return statement
      .all(assignmentId)
      .map((row) => {
        const haystack = (row.chunkText || '').toLowerCase();
        const hits = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
        return {
          ...row,
          keywordScore: terms.length ? hits / terms.length : 0,
          score: terms.length ? hits / terms.length : 0,
        };
      })
      .filter((row) => row.keywordScore > 0)
      .sort((left, right) => right.keywordScore - left.keywordScore)
      .slice(0, limit);
  }

  fetchRowsByIds(db, ids) {
    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map(() => '?').join(', ');
    return db.prepare(`
      SELECT
        id,
        source_id AS sourceId,
        assignment_id AS assignmentId,
        chunk_index AS chunkIndex,
        chunk_text AS chunkText,
        embedding,
        embedding_json AS embeddingJson
      FROM source_chunks
      WHERE id IN (${placeholders})
    `).all(...ids);
  }

  async vectorSearch(db, ann, assignmentId, queryVector, limit = 10) {
    this.metrics.retrieval.vectorQueries += 1;

    const candidateIds = ann.search(
      queryVector,
      Math.max(limit * 4, 20),
      (metadata) => metadata.assignmentId === assignmentId,
    );

    const rows = this.fetchRowsByIds(db, candidateIds)
      .filter((row) => row.assignmentId === assignmentId);

    return rows.map((row) => {
      const serialized = row.embedding || row.embeddingJson;
      const vector = serialized ? JSON.parse(serialized) : [];
      const vectorScore = this.embeddingEngine.similarity(queryVector, vector);
      return {
        ...row,
        vectorScore,
        score: vectorScore,
      };
    })
      .filter((row) => row.vectorScore > 0)
      .sort((left, right) => right.vectorScore - left.vectorScore)
      .slice(0, limit);
  }

  async hybridSearch(db, ann, assignmentId, query, limit = 10) {
    const [queryVector, keywordResults] = await Promise.all([
      this.embeddingEngine.embed(query, { inputType: 'query' }),
      Promise.resolve(this.keywordSearch(db, assignmentId, query, limit)),
    ]);
    const vectorResults = await this.vectorSearch(db, ann, assignmentId, queryVector, limit);
    const groupedResults = groupSources([...keywordResults, ...vectorResults]
      .sort((left, right) => right.score - left.score));

    return {
      queryVector,
      keywordResults,
      vectorResults,
      groupedResults,
    };
  }
}

module.exports = {
  Retriever,
  groupSources,
};
