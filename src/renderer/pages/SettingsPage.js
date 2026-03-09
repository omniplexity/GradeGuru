export function renderSettingsPage(state) {
  return `
    <section class="page-grid settings-grid">
      <article class="panel">
        <div class="eyebrow">Models</div>
        <h3>Provider Router</h3>
        <select id="modelSelect" class="text-field">
          ${state.models.map((model) => `<option value="${model.id}" ${state.selectedModel?.id === model.id ? 'selected' : ''}>${model.name} · ${model.provider}</option>`).join('')}
        </select>
        <button class="primary-button" data-action="save-model">Select Model</button>
      </article>
      <article class="panel">
        <div class="eyebrow">Settings</div>
        <h3>Workspace Defaults</h3>
        <select id="citationStyle" class="text-field">
          <option value="APA" ${state.settings.citationStyle === 'APA' ? 'selected' : ''}>APA</option>
          <option value="MLA" ${state.settings.citationStyle === 'MLA' ? 'selected' : ''}>MLA</option>
        </select>
        <button class="primary-button" data-action="save-settings">Save Settings</button>
      </article>
      <article class="panel">
        <div class="eyebrow">Plugins</div>
        <h3>Installed Extensions</h3>
        <div class="stack-list">
          ${state.plugins.map((plugin) => `<div class="info-card static"><strong>${plugin.name}</strong><span>${plugin.version}</span><span>${plugin.description}</span></div>`).join('') || '<p class="muted">No plugins detected.</p>'}
        </div>
      </article>
    </section>
  `;
}
