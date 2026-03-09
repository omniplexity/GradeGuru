const { HierarchicalNSW } = require('hnswlib-node');

class ANNIndex {
  constructor(dim = 768, maxElements = 10000) {
    this.dim = dim;
    this.maxElements = maxElements;
    this.index = new HierarchicalNSW('cosine', dim);
    this.index.initIndex(maxElements);
    this.activeIds = new Set();
    this.metadata = new Map();
  }

  count() {
    return this.activeIds.size;
  }

  clear() {
    this.index = new HierarchicalNSW('cosine', this.dim);
    this.index.initIndex(this.maxElements);
    this.activeIds.clear();
    this.metadata.clear();
  }

  ensureCapacity(targetSize) {
    if (targetSize <= this.maxElements) {
      return;
    }

    while (this.maxElements < targetSize) {
      this.maxElements *= 2;
    }
    this.index.resizeIndex(this.maxElements);
  }

  add(id, vector, metadata = {}) {
    if (!Array.isArray(vector) || vector.length !== this.dim || this.activeIds.has(id)) {
      return false;
    }

    this.ensureCapacity(this.activeIds.size + 1);
    this.index.addPoint(vector, id);
    this.activeIds.add(id);
    this.metadata.set(id, metadata);
    return true;
  }

  remove(id) {
    this.activeIds.delete(id);
    this.metadata.delete(id);
  }

  search(vector, k = 10, predicate = null) {
    if (!Array.isArray(vector) || vector.length !== this.dim || this.activeIds.size === 0) {
      return [];
    }

    const target = Math.min(Math.max(k * 5, k), this.activeIds.size);
    const result = this.index.searchKnn(vector, target);
    const neighbors = Array.isArray(result.neighbors) ? result.neighbors : [];

    return neighbors.filter((id) => {
      if (!this.activeIds.has(id)) {
        return false;
      }
      return predicate ? predicate(this.metadata.get(id) || {}, id) : true;
    }).slice(0, k);
  }
}

module.exports = ANNIndex;
