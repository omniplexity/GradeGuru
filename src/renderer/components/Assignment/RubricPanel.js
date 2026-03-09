export function renderRubricPanel(state) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Rubric</div>
          <h3>Scoring Criteria</h3>
        </div>
        <button class="ghost-button" data-action="save-rubric">Save</button>
      </div>
      <textarea id="rubricField" class="editor-field tall">${state.currentAssignment?.rubric || ''}</textarea>
    </section>
  `;
}
