const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  processImages: (payload) => ipcRenderer.invoke('processImages', payload),
  
  onImageStatus: (callback) => ipcRenderer.on('image-status', (event, { file, status, averageBrightness }) => {
    callback(file, status, averageBrightness);
  }),

  removeImageStatusListener: () => ipcRenderer.removeAllListeners('image-status'),

  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  cancelProcessing: () => ipcRenderer.invoke('cancelProcessing'),

  deleteFlaggedFiles: () => ipcRenderer.invoke('deleteFlaggedFiles'),

  renameFiles: (directoryPath) => ipcRenderer.invoke('files:rename', directoryPath),

  deleteHalfOfImages: (directoryPath) => ipcRenderer.invoke('files:deleteHalf', directoryPath),

  getFileCount: (directoryPath) => ipcRenderer.invoke('files:getFileCount', directoryPath),
});

