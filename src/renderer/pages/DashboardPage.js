export function renderDashboardPage(state) {
  return `
    <section class="page-grid dashboard-grid">
      <article class="panel hero-panel">
        <div class="eyebrow">Workflow</div>
        <h3>Class to deliverable, with planning and retrieval in the loop.</h3>
        <p>GradeGuru v2 organizes assignments, rubric-aware drafting, sources, and tool calls inside one structured workspace.</p>
      </article>
      <article class="panel">
        <div class="eyebrow">Upcoming Assignments</div>
        <div class="stack-list">
          ${state.dashboard.upcomingAssignments.map((item) => `<button class="info-card" data-action="open-assignment" data-assignment-id="${item.id}"><strong>${item.title}</strong><span>${item.className}</span><span>${item.dueDate}</span></button>`).join('')}
        </div>
      </article>
      <article class="panel">
        <div class="eyebrow">Recent Chats</div>
        <div class="stack-list">
          ${state.dashboard.recentChats.map((item) => `<div class="info-card static"><strong>${item.assignmentTitle}</strong><span>${item.title}</span><span>${new Date(item.createdAt).toLocaleString()}</span></div>`).join('')}
        </div>
      </article>
      <article class="panel">
        <div class="eyebrow">Active Projects</div>
        <div class="stack-list">
          ${state.dashboard.activeProjects.map((item) => `<button class="info-card" data-action="open-assignment" data-assignment-id="${item.id}"><strong>${item.title}</strong><span>${item.className}</span><span>${item.status}</span></button>`).join('')}
        </div>
      </article>
    </section>
  `;
}
