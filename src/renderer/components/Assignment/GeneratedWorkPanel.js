export function renderGeneratedWorkPanel(state) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Generated Work</div>
          <h3>Draft Output</h3>
        </div>
        <button class="ghost-button" data-action="save-generated-work">Save</button>
      </div>
      <textarea id="generatedWorkField" class="editor-field tall">${state.currentAssignment?.generatedWork || ''}</textarea>
    </section>
  `;
}
