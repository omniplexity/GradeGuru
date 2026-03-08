/**
 * GradeGuru - Main Process Entry Point
 * Electron main process handling app lifecycle, IPC, and window management
 */

const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const windowManager = require('./windowManager');

// ====================
// Global Error Handling
// ====================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
  app.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});

// ====================
// App Lifecycle
// ====================

/**
 * App is ready - create window and set up
 */
app.whenReady().then(() => {
  console.log('[Main] App ready, initializing...');

  // Create the main window
  windowManager.createMainWindow();

  // Set up IPC handlers
  setupIPCHandlers();

  // Set up menu
  setupMenu();

  // Set up window event handlers
  setupWindowEvents();

  console.log('[Main] Initialization complete');
});

/**
 * Handle macOS window re-creation
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createMainWindow();
  }
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('[Main] All windows closed, quitting app');
    app.quit();
  }
});

/**
 * App will quit - cleanup
 */
app.on('will-quit', () => {
  console.log('[Main] App will quit, cleaning up...');
});

// ====================
// IPC Handlers
// ====================

function setupIPCHandlers() {
  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    windowManager.minimize();
  });

  ipcMain.handle('window:toggle-maximize', () => {
    windowManager.toggleMaximize();
  });

  ipcMain.handle('window:close', () => {
    windowManager.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return windowManager.isMaximized();
  });

  // App info handlers
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:platform', () => {
    return process.platform;
  });

  // Settings handlers (placeholder)
  ipcMain.handle('settings:get', (event, key) => {
    // TODO: Implement settings storage
    console.log('[Main] Settings get:', key);
    return {};
  });

  ipcMain.handle('settings:set', (event, key, value) => {
    // TODO: Implement settings storage
    console.log('[Main] Settings set:', key, value);
    return { success: true };
  });

  // Plugin handlers (placeholder)
  ipcMain.handle('plugin:list', () => {
    // TODO: Implement plugin system
    console.log('[Main] Plugin list requested');
    return [];
  });

  ipcMain.handle('plugin:install', (event, pluginId) => {
    // TODO: Implement plugin installation
    console.log('[Main] Plugin install:', pluginId);
    return { success: true, pluginId };
  });

  ipcMain.handle('plugin:uninstall', (event, pluginId) => {
    // TODO: Implement plugin uninstallation
    console.log('[Main] Plugin uninstall:', pluginId);
    return { success: true, pluginId };
  });

  // Model handlers (placeholder)
  ipcMain.handle('model:list', () => {
    // TODO: Implement model management
    console.log('[Main] Model list requested');
    return [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    ];
  });

  ipcMain.handle('model:select', (event, modelId) => {
    // TODO: Implement model selection
    console.log('[Main] Model selected:', modelId);
    return { success: true, modelId };
  });

  // Message handler (placeholder for AI chat)
  ipcMain.handle('message:send', async (event, message) => {
    // TODO: Implement actual AI model integration
    console.log('[Main] Message received:', message);
    
    // Simulate response (placeholder)
    const response = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'This is a placeholder response. Implement AI model integration.',
      timestamp: new Date().toISOString(),
    };

    // Send response back to renderer
    event.sender.send('model:response', response);
    
    return response;
  });

  console.log('[Main] IPC handlers registered');
}

// ====================
// Menu Setup
// ====================

function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
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
          },
        ]
      : []),
    // File menu
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' },
            ]),
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  console.log('[Main] Application menu set up');
}

// ====================
// Window Events
// ====================

function setupWindowEvents() {
  const mainWindow = windowManager.getMainWindow();
  
  if (mainWindow) {
    // Notify renderer of maximize state changes
    windowManager.onMaximizeChange((isMaximized) => {
      const channel = isMaximized ? 'window:maximized' : 'window:unmaximized';
      mainWindow.webContents.send(channel);
    });

    // Handle renderer process errors
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('[Main] Renderer process gone:', details);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Main] Failed to load:', errorCode, errorDescription);
    });
  }
}

console.log('[Main] Main process module loaded');
