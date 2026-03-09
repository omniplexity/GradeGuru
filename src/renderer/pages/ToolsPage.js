import { renderMathSolverUI } from '../components/Tools/MathSolverUI.js';
import { renderEssayWriterUI } from '../components/Tools/EssayWriterUI.js';
import { renderImageSolverUI } from '../components/Tools/ImageSolverUI.js';

export function renderToolsPage(state) {
  return `
    <section class="page-grid tools-grid">
      ${renderEssayWriterUI()}
      ${renderMathSolverUI()}
      ${renderImageSolverUI()}
      <section class="panel tool-panel">
        <div class="eyebrow">Citation Generator</div>
        <h3>Format Source Metadata</h3>
        <input id="citationTitle" class="text-field" placeholder="Title">
        <input id="citationAuthor" class="text-field" placeholder="Author">
        <input id="citationYear" class="text-field" placeholder="Year">
        <button class="primary-button" data-action="run-tool" data-tool="citation_formatter">Generate Citation</button>
      </section>
      <section class="panel tool-output">
        <div class="eyebrow">Tool Output</div>
        <pre>${state.toolOutput || 'Run a tool to see structured output here.'}</pre>
        ${renderToolRouting(state)}
      </section>
    </section>
  `;
}

function renderToolRouting(state) {
  if (!state.pendingToolResult) {
    return '';
  }

  if (state.currentAssignment) {
    return `<p class="muted">Active assignment detected. The result is ready in the assignment chat draft.</p>`;
  }

  if (!state.assignments.length) {
    return `<p class="muted">No assignments are loaded for the selected class. Pick a class from the sidebar first.</p>`;
  }

  return `
    <div class="stack-list">
      <div class="eyebrow">Route To Assignment</div>
      ${state.assignments.map((assignment) => `
        <button class="info-card" data-action="route-tool-result" data-assignment-id="${assignment.id}">
          <strong>${assignment.title}</strong>
          <span>${assignment.dueDate || 'No due date'}</span>
        </button>
      `).join('')}
    </div>
  `;
}
