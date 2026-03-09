export function renderAssignmentSidebar(state) {
  const sections = ['overview', 'instructions', 'rubric', 'sources', 'chats', 'generated'];
  return `
    <aside class="assignment-sidebar panel">
      <div class="eyebrow">Assignment</div>
      <h3>${state.currentAssignment?.title || 'No assignment selected'}</h3>
      <div class="section-list">
        ${sections.map((section) => `
          <button class="sidebar-link ${state.assignmentView === section ? 'selected' : ''}" data-action="set-assignment-view" data-view="${section}">
            ${labelFor(section)}
          </button>
        `).join('')}
      </div>
      <div class="mini-meta">
        <span>Status: ${state.currentAssignment?.status || 'draft'}</span>
        <span>Due: ${state.currentAssignment?.dueDate || 'TBD'}</span>
      </div>
    </aside>
  `;
}

function labelFor(section) {
  return ({
    overview: 'Overview',
    instructions: 'Instructions',
    rubric: 'Rubric',
    sources: 'Sources',
    chats: 'Chats',
    generated: 'Generated Work',
  })[section];
}
