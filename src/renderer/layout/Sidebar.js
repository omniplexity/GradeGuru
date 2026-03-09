import { href } from '../router.js';

export function renderSidebar(state) {
  const navItems = [
    ['dashboard', 'Dashboard'],
    ['classes', 'Classes'],
    ['tools', 'Tools'],
    ['settings', 'Settings'],
  ];

  return `
    <aside class="shell-sidebar">
      <div class="brand-block">
        <div class="brand-mark">G</div>
        <div>
          <div class="eyebrow">Academic Workspace</div>
          <h1>GradeGuru v2</h1>
        </div>
      </div>

      <nav class="nav-list">
        ${navItems.map(([name, label]) => `
          <a class="nav-item ${state.route.name === name ? 'active' : ''}" href="${href(name)}">${label}</a>
        `).join('')}
      </nav>

      <section class="sidebar-section">
        <div class="sidebar-section-title">Classes</div>
        ${state.classes.map((item) => `
          <button class="sidebar-link ${state.currentClass?.id === item.id ? 'selected' : ''}" data-action="select-class" data-class-id="${item.id}">
            ${item.name}
          </button>
        `).join('')}
      </section>
    </aside>
  `;
}
