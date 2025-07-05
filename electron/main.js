import { app, BrowserWindow, Menu, globalShortcut } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let bridgeProcess;

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
    fullscreenable: true
  });

  // Create minimal menu for fullscreen functionality
  const menuTemplate = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            const isFullScreen = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFullScreen);
          }
        },
        {
          label: 'Maximize',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow.isMaximized()) {
              mainWindow.unmaximize();
            } else {
              mainWindow.maximize();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.minimize();
          }
        }
      ]
    },
    {
      label: 'Application',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

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
  const bridgePath = isDev 
    ? join(__dirname, '../bridge-server/server.js')
    : join(process.resourcesPath, 'bridge-server/server.js');

  console.log('Starting bridge server at:', bridgePath);

  bridgeProcess = spawn('node', [bridgePath], {
    stdio: 'pipe',
    cwd: isDev ? join(__dirname, '..') : process.resourcesPath
  });

  bridgeProcess.stdout.on('data', (data) => {
    console.log(`Bridge: ${data}`);
  });

  bridgeProcess.stderr.on('data', (data) => {
    console.error(`Bridge Error: ${data}`);
  });

  bridgeProcess.on('close', (code) => {
    console.log(`Bridge process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  startBridgeServer();

  // Register global shortcuts
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    }
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
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
  
  if (bridgeProcess) {
    bridgeProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (bridgeProcess) {
    bridgeProcess.kill();
  }
});
