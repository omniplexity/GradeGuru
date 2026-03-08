/**
 * Window Manager Module
 * Handles creation and management of the main application window
 */

const { BrowserWindow, screen } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.defaultWidth = 1200;
    this.defaultHeight = 800;
    this.minWidth = 800;
    this.minHeight = 600;
  }

  /**
   * Create the main application window
   * @returns {BrowserWindow} The created window instance
   */
  createMainWindow() {
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Calculate centered window position
    const windowWidth = Math.min(this.defaultWidth, screenWidth);
    const windowHeight = Math.min(this.defaultHeight, screenHeight);

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: this.minWidth,
      minHeight: this.minHeight,
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: Math.floor((screenHeight - windowHeight) / 2),
      title: 'GradeGuru',
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false, // Show when ready
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });

    // Handle window ready-to-show
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      console.log('[WindowManager] Main window displayed');
    });

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      console.log('[WindowManager] Main window closed');
    });

    // Load the renderer HTML
    this.loadRenderer();

    return this.mainWindow;
  }

  /**
   * Load the renderer HTML file
   */
  loadRenderer() {
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    this.mainWindow.loadFile(rendererPath).catch((err) => {
      console.error('[WindowManager] Failed to load renderer:', err);
    });
  }

  /**
   * Get the main window instance
   * @returns {BrowserWindow|null}
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Minimize the main window
   */
  minimize() {
    if (this.mainWindow) {
      this.mainWindow.minimize();
    }
  }

  /**
   * Maximize or restore the main window
   */
  toggleMaximize() {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    }
  }

  /**
   * Check if window is maximized
   * @returns {boolean}
   */
  isMaximized() {
    return this.mainWindow ? this.mainWindow.isMaximized() : false;
  }

  /**
   * Close the main window
   */
  close() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }

  /**
   * Set window title
   * @param {string} title
   */
  setTitle(title) {
    if (this.mainWindow) {
      this.mainWindow.setTitle(title);
    }
  }

  /**
   * Handle maximize/unmaximize events
   * @param {Function} callback
   */
  onMaximizeChange(callback) {
    if (this.mainWindow) {
      this.mainWindow.on('maximize', () => callback(true));
      this.mainWindow.on('unmaximize', () => callback(false));
    }
  }

  /**
   * Focus the main window
   */
  focus() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }
}

module.exports = new WindowManager();
