require('dotenv').config();
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Make fs.readdirAsync function with promises
const readdirAsync = promisify(fs.readdir);

let mainWindow;

// Check if the app is in development mode
const isDev = process.env.NODE_ENV === 'development';

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: false,  // Disable Node.js integration in renderer process
          contextIsolation: true,  // Isolate the context for security
          preload: path.join(__dirname, 'preload.js'),  // Make sure this path is correct
        },
    });

    if (isDev) {
        // In development mode, load from the dev server
        mainWindow.loadURL('http://localhost:8080');
    } else {
        // In production, load the index.html from the dist directory
        mainWindow.loadFile(path.join(__dirname, 'dist-vue', 'index.html'));
    }

    // Open developer tools in development mode
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
});

// Open the directory picker dialog
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']  // Allow selecting directories only
  });
  if (result.canceled) {
    return null; // User canceled the dialog
  } else {
    const directoryPath = result.filePaths[0];
    const files = await readdirAsync(directoryPath); // Read files in the directory
    return files.length;  // Return the number of files
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
