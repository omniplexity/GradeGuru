const { DocumentParser } = require('./documentParser');
const { cleanText } = require('./textCleaner');
const { Chunker } = require('./chunker');
const { EmbeddingEngine } = require('./embeddingEngine');
const { Retriever, groupSources } = require('./retriever');
const { Reranker } = require('./reranker');
const ANNIndex = require('./annIndex');

class VectorIndex {
  constructor(db) {
    this.db = db;
    this.documentParser = new DocumentParser();
    this.chunker = new Chunker();
    this.embeddingEngine = new EmbeddingEngine();
    this.retriever = new Retriever(this.embeddingEngine);
    this.reranker = new Reranker();
    this.ann = new ANNIndex(768);
    this.metrics = this.retriever.metrics;
    this.ready = Promise.resolve(this.rebuildIndex());
  }

  clearSourceChunks(sourceId) {
    const rows = this.db.prepare(`
      SELECT id
      FROM source_chunks
      WHERE source_id = ?
    `).all(sourceId);

    rows.forEach((row) => this.ann.remove(row.id));
    this.db.prepare('DELETE FROM source_chunks WHERE source_id = ?').run(sourceId);
  }

  setSourceStatus(sourceId, status) {
    this.db.prepare(`
      UPDATE sources
      SET embedding_index = ?
      WHERE id = ?
    `).run(status, sourceId);
  }

  insertChunk(source, chunkIndex, chunkText) {
    const result = this.db.prepare(`
      INSERT INTO source_chunks (source_id, assignment_id, chunk_index, chunk_text, embedding, embedding_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(source.id, source.assignmentId, chunkIndex, chunkText, '', '');

    return Number(result.lastInsertRowid);
  }

  updateChunkEmbedding(chunkId, assignmentId, vector) {
    const serialized = JSON.stringify(vector);
    this.db.prepare(`
      UPDATE source_chunks
      SET embedding = ?, embedding_json = ?
      WHERE id = ?
    `).run(serialized, serialized, chunkId);
    this.ann.add(chunkId, vector, { assignmentId });
  }

  rebuildIndex() {
    this.ann.clear();

    const rows = this.db.prepare(`
      SELECT id, assignment_id AS assignmentId, embedding
      FROM source_chunks
      WHERE embedding IS NOT NULL AND embedding != ''
    `).all();

    rows.forEach((row) => {
      const vector = JSON.parse(row.embedding);
      this.ann.add(row.id, vector, { assignmentId: row.assignmentId });
    });
  }

  async indexVirtualSource(source, text) {
    await this.ready;
    this.setSourceStatus(source.id, 'parsing');

    try {
      const cleanedText = cleanText(text);
      const chunks = this.chunker.chunk(cleanedText);

      this.clearSourceChunks(source.id);
      this.setSourceStatus(source.id, 'embedding');

      for (const [chunkIndex, chunkText] of chunks.entries()) {
        const chunkId = this.insertChunk(source, chunkIndex, chunkText);
        const vector = await this.embeddingEngine.embed(chunkText, { inputType: 'document' });
        this.updateChunkEmbedding(chunkId, source.assignmentId, vector);
      }

      this.setSourceStatus(source.id, 'ready');
    } catch (error) {
      this.setSourceStatus(source.id, 'failed');
      throw error;
    }
  }

  async indexSource(source) {
    await this.ready;
    const text = await this.documentParser.parseFile(source.filePath);
    await this.indexVirtualSource(source, text);
  }

  async search(assignmentId, query, limit = 5) {
    await this.ready;
    if (!query || !query.trim()) {
      return [];
    }

    const { keywordResults, vectorResults } = await this.retriever.hybridSearch(
      this.db,
      this.ann,
      assignmentId,
      query,
      Math.max(limit * 2, 10),
    );
    this.metrics.retrieval.reranks += 1;
    const ranked = this.reranker.rerank([...keywordResults, ...vectorResults], limit);
    const grouped = groupSources(ranked);
    const groupLookup = new Map();

    grouped.forEach((group, groupIndex) => {
      group.items.forEach((item) => {
        groupLookup.set(item.id, groupIndex + 1);
      });
    });

    return ranked
      .filter((row) => row.score > 0.05)
      .map((row) => ({
        ...row,
        synthesisGroup: groupLookup.get(row.id) || 1,
      }));
  }
}

module.exports = {
  VectorIndex,
};
