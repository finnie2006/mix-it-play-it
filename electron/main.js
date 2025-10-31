import { app, BrowserWindow, Menu, globalShortcut, ipcMain } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let cloudSyncServer = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    show: false,
    titleBarStyle: 'default',
    fullscreenable: true,
    autoHideMenuBar: true
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle fullscreen changes
  mainWindow.on('enter-full-screen', () => {
    console.log('Entered fullscreen mode');
  });

  mainWindow.on('leave-full-screen', () => {
    console.log('Left fullscreen mode');
  });
}

function startBridgeServer() {
  try {
    // Run bridge server in the same process instead of spawning
    console.log('Starting bridge server in same process...');
    
    // Import and run the bridge server module using createRequire for CommonJS
    const require = createRequire(import.meta.url);
    
    if (isDev) {
      // In development, require directly
      const serverPath = join(__dirname, '../bridge-server/server.js');
      require(serverPath);
      console.log('✅ Bridge server started successfully (development mode)');
    } else {
      // In production, import from resources (now with its own node_modules)
      const serverPath = join(process.resourcesPath, 'bridge-server/server.js');
      require(serverPath);
      console.log('✅ Bridge server started successfully (production mode)');
    }
  } catch (error) {
    console.error('❌ Failed to start bridge server:', error);
  }
}

// Fullscreen control IPC handlers (for password protection)
ipcMain.handle('set-fullscreen', async (event, fullscreen) => {
  if (mainWindow) {
    mainWindow.setFullScreen(fullscreen);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-fullscreen-state', async () => {
  if (mainWindow) {
    return { isFullScreen: mainWindow.isFullScreen() };
  }
  return { isFullScreen: false };
});

// Cloud Sync Server IPC handlers
ipcMain.handle('cloud-sync-start-server', async (event, port = 8081) => {
  try {
    if (cloudSyncServer) {
      return { success: false, message: 'Server already running' };
    }

    const require = createRequire(import.meta.url);
    const CloudSyncServer = require(join(__dirname, 'cloudSyncServer.js'));
    cloudSyncServer = new CloudSyncServer(port);
    cloudSyncServer.start();

    return { success: true, message: `Cloud sync server started on port ${port}` };
  } catch (error) {
    console.error('Failed to start cloud sync server:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('cloud-sync-stop-server', async () => {
  try {
    if (cloudSyncServer) {
      cloudSyncServer.stop();
      cloudSyncServer = null;
      return { success: true, message: 'Cloud sync server stopped' };
    }
    return { success: false, message: 'Server not running' };
  } catch (error) {
    console.error('Failed to stop cloud sync server:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('cloud-sync-server-status', async () => {
  if (cloudSyncServer && cloudSyncServer.isRunning) {
    return {
      running: true,
      port: cloudSyncServer.port,
      configCount: cloudSyncServer.getConfigCount()
    };
  }
  return { running: false };
});

app.whenReady().then(() => {
  createWindow();
  startBridgeServer();

  // Register global shortcuts with password protection support
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      
      // Check with renderer if password protection is enabled before exiting fullscreen
      if (isFullScreen) {
        mainWindow.webContents.send('request-fullscreen-exit');
      } else {
        mainWindow.setFullScreen(true);
        mainWindow.webContents.send('fullscreen-changed', true);
      }
    }
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFullScreen()) {
      // Check with renderer if password protection is enabled
      mainWindow.webContents.send('request-fullscreen-exit');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Stop cloud sync server
  if (cloudSyncServer) {
    cloudSyncServer.stop();
  }
  // Bridge server will be cleaned up automatically when the main process exits
});
