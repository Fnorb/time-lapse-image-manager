const { contextBridge, ipcRenderer } = require('electron');

// Expose API to renderer process (Vue app)
contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
});
