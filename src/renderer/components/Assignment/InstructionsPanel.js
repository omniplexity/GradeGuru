export function renderInstructionsPanel(state) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Instructions</div>
          <h3>Assignment Prompt</h3>
        </div>
        <button class="ghost-button" data-action="save-instructions">Save</button>
      </div>
      <textarea id="instructionsField" class="editor-field tall">${state.currentAssignment?.instructions || ''}</textarea>
    </section>
  `;
}
