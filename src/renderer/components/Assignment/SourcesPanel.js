export function renderSourcesPanel(state) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Sources</div>
          <h3>Retrieval Library</h3>
        </div>
        <button class="ghost-button" data-action="attach-source">Upload Source</button>
      </div>
      <div class="source-list">
        ${(state.currentAssignment?.sources || []).map((source) => `
          <article class="source-card">
            <strong>${source.filePath}</strong>
            <span>${source.type}</span>
            <span>${renderSourceStatus(source)}</span>
          </article>
        `).join('') || '<p class="muted">No sources attached yet.</p>'}
      </div>
    </section>
  `;
}

function renderSourceStatus(source) {
  if (source.embeddingIndex === 'ready') {
    return 'Indexed';
  }
  if (source.embeddingIndex === 'indexing') {
    return 'Indexing...';
  }
  if (source.embeddingIndex === 'failed') {
    return 'Index failed';
  }
  return 'Pending';
}
