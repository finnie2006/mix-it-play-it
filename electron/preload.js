const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBridgeStatus: () => ipcRenderer.invoke('bridge-status'),
  onBridgeMessage: (callback) => ipcRenderer.on('bridge-message', callback),
  removeBridgeListener: (callback) => ipcRenderer.removeListener('bridge-message', callback)
});
