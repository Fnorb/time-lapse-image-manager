// Backend Init
require('dotenv').config();
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sharp = require('sharp');
const readdirAsync = promisify(fs.readdir);

let mainWindow;
let cancelProcessingRequested = false;
let filesFlaggedForDeletion = [];
let brightnessValues = [];
const isDev = process.env.NODE_ENV === 'development';

const WINDOW_WIDTH = parseInt(process.env.WIDTH, 10) || 800;
const WINDOW_HEIGHT = parseInt(process.env.HEIGHT, 10) || 600;
const SHOW_DEVTOOLS = process.env.SHOW_DEVTOOLS?.toLowerCase() === 'true';
const validExtensions = process.env.VALID_EXTENSIONS ? process.env.VALID_EXTENSIONS.split(',').map(ext => ext.trim().toLowerCase()) : [];

function createMainWindow() {
  let windowWidth = WINDOW_WIDTH;
  if (isDev && SHOW_DEVTOOLS) {
    windowWidth += 1000;
  }

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: WINDOW_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  const startURL = isDev
    ? 'http://localhost:8080'
    : path.join(__dirname, 'dist-vue', 'index.html');

  if (isDev) {
    mainWindow.loadURL(startURL);
    if (SHOW_DEVTOOLS) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(startURL);
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Get the current number of image files in the target directory
ipcMain.handle('files:getFileCount', async (event, directoryPath) => {
  try {
    if (!fs.existsSync(directoryPath)) {
      throw new Error('Directory does not exist');
    }

    const files = await readdirAsync(directoryPath);
    const imageFiles = files.filter(file => validExtensions.includes(path.extname(file).toLowerCase()));

    return { success: true, fileCount: imageFiles.length };
  } catch (error) {
    event.sender.send('getting-failed', `Failed to get file count: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Directory picker
ipcMain.handle('dialog:openDirectory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'User canceled directory selection' };
    }

    const directoryPath = result.filePaths[0];

    if (!fs.existsSync(directoryPath)) {
      return { success: false, message: 'Directory does not exist' };
    }

    const files = await readdirAsync(directoryPath);
    const visibleFiles = files.filter(file => !file.startsWith('.')); 

    return { success: true, fileCount: visibleFiles.length, directoryPath };
  } catch (error) {
    return { success: false, message: `Error opening directory: ${error.message}` };
  }
});

// Analyze the filters according to the settings
ipcMain.handle('processImages', async (event, payload) => {
  cancelProcessingRequested = false;
  const { directoryPath, settings } = payload;
  filesFlaggedForDeletion = [];
  let file = '';

  // Calculate the images average brightness
  async function calculateBrightness(filePath) {
    const fileBuffer = await fs.promises.readFile(filePath);
    let sharpInstance = sharp(fileBuffer);
  
    // Resize the image in case the fast option was set
    if (settings.fast) {
      sharpInstance = sharpInstance.resize({ width: 100 });
    }
  
    const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  
    let totalBrightness = 0;
    let pixelCount = 0;
  
    for (let i = 0; i < data.length; i += info.channels * 10) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
  
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalBrightness += brightness;
      pixelCount++;
    }
  
    return Math.round(totalBrightness / pixelCount / 2.55);
  }


  try {
    const files = await readdirAsync(directoryPath);
    const validFiles = files.filter(file => validExtensions.includes(path.extname(file).toLowerCase()));
    let passedCount = 0;

    // Iterate through the images and return for each whether it passed or failed
    for (file of validFiles) {
      if (cancelProcessingRequested) {
        return { success: true, error: 'byUserCancel' };
      }

      const filePath = path.join(directoryPath, file);
      let passed = true;

      const averageBrightness = await calculateBrightness(filePath);

      if (settings.minBrightness !== undefined && averageBrightness < settings.minBrightness) {
        passed = false;
      }

      if (passed && settings.maxBrightness !== undefined && averageBrightness > settings.maxBrightness) {
        passed = false;
      }

      if (passed) {
        brightnessValues.push(averageBrightness);
        passedCount++
      }
      else {
        brightnessValues.push(-1);
        filesFlaggedForDeletion.push(filePath)
      }

      const status = passed ? 'passed' : 'failed';
      event.sender.send('image-status', { file, status, averageBrightness });
    }

    return { success: true, passedCount, totalCount: validFiles.length, flaggedCount: filesFlaggedForDeletion.length };
  } catch (error) {
    return { success: false, error: error.message, filename: file };
  }
});

// Stop whatever is done right now
ipcMain.handle('cancelProcessing', () => {
  cancelProcessingRequested = true;
  return { success: true };
});

// Delete all files in the target directory that failed the last filter
ipcMain.handle('deleteFlaggedFiles', async () => {
  try {
    let deleteCount = 0;

    for (let file of filesFlaggedForDeletion) {
      await fs.promises.unlink(file);
      deleteCount++;
    }

    return { success: true, deleteCount };
  } catch (error) {
    console.error('Error deleting files:', error);
    return { success: false, error: error.message };
  }
});

// Delete half of the files in the target directory
ipcMain.handle('files:deleteHalf', async (event, directoryPath) => {
  try {
    const files = await readdirAsync(directoryPath);
    const validFiles = files.filter(file => validExtensions.includes(path.extname(file).toLowerCase()));
    let deleteCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      if (i % 2 === 0) {
        const filePath = path.join(directoryPath, validFiles[i]);
        await fs.promises.unlink(filePath);
        deleteCount++;
      }
    }

    return { success: true, deleteCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Rename all files in the target directory
ipcMain.handle('files:rename', async (event, directoryPath) => {
  const outputPrefix = process.env.WIDTH;
  
  try {
    const files = await readdirAsync(directoryPath);
    const imageFiles = files.filter(file => path.extname(file));
    let renamedCount = 0;

    imageFiles.sort();

    for (let i = 0; i < imageFiles.length; i++) {
      const oldFilePath = path.join(directoryPath, imageFiles[i]);
      const fileExtension = path.extname(imageFiles[i]);
      let newFileName = `${outputPrefix}${String(i + 1).padStart(5, '0')}${fileExtension}`;
      let newFilePath = path.join(directoryPath, newFileName);
      let counter = 1;

      // Check for conflicts and adjust filename
      while (fs.existsSync(newFilePath)) {
        newFileName = `${outputPrefix}${String(i + 1).padStart(5, '0')}_${counter}${fileExtension}`;
        newFilePath = path.join(directoryPath, newFileName);
        counter++;
      }

      await fs.promises.rename(oldFilePath, newFilePath);
      renamedCount++;

      event.sender.send('file-renamed', `${imageFiles[i]} -> ${newFileName}`);
    }

    event.sender.send('renaming-complete', `All files renamed successfully: ${renamedCount} files`);
    return { success: true, renamedCount };
  } catch (error) {
    event.sender.send('renaming-failed', `Renaming failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

