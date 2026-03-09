const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { createMainWindow } = require('./windowManager');
const { registerIpcHandlers, disposeIpcHandlers } = require('./ipcHandlers');

let services;

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function installErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('[main] uncaughtException', error);
    dialog.showErrorBox('GradeGuru Error', error.message);
  });

  process.on('unhandledRejection', (error) => {
    console.error('[main] unhandledRejection', error);
  });
}

async function boot() {
  app.setName('GradeGuru');
  app.setPath('userData', path.join(app.getPath('appData'), 'GradeGuru'));

  const mainWindow = createMainWindow();
  services = registerIpcHandlers({ app, mainWindow });

  setupMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

app.whenReady().then(boot);
installErrorHandlers();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  disposeIpcHandlers(services);
});
