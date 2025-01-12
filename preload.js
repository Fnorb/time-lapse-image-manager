/*const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open the directory
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // Remove Bright/Dark images
  removeBrightnessImages: (directoryPath, minBrightness, maxBrightness) => 
    ipcRenderer.invoke('images:removeBrightness', directoryPath, minBrightness, maxBrightness),


  // Listen for file-renamed event (send messages when files are renamed)
  onFileRenamed: (callback) => ipcRenderer.on('file-renamed', (event, message) => callback(message)),

  // Listen for file-renamed event (send messages when files are renamed)
  onBrightnessChecked: (callback) => ipcRenderer.on('brightness-checked', (event, message) => callback(message)),

  // Listen for renaming-complete event (when renaming process is finished)
  onRenamingComplete: (callback) => ipcRenderer.on('renaming-complete', (event, message) => callback(message)),

  // Listen for renaming-failed event (when renaming fails)
  onRenamingFailed: (callback) => ipcRenderer.on('renaming-failed', (event, message) => callback(message))
});*/
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  processImages: (payload) => ipcRenderer.invoke('processImages', payload),
  
  // Add listener for image status updates
  onImageStatus: (callback) => ipcRenderer.on('image-status', (event, { file, status }) => {
    callback(file, status); // Trigger the callback with the file and its status
  }),

  // Optionally, remove listener when no longer needed to prevent memory leaks
  removeImageStatusListener: () => ipcRenderer.removeAllListeners('image-status'),

  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // Handle canceling the processing
  cancelProcessing: () => ipcRenderer.invoke('cancelProcessing'),

  // Delete flagged files
  deleteFlaggedFiles: () => ipcRenderer.invoke('deleteFlaggedFiles'),

  // Rename files and handle the events for renaming
  renameFiles: (directoryPath) => ipcRenderer.invoke('files:rename', directoryPath),
});

