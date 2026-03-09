const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
  if (mainWindow) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    title: 'GradeGuru v2',
    backgroundColor: '#efe7d8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[window] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[window] render-process-gone', details);
  });

  if (process.env.GRADEGURU_DEBUG_RENDERER === '1') {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const snapshot = await mainWindow.webContents.executeJavaScript(`
          ({
            hasBridge: Boolean(window.gradeGuru),
            title: document.title,
            bodyText: document.body.innerText.slice(0, 240),
            bodyHtmlLength: document.body.innerHTML.length
          })
        `);
        console.log('[window] renderer snapshot', snapshot);
      } catch (error) {
        console.error('[window] renderer snapshot failed', error);
      }
    });
  }

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
};
