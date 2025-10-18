import { app, BrowserWindow, Menu, globalShortcut } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;

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
    
    // Import and run the bridge server module
    if (isDev) {
      // In development, require directly
      import(join(__dirname, '../bridge-server/server.js'))
        .then(() => {
          console.log('✅ Bridge server started successfully (development mode)');
        })
        .catch((error) => {
          console.error('❌ Failed to start bridge server:', error);
        });
    } else {
      // In production, import from resources
      import(join(process.resourcesPath, 'bridge-server/server.js'))
        .then(() => {
          console.log('✅ Bridge server started successfully (production mode)');
        })
        .catch((error) => {
          console.error('❌ Failed to start bridge server:', error);
        });
    }
  } catch (error) {
    console.error('❌ Failed to start bridge server:', error);
  }
}

app.whenReady().then(() => {
  createWindow();
  startBridgeServer();

  // Register global shortcuts
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      
      // Send fullscreen state to renderer process
      mainWindow.webContents.send('fullscreen-changed', !isFullScreen);
    }
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      
      // Send fullscreen state to renderer process
      mainWindow.webContents.send('fullscreen-changed', false);
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
  // Bridge server will be cleaned up automatically when the main process exits
});
