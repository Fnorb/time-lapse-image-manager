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

app.on('ready', () => {
  let windowWidth = parseInt(process.env.WIDTH);
  if (isDev && process.env.SHOW_DEVTOOLS.toLocaleLowerCase() === 'true') {
    windowWidth = windowWidth + 1000;
  }

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: parseInt(process.env.HEIGHT),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true, 
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist-vue', 'index.html'));
  }

  if (isDev && process.env.SHOW_DEVTOOLS.toLocaleLowerCase() === 'true') {
    mainWindow.webContents.openDevTools();
  }
});

ipcMain.handle('files:getFileCount', async (event, directoryPath) => {
    const outputExtension = '.jpg';
  
    try {
      const files = await readdirAsync(directoryPath);
      const jpgFiles = files.filter(file => file.endsWith(outputExtension));
      const fileCount = jpgFiles.length;
      return { success: true, fileCount };
    } catch (error) {
      console.error('Error getting files:', error);
      event.sender.send('getting-failed', `Getting files failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return null;
  }

  const directoryPath = result.filePaths[0];
  const files = await readdirAsync(directoryPath);
  return { fileCount: files.length, directoryPath };
});

ipcMain.handle('processImages', async (event, payload) => {
  console.log("START PROCESSING");
  cancelProcessingRequested = false;
  const { directoryPath, options } = payload;
  filesFlaggedForDeletion = [];
  let file = '';

  async function calculateBrightness(filePath) {
    const { data, info } = await sharp(filePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalBrightness = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalBrightness += brightness;
      pixelCount++;
    }

    const averageBrightness = totalBrightness / pixelCount;

    return Math.round(averageBrightness / 2.55);
  }

  try {
    const files = await readdirAsync(directoryPath);
    const jpgFiles = files.filter(file => file.endsWith('.jpg'));
    let passedCount = 0;

    for (file of jpgFiles) {
      if (cancelProcessingRequested) {
        return { success: true, error: 'byUserCancel' };
      }

      const filePath = path.join(directoryPath, file);
      let passed = true;

      const averageBrightness = await calculateBrightness(filePath);

      if (options.minBrightness !== undefined && averageBrightness < options.minBrightness) {
        passed = false;
      }

      if (passed && options.maxBrightness !== undefined && averageBrightness > options.maxBrightness) {
        passed = false;
      }


      /* if (passed && options.neighborDifference !== undefined && Math.abs(averageBrightness - lastImageBrightness) > options.neighborDifference) {
        passed = false;
      }*/ 

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

    return { success: true, passedCount, totalCount: jpgFiles.length, flaggedCount: filesFlaggedForDeletion.length };
  } catch (error) {
    console.error('Error processing images:', error);
    return { success: false, error: error.message, filename: file };
  }
});

ipcMain.handle('cancelProcessing', () => {
  cancelProcessingRequested = true;
  return { success: true };
});

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

ipcMain.handle('files:deleteHalf', async (event, directoryPath) => {
  console.log("deleting half backend")
  try {
    const files = await readdirAsync(directoryPath);
    const jpgFiles = files.filter(file => file.endsWith('.jpg')); // Ensure correct extension handling

    let deleteCount = 0;

    for (let i = 0; i < jpgFiles.length; i++) {
      if (i % 2 === 0) {
        const filePath = path.join(directoryPath, jpgFiles[i]); // Construct the full file path
        await fs.promises.unlink(filePath);
        deleteCount++;
      }
    }

    return { success: true, deleteCount };
  } catch (error) {
    console.error('Error deleting files:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('files:rename', async (event, directoryPath) => {
  const outputPrefix = 'img-';
  const outputExtension = '.jpg';

  try {
    const files = await readdirAsync(directoryPath);
    const jpgFiles = files.filter(file => file.endsWith(outputExtension));

    jpgFiles.sort();
    let renamedCount = 0;

    for (let i = 0; i < jpgFiles.length; i++) {
      const oldFilePath = path.join(directoryPath, jpgFiles[i]);
      const newFileName = `${outputPrefix}${String(i + 1).padStart(5, '0')}${outputExtension}`;
      const newFilePath = path.join(directoryPath, newFileName);

      await fs.promises.rename(oldFilePath, newFilePath);
      renamedCount++;

      event.sender.send('file-renamed', `${jpgFiles[i]} -> ${newFileName}`);
    }

    event.sender.send('renaming-complete', `All files renamed successfully: ${renamedCount} files`);
    return { success: true, renamedCount };
  } catch (error) {
    console.error('Error renaming files:', error);
    event.sender.send('renaming-failed', `Renaming failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});