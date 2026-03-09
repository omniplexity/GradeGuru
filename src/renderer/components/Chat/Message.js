function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderRichText(content) {
  let html = escapeHtml(content || '');
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\$(.+?)\$/g, '<span class="math-inline">$1</span>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

export function renderMessage(message) {
  return `
    <article class="chat-message ${message.role}">
      <div class="chat-avatar">${message.role === 'user' ? 'You' : 'AI'}</div>
      <div class="chat-bubble">
        <div class="chat-content">${renderRichText(message.content)}</div>
        ${(message.attachments || []).length ? `<div class="attachment-list">${message.attachments.map((item) => `<span class="attachment-chip">${item.name}</span>`).join('')}</div>` : ''}
      </div>
    </article>
  `;
}
