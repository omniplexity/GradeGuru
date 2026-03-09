import { createStore, resetChatDraft } from './state.js';
import { parseRoute } from './router.js';
import { renderSidebar } from './layout/Sidebar.js';
import { renderTopBar } from './layout/TopBar.js';
import { renderWorkspace } from './layout/Workspace.js';
import { renderDashboardPage } from './pages/DashboardPage.js';
import { renderClassesPage } from './pages/ClassesPage.js';
import { renderAssignmentPage } from './pages/AssignmentPage.js';
import { renderToolsPage } from './pages/ToolsPage.js';
import { renderSettingsPage } from './pages/SettingsPage.js';

const store = createStore();
const root = document.getElementById('app');
let detachStreamListener = null;
let detachMutationListener = null;

async function bootstrap() {
  try {
    if (!window.gradeGuru) {
      throw new Error('Preload API unavailable. window.gradeGuru was not injected.');
    }

    const payload = await window.gradeGuru.app.bootstrap();
    const route = parseRoute(window.location.hash);
    store.setState({
      ...payload,
      bootstrapped: true,
      route,
    });

    detachStreamListener = window.gradeGuru.chats.onStream((chunk) => {
      store.update((state) => {
        const messages = [...state.messages];
        const existing = messages.find((item) => String(item.id) === String(chunk.id));
        if (existing) {
          existing.content += chunk.content;
        } else {
          messages.push({ id: chunk.id, role: 'assistant', content: chunk.content, attachments: [], timestamp: new Date().toISOString() });
        }
        return {
          ...state,
          messages,
          isStreaming: !chunk.done,
          streamMessageId: chunk.done ? null : chunk.id,
        };
      });
    });

    detachMutationListener = window.gradeGuru.app.onDataMutated(async () => {
      await refreshDashboardData();
    });

    if (route.name === 'assignment' && route.params.assignmentId) {
      await openAssignment(route.params.assignmentId);
      return;
    }

    render();
  } catch (error) {
    console.error('[renderer] bootstrap failed', error);
    renderFatalError(error);
  }
}

function render() {
  const state = store.getState();
  const page = renderPage(state);
  root.innerHTML = `
    <div class="shell">
      ${renderSidebar(state)}
      <section class="shell-main">
        ${renderTopBar(state)}
        ${renderWorkspace(page)}
      </section>
    </div>
  `;

  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('input', (event) => {
      store.setState({ chatInput: event.target.value });
    });
  }
}

function renderFatalError(error) {
  root.innerHTML = `
    <section class="fatal-shell">
      <div class="panel">
        <div class="eyebrow">Startup Error</div>
        <h3>GradeGuru failed to initialize.</h3>
        <pre>${escapeHtml(error?.stack || error?.message || String(error))}</pre>
      </div>
    </section>
  `;
}

async function refreshDashboardData() {
  const state = store.getState();
  const payload = await window.gradeGuru.app.bootstrap();
  const currentClassId = state.currentClass?.id || payload.currentClass?.id || null;
  const assignments = currentClassId ? await window.gradeGuru.assignments.list(currentClassId) : [];

  let currentAssignment = null;
  let currentChat = null;
  let messages = [];

  if (state.currentAssignment?.id) {
    currentAssignment = await window.gradeGuru.assignments.get(state.currentAssignment.id);
    currentChat = currentAssignment?.chats?.find((item) => item.id === state.currentChat?.id)
      || currentAssignment?.chats?.[0]
      || null;
    messages = currentChat ? await window.gradeGuru.chats.messages(currentChat.id) : [];
  }

  store.setState({
    dashboard: payload.dashboard,
    classes: payload.classes,
    currentClass: payload.classes.find((item) => item.id === currentClassId) || null,
    assignments,
    currentAssignment,
    currentChat,
    messages,
    models: payload.models,
    selectedModel: payload.selectedModel,
    settings: payload.settings,
    plugins: payload.plugins,
  });
}

function renderPage(state) {
  switch (state.route.name) {
    case 'classes':
      return renderClassesPage(state);
    case 'assignment':
      return renderAssignmentPage(state);
    case 'tools':
      return renderToolsPage(state);
    case 'settings':
      return renderSettingsPage(state);
    default:
      return renderDashboardPage(state);
  }
}

async function openAssignment(assignmentId, options = {}) {
  const assignment = await window.gradeGuru.assignments.get(assignmentId);
  const assignments = await window.gradeGuru.assignments.list(assignment.classId);
  const messages = assignment.chats[0] ? await window.gradeGuru.chats.messages(assignment.chats[0].id) : [];
  store.update((state) => ({
    ...resetChatDraft(state),
    route: { name: 'assignment', params: { assignmentId } },
    currentClass: state.classes.find((item) => item.id === assignment.classId) || state.currentClass,
    assignments,
    currentAssignment: assignment,
    currentChat: assignment.chats[0] || null,
    messages,
    assignmentView: options.assignmentView || 'overview',
    chatInput: options.draft || '',
    pendingToolResult: null,
  }));
  const nextHash = `#/assignment/${assignmentId}`;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

async function selectClass(classId) {
  const assignments = await window.gradeGuru.assignments.list(classId);
  const currentClass = store.getState().classes.find((item) => item.id === classId) || null;
  store.update((state) => ({
    ...resetChatDraft(state),
    route: { name: 'classes', params: {} },
    currentClass,
    assignments,
    currentAssignment: null,
    currentChat: null,
    messages: [],
    pendingToolResult: null,
  }));
  window.location.hash = '#/classes';
}

async function createClass() {
  const input = document.getElementById('newClassName');
  if (!input?.value.trim()) {
    return;
  }
  await window.gradeGuru.classes.create({ name: input.value.trim() });
  const classes = await window.gradeGuru.classes.list();
  store.setState({ classes });
  input.value = '';
}

async function createAssignment() {
  const state = store.getState();
  if (!state.currentClass) {
    return;
  }
  const title = document.getElementById('newAssignmentTitle')?.value.trim();
  if (!title) {
    return;
  }
  const dueDate = document.getElementById('newAssignmentDueDate')?.value || '';
  const description = document.getElementById('newAssignmentDescription')?.value || '';
  const assignment = await window.gradeGuru.assignments.create({
    classId: state.currentClass.id,
    title,
    dueDate,
    description,
  });
  const assignments = await window.gradeGuru.assignments.list(state.currentClass.id);
  store.setState({ assignments });
  await openAssignment(assignment.id, { assignmentView: 'chats' });
}

async function saveAssignmentField(field) {
  const state = store.getState();
  if (!state.currentAssignment) {
    return;
  }
  const patch = {};
  if (field === 'instructions') {
    patch.instructions = document.getElementById('instructionsField')?.value || '';
  }
  if (field === 'rubric') {
    patch.rubric = document.getElementById('rubricField')?.value || '';
  }
  if (field === 'generatedWork') {
    patch.generatedWork = document.getElementById('generatedWorkField')?.value || '';
  }
  const currentAssignment = await window.gradeGuru.assignments.update({
    assignmentId: state.currentAssignment.id,
    patch,
  });
  store.setState({ currentAssignment: { ...state.currentAssignment, ...currentAssignment } });
}

async function attachSource() {
  const state = store.getState();
  if (!state.currentAssignment) {
    return;
  }
  await window.gradeGuru.assignments.attachSource({ assignmentId: state.currentAssignment.id });
  const refreshed = await window.gradeGuru.assignments.get(state.currentAssignment.id);
  store.setState({ currentAssignment: refreshed });
}

async function createChat() {
  const state = store.getState();
  if (!state.currentAssignment) {
    return;
  }
  const chat = await window.gradeGuru.chats.create(state.currentAssignment.id);
  const refreshed = await window.gradeGuru.assignments.get(state.currentAssignment.id);
  store.setState({
    currentAssignment: refreshed,
    currentChat: chat,
    messages: [],
    assignmentView: 'chats',
  });
}

async function sendChat() {
  const state = store.getState();
  if (!state.currentAssignment || !state.currentChat || !state.chatInput.trim() || state.isStreaming) {
    return;
  }

  const outgoingMessage = state.chatInput;
  const attachments = state.pendingChatAttachments;
  store.update((current) => ({
    ...current,
    messages: [...current.messages, {
      id: `local-${Date.now()}`,
      role: 'user',
      content: outgoingMessage,
      attachments,
      timestamp: new Date().toISOString(),
    }],
    chatInput: '',
    pendingChatAttachments: [],
    isStreaming: true,
  }));

  await window.gradeGuru.chats.send({
    assignmentId: state.currentAssignment.id,
    chatId: state.currentChat.id,
    message: outgoingMessage,
    attachments,
  });

  const messages = await window.gradeGuru.chats.messages(state.currentChat.id);
  const refreshed = await window.gradeGuru.assignments.get(state.currentAssignment.id);
  store.setState({
    currentAssignment: refreshed,
    messages,
    isStreaming: false,
    streamMessageId: null,
  });
}

async function pickChatAttachment(kind) {
  const filePaths = await window.gradeGuru.dialog.openFiles({
    properties: ['openFile'],
    filters: kind === 'image'
      ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      : [{ name: 'Documents', extensions: ['txt', 'md', 'json', 'csv', 'pdf', 'docx'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (!filePaths.length) {
    return;
  }
  const [path] = filePaths;
  store.update((state) => ({
    ...state,
    pendingChatAttachments: [...state.pendingChatAttachments, {
      path,
      name: path.split(/[/\\]/).pop(),
      kind,
    }],
  }));
}

async function runTool(toolName) {
  let input = {};
  if (toolName === 'math_solver') {
    input.problem = document.getElementById('mathSolverInput')?.value || '';
  }
  if (toolName === 'citation_formatter') {
    input = {
      title: document.getElementById('citationTitle')?.value || '',
      author: document.getElementById('citationAuthor')?.value || '',
      year: document.getElementById('citationYear')?.value || '',
      style: store.getState().settings.citationStyle || 'APA',
    };
  }
  if (toolName === 'image_problem_solver') {
    const filePaths = await window.gradeGuru.dialog.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'txt'] }],
    });
    if (!filePaths.length) {
      return;
    }
    input.filePath = filePaths[0];
  }
  const result = await window.gradeGuru.tools.run({ name: toolName, input });
  const nextState = {
    toolOutput: JSON.stringify(result.output, null, 2),
  };

  if (typeof result.output === 'string') {
    nextState.pendingToolResult = result;
    if (store.getState().currentAssignment) {
      nextState.chatInput = result.output;
    }
  }

  store.setState(nextState);
}

async function saveModel() {
  const modelId = document.getElementById('modelSelect')?.value;
  const selectedModel = await window.gradeGuru.models.select(modelId);
  store.setState({ selectedModel });
}

async function saveSettings() {
  const citationStyle = document.getElementById('citationStyle')?.value || 'APA';
  const settings = await window.gradeGuru.settings.set({ citationStyle });
  store.setState({ settings });
}

function handleUseToolPrompt() {
  const value = document.getElementById('essayWriterInput')?.value || '';
  if (!value.trim()) {
    return;
  }
  const result = {
    type: 'toolResult',
    tool: 'essay_writer',
    output: `Create an outline and first draft plan for this essay request:\n${value}`,
  };

  if (store.getState().currentAssignment) {
    store.setState({
      pendingToolResult: result,
      chatInput: result.output,
      route: { name: 'assignment', params: { assignmentId: store.getState().currentAssignment.id } },
      assignmentView: 'chats',
      toolOutput: result.output,
    });
    window.location.hash = `#/assignment/${store.getState().currentAssignment.id}`;
    return;
  }

  store.setState({
    pendingToolResult: result,
    toolOutput: 'Select an assignment below to route this tool output into an assignment chat.',
  });
}

async function routeToolResultToAssignment(assignmentId) {
  const pendingToolResult = store.getState().pendingToolResult;
  if (!pendingToolResult) {
    return;
  }
  await openAssignment(assignmentId, {
    assignmentView: 'chats',
    draft: typeof pendingToolResult.output === 'string'
      ? pendingToolResult.output
      : JSON.stringify(pendingToolResult.output, null, 2),
  });
}

window.addEventListener('hashchange', async () => {
  const route = parseRoute(window.location.hash);
  const state = store.getState();

  if (route.name === 'assignment' && route.params.assignmentId === state.currentAssignment?.id) {
    store.setState({ route });
    render();
    return;
  }

  if (route.name === 'classes' && state.route.name === 'classes') {
    store.setState({ route });
    render();
    return;
  }

  store.setState({ route });
  if (route.name === 'assignment' && route.params.assignmentId) {
    await openAssignment(route.params.assignmentId);
  } else if (route.name === 'classes' && state.currentClass) {
    await selectClass(state.currentClass.id);
  } else {
    render();
  }
});

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) {
    return;
  }
  const action = target.dataset.action;

  if (action === 'select-class') await selectClass(Number(target.dataset.classId));
  if (action === 'open-assignment') await openAssignment(Number(target.dataset.assignmentId));
  if (action === 'create-class') await createClass();
  if (action === 'create-assignment') await createAssignment();
  if (action === 'set-assignment-view') store.setState({ assignmentView: target.dataset.view });
  if (action === 'save-instructions') await saveAssignmentField('instructions');
  if (action === 'save-rubric') await saveAssignmentField('rubric');
  if (action === 'save-generated-work') await saveAssignmentField('generatedWork');
  if (action === 'attach-source') await attachSource();
  if (action === 'new-chat') await createChat();
  if (action === 'send-chat') await sendChat();
  if (action === 'pick-chat-files') await pickChatAttachment('file');
  if (action === 'pick-chat-image') await pickChatAttachment('image');
  if (action === 'run-tool') await runTool(target.dataset.tool);
  if (action === 'pick-tool-image') await runTool('image_problem_solver');
  if (action === 'route-tool-result') await routeToolResultToAssignment(Number(target.dataset.assignmentId));
  if (action === 'save-model') await saveModel();
  if (action === 'save-settings') await saveSettings();
  if (action === 'use-tool-prompt') handleUseToolPrompt();
  render();
});

store.subscribe(() => render());

bootstrap();

window.addEventListener('beforeunload', () => {
  detachStreamListener?.();
  detachMutationListener?.();
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
