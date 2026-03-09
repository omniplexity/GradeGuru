export function renderTopBar(state) {
  const assignment = state.currentAssignment;
  return `
    <header class="topbar">
      <div>
        <div class="eyebrow">Structured Workflow</div>
        <h2>${assignment ? assignment.title : 'GradeGuru Dashboard'}</h2>
      </div>
      <div class="topbar-meta">
        <span>${state.selectedModel?.name || 'No model selected'}</span>
        <span>${assignment?.dueDate ? `Due ${assignment.dueDate}` : 'Academic AI workspace'}</span>
      </div>
    </header>
  `;
}
