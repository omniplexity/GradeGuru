const { BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { DatabaseManager } = require('../backend/storage/database');
const { ProjectStore } = require('../backend/storage/projectStore');
const { AssignmentStore } = require('../backend/storage/assignmentStore');
const { ChatStore } = require('../backend/storage/chatStore');
const { VectorIndex } = require('../backend/rag/vectorIndex');
const { ModelRouter } = require('../backend/ai/modelRouter');
const { ToolManager } = require('../backend/tools/toolManager');
const { AIEngine } = require('../backend/ai/aiEngine');
const { PluginManager } = require('../backend/plugins/pluginManager');

const registeredChannels = [
  'app:bootstrap',
  'classes:list',
  'classes:create',
  'assignments:list',
  'assignment:get',
  'assignment:create',
  'assignment:update',
  'assignment:attachSource',
  'chat:create',
  'chat:list',
  'chat:messages',
  'chat:send',
  'tools:list',
  'tools:run',
  'models:list',
  'models:select',
  'settings:get',
  'settings:set',
  'plugins:list',
  'dialog:openFiles',
];

function registerIpcHandlers({ app, mainWindow }) {
  const db = new DatabaseManager(app);
  const chatStore = new ChatStore(db);
  const projectStore = new ProjectStore(db);
  const assignmentStore = new AssignmentStore(db, chatStore);
  const vectorIndex = new VectorIndex(db);
  const modelRouter = new ModelRouter(app);
  const toolManager = new ToolManager();
  const pluginManager = new PluginManager(path.join(process.cwd(), 'plugins'));
  const aiEngine = new AIEngine({
    assignmentStore,
    chatStore,
    vectorIndex,
    modelRouter,
    toolManager,
  });

  projectStore.ensureSeedData({ assignmentStore, chatStore, vectorIndex });

  function broadcast(eventName, payload) {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(eventName, payload);
    });
  }

  ipcMain.handle('app:bootstrap', async () => {
    const classes = projectStore.listClasses();
    const currentClass = classes[0] || null;
    const assignments = currentClass ? assignmentStore.listAssignmentsByClass(currentClass.id) : [];
    const currentAssignment = assignments[0] || null;
    const chats = currentAssignment ? chatStore.listChatsByAssignment(currentAssignment.id) : [];
    const currentChat = chats[0] || null;

    return {
      dashboard: projectStore.getDashboardSnapshot(),
      classes,
      assignments,
      currentClass,
      currentAssignment,
      currentChat,
      messages: currentChat ? chatStore.listMessages(currentChat.id) : [],
      tools: toolManager.listTools(),
      models: modelRouter.listModels(),
      selectedModel: modelRouter.getSelectedModel(),
      settings: projectStore.getSettings(),
      plugins: pluginManager.listPlugins(),
    };
  });

  ipcMain.handle('classes:list', () => projectStore.listClasses());
  ipcMain.handle('classes:create', (event, payload) => {
    const created = projectStore.createClass(payload);
    broadcast('data:mutated', { type: 'class:create', id: created.id });
    return created;
  });

  ipcMain.handle('assignments:list', (event, classId) => assignmentStore.listAssignmentsByClass(classId));
  ipcMain.handle('assignment:get', (event, assignmentId) => assignmentStore.getAssignmentBundle(assignmentId, chatStore));
  ipcMain.handle('assignment:create', (event, payload) => {
    const created = assignmentStore.createAssignment(payload);
    broadcast('data:mutated', { type: 'assignment:create', id: created.id });
    return created;
  });
  ipcMain.handle('assignment:update', (event, payload) => {
    const updated = assignmentStore.updateAssignment(payload.assignmentId, payload.patch);
    broadcast('data:mutated', { type: 'assignment:update', id: payload.assignmentId });
    return updated;
  });

  ipcMain.handle('assignment:attachSource', async (event, payload) => {
    let filePaths = payload?.filePaths;
    if (!filePaths || filePaths.length === 0) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Documents', extensions: ['txt', 'md', 'json', 'csv', 'pdf', 'docx'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled) {
        return [];
      }
      filePaths = result.filePaths;
    }

    const added = [];
    for (const filePath of filePaths) {
      const source = assignmentStore.addSource(payload.assignmentId, {
        filePath,
        type: path.extname(filePath).slice(1) || 'file',
      });
      await vectorIndex.indexSource(source);
      added.push(source);
    }
    broadcast('data:mutated', { type: 'source:add', assignmentId: payload.assignmentId });
    return added;
  });

  ipcMain.handle('chat:create', (event, assignmentId) => {
    const chat = chatStore.createChat(assignmentId);
    broadcast('data:mutated', { type: 'chat:create', assignmentId, id: chat.id });
    return chat;
  });
  ipcMain.handle('chat:list', (event, assignmentId) => chatStore.listChatsByAssignment(assignmentId));
  ipcMain.handle('chat:messages', (event, chatId) => chatStore.listMessages(chatId));
  ipcMain.handle('chat:send', async (event, payload) => {
    const userMessage = chatStore.addMessage(payload.chatId, {
      role: 'user',
      content: payload.message,
      attachments: payload.attachments || [],
    });

    const assistantMessage = await aiEngine.streamAssignmentResponse({
      assignmentId: payload.assignmentId,
      chatId: payload.chatId,
      message: payload.message,
      attachments: payload.attachments || [],
      onChunk: (chunk) => event.sender.send('chat:stream', chunk),
    });

    const result = {
      userMessage,
      assistantMessage,
    };
    broadcast('data:mutated', { type: 'message:send', assignmentId: payload.assignmentId, chatId: payload.chatId });
    return result;
  });

  ipcMain.handle('tools:list', () => toolManager.listTools());
  ipcMain.handle('tools:run', async (event, payload) => toolManager.runTool(payload.name, payload.input));

  ipcMain.handle('models:list', () => modelRouter.listModels());
  ipcMain.handle('models:select', (event, modelId) => modelRouter.selectModel(modelId));

  ipcMain.handle('settings:get', () => projectStore.getSettings());
  ipcMain.handle('settings:set', (event, patch) => projectStore.updateSettings(patch));

  ipcMain.handle('plugins:list', () => pluginManager.listPlugins());
  ipcMain.handle('dialog:openFiles', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: options?.properties || ['openFile'],
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? [] : result.filePaths;
  });

  return {
    db,
  };
}

function disposeIpcHandlers(services) {
  registeredChannels.forEach((channel) => ipcMain.removeHandler(channel));
  services?.db?.close();
}

module.exports = {
  registerIpcHandlers,
  disposeIpcHandlers,
};
