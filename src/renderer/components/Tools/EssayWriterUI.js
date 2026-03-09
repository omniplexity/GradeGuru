export function renderEssayWriterUI() {
  return `
    <section class="panel tool-panel">
      <div class="eyebrow">Essay Writer</div>
      <h3>Draft Planning Prompt</h3>
      <textarea id="essayWriterInput" class="editor-field" placeholder="Describe the essay goal, thesis direction, and constraints."></textarea>
      <button class="primary-button" data-action="use-tool-prompt">Send To Assignment Chat</button>
    </section>
  `;
}
