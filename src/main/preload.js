const { contextBridge, ipcRenderer } = require('electron');

const api = {
  app: {
    bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
    onDataMutated: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('data:mutated', listener);
      return () => ipcRenderer.removeListener('data:mutated', listener);
    },
  },
  classes: {
    list: () => ipcRenderer.invoke('classes:list'),
    create: (payload) => ipcRenderer.invoke('classes:create', payload),
  },
  assignments: {
    list: (classId) => ipcRenderer.invoke('assignments:list', classId),
    get: (assignmentId) => ipcRenderer.invoke('assignment:get', assignmentId),
    create: (payload) => ipcRenderer.invoke('assignment:create', payload),
    update: (payload) => ipcRenderer.invoke('assignment:update', payload),
    attachSource: (payload) => ipcRenderer.invoke('assignment:attachSource', payload),
  },
  chats: {
    create: (assignmentId) => ipcRenderer.invoke('chat:create', assignmentId),
    list: (assignmentId) => ipcRenderer.invoke('chat:list', assignmentId),
    messages: (chatId) => ipcRenderer.invoke('chat:messages', chatId),
    send: (payload) => ipcRenderer.invoke('chat:send', payload),
    onStream: (callback) => {
      const listener = (_event, chunk) => callback(chunk);
      ipcRenderer.on('chat:stream', listener);
      return () => ipcRenderer.removeListener('chat:stream', listener);
    },
  },
  tools: {
    list: () => ipcRenderer.invoke('tools:list'),
    run: (payload) => ipcRenderer.invoke('tools:run', payload),
  },
  models: {
    list: () => ipcRenderer.invoke('models:list'),
    select: (modelId) => ipcRenderer.invoke('models:select', modelId),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
  },
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
  },
  dialog: {
    openFiles: (options) => ipcRenderer.invoke('dialog:openFiles', options),
  },
};

contextBridge.exposeInMainWorld('gradeGuru', api);
