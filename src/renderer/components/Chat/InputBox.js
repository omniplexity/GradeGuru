export function renderInputBox(state) {
  return `
    <div class="input-shell">
      <div class="attachment-list">
        ${(state.pendingChatAttachments || []).map((item) => `<span class="attachment-chip">${item.name}</span>`).join('')}
      </div>
      <textarea id="chatInput" class="chat-input" placeholder="Ask for a plan, draft section, rubric check, or source-backed answer...">${state.chatInput || ''}</textarea>
      <div class="input-actions">
        <button class="ghost-button" data-action="pick-chat-files">Attach File</button>
        <button class="ghost-button" data-action="pick-chat-image">Attach Image</button>
        <button class="primary-button" data-action="send-chat" ${state.isStreaming ? 'disabled' : ''}>Send</button>
      </div>
    </div>
  `;
}
