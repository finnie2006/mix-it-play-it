const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBridgeStatus: () => ipcRenderer.invoke('bridge-status'),
  onBridgeMessage: (callback) => ipcRenderer.on('bridge-message', callback),
  removeBridgeListener: (callback) => ipcRenderer.removeListener('bridge-message', callback),
  
  // Cloud Sync Server
  cloudSync: {
    startServer: (port) => ipcRenderer.invoke('cloud-sync-start-server', port),
    stopServer: () => ipcRenderer.invoke('cloud-sync-stop-server'),
    getStatus: () => ipcRenderer.invoke('cloud-sync-server-status')
  }
});
