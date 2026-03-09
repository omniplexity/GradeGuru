import { renderMessage } from './Message.js';
import { renderInputBox } from './InputBox.js';

export function renderChatView(state) {
  return `
    <section class="panel chat-panel">
      <div class="panel-header">
        <div>
          <div class="eyebrow">Chats</div>
          <h3>${state.currentChat?.title || 'Assignment Chat'}</h3>
        </div>
        <button class="ghost-button" data-action="new-chat">New Chat</button>
      </div>
      <div class="chat-scroll">
        ${state.messages.map(renderMessage).join('')}
      </div>
      ${renderInputBox(state)}
    </section>
  `;
}
