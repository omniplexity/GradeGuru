export function renderClassesPage(state) {
  return `
    <section class="page-grid classes-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="eyebrow">Classes</div>
            <h3>Organize Coursework</h3>
          </div>
        </div>
        <div class="class-list">
          ${state.classes.map((item) => `
            <button class="info-card ${state.currentClass?.id === item.id ? 'active-card' : ''}" data-action="select-class" data-class-id="${item.id}">
              <strong>${item.name}</strong>
              <span>Created ${new Date(item.createdAt).toLocaleDateString()}</span>
            </button>
          `).join('')}
        </div>
        <div class="inline-form">
          <input id="newClassName" class="text-field" placeholder="New class name">
          <button class="primary-button" data-action="create-class">Create Class</button>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <div class="eyebrow">Assignments</div>
            <h3>${state.currentClass?.name || 'Select a class'}</h3>
          </div>
        </div>
        <div class="stack-list">
          ${state.assignments.map((item) => `
            <button class="info-card" data-action="open-assignment" data-assignment-id="${item.id}">
              <strong>${item.title}</strong>
              <span>${item.dueDate || 'No due date'}</span>
              <span>${item.status}</span>
            </button>
          `).join('') || '<p class="muted">No assignments yet.</p>'}
        </div>
        <div class="assignment-form">
          <input id="newAssignmentTitle" class="text-field" placeholder="Assignment title">
          <input id="newAssignmentDueDate" class="text-field" type="date">
          <textarea id="newAssignmentDescription" class="editor-field" placeholder="Short description"></textarea>
          <button class="primary-button" data-action="create-assignment">Create Assignment</button>
        </div>
      </article>
    </section>
  `;
}
