const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose Electron APIs to the renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Initiates image processing with the provided payload.
   * @param {Object} payload - The data required for processing images.
   */
  processImages: (payload) => ipcRenderer.invoke('processImages', payload),

  /**
   * Subscribes to the 'image-status' event to receive updates on image processing.
   * @param {Function} callback - Function to handle updates (file, status, averageBrightness).
   */
  onImageStatus: (callback) =>
    ipcRenderer.on('image-status', (event, { file, status, averageBrightness }) => {
      callback(file, status, averageBrightness);
    }),

  /**
   * Removes all listeners for the 'image-status' event.
   */
  removeImageStatusListener: () => ipcRenderer.removeAllListeners('image-status'),

  /**
   * Opens a directory selection dialog and returns the selected path.
   * @returns {Promise<string>} - The selected directory path.
   */
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  /**
   * Cancels the current image processing task.
   */
  cancelProcessing: () => ipcRenderer.invoke('cancelProcessing'),

  /**
   * Deletes flagged image files.
   */
  deleteFlaggedFiles: () => ipcRenderer.invoke('deleteFlaggedFiles'),

  /**
   * Renames files in the specified directory.
   * @param {string} directoryPath - Path of the directory containing files to rename.
   */
  renameFiles: (directoryPath) => ipcRenderer.invoke('files:rename', directoryPath),

  /**
   * Deletes half of the images in the specified directory.
   * @param {string} directoryPath - Path of the directory containing images.
   */
  deleteHalfOfImages: (directoryPath) => ipcRenderer.invoke('files:deleteHalf', directoryPath),

  /**
   * Retrieves the number of files in the specified directory.
   * @param {string} directoryPath - Path of the directory to inspect.
   * @returns {Promise<number>} - The count of files in the directory.
   */
  getFileCount: (directoryPath) => ipcRenderer.invoke('files:getFileCount', directoryPath),
});
