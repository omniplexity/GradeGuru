import { renderAssignmentSidebar } from '../components/Assignment/AssignmentSidebar.js';
import { renderInstructionsPanel } from '../components/Assignment/InstructionsPanel.js';
import { renderRubricPanel } from '../components/Assignment/RubricPanel.js';
import { renderSourcesPanel } from '../components/Assignment/SourcesPanel.js';
import { renderGeneratedWorkPanel } from '../components/Assignment/GeneratedWorkPanel.js';
import { renderChatView } from '../components/Chat/ChatView.js';

export function renderAssignmentPage(state) {
  if (!state.currentAssignment) {
    return '<section class="panel"><h3>No assignment selected.</h3></section>';
  }

  const panel = (() => {
    switch (state.assignmentView) {
      case 'instructions':
        return renderInstructionsPanel(state);
      case 'rubric':
        return renderRubricPanel(state);
      case 'sources':
        return renderSourcesPanel(state);
      case 'chats':
        return renderChatView(state);
      case 'generated':
        return renderGeneratedWorkPanel(state);
      default:
        return `
          <section class="panel overview-panel">
            <div class="eyebrow">Overview</div>
            <h3>${state.currentAssignment.title}</h3>
            <p>${state.currentAssignment.description || 'No description yet.'}</p>
            <div class="overview-metrics">
              <span>Due ${state.currentAssignment.dueDate || 'TBD'}</span>
              <span>${(state.currentAssignment.sources || []).length} sources</span>
              <span>${state.messages.length} messages</span>
            </div>
          </section>
          ${renderChatView(state)}
        `;
    }
  })();

  return `
    <section class="assignment-layout">
      ${renderAssignmentSidebar(state)}
      <div class="assignment-content">${panel}</div>
    </section>
  `;
}
