require('dotenv').config();
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sharp = require('sharp');

// Make fs.readdirAsync function with promises
const readdirAsync = promisify(fs.readdir);

let mainWindow;

// Flag to track if processing should be canceled
let cancelProcessingRequested = false;

// Array containing files flagged for deletion
let filesFlaggedForDeletion = [];
let lastImageBrightness = -1;
let brightnessValues = [];

// Check if the app is in development mode
const isDev = process.env.NODE_ENV === 'development';

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // Disable Node.js integration in renderer process
      contextIsolation: true, // Isolate the context for security
      preload: path.join(__dirname, 'preload.js'), // Make sure this path is correct
    },
    autoHideMenuBar: true, // This hides the menu bar
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
    // mainWindow.webContents.openDevTools();
  }
});

// Open Directory Dialog
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

// Process Images Based on Brightness
ipcMain.handle('processImages', async (event, payload) => {
  console.log("starting processing")
  console.log("payload: ",payload)
  cancelProcessingRequested = false;
  const { directoryPath, options } = payload;
  filesFlaggedForDeletion = [];


  // Function to calculate brightness stats
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

      // Calculate brightness using the luminosity formula
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalBrightness += brightness;
      pixelCount++;
    }

    const averageBrightness = totalBrightness / pixelCount;

    // Scale the brightness to 0-100 range
    return Math.round(averageBrightness / 2.55);
  }

  try {
    const files = await readdirAsync(directoryPath);
    const jpgFiles = files.filter(file => file.endsWith('.jpg'));
    let passedCount = 0;

    for (let file of jpgFiles) {
      // Check for cancel signal before processing each file
      if (cancelProcessingRequested) {
        return { success: false, error: 'Processing canceled by user.' };
      }

      const filePath = path.join(directoryPath, file);
      let passed = true;

      // Calculate average brightness
      const averageBrightness = await calculateBrightness(filePath);

      // Apply minimum brightness check
      if (options.minBrightness !== undefined && averageBrightness < options.minBrightness) {
        passed = false;
      }

      // Apply maximum brightness check if the image has passed so far
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

      // Send feedback to the frontend
      const status = passed ? 'passed' : 'failed';
      event.sender.send('image-status', { file, status });
    }

    /* if (options.neighborDifference !== undefined) {
      for (let brightnessValue of brightnessValues) {
        if (passed && options.neighborDifference !== undefined && Math.abs(averageBrightness - lastImageBrightness) > options.neighborDifference) {
          passed = false;
        } 
      }
    } */
    

    return { success: true, passedCount, totalCount: jpgFiles.length, flaggedCount: filesFlaggedForDeletion.length };
  } catch (error) {
    console.error('Error processing images:', error);
    return { success: false, error: error.message };
  }
});

// Handle cancel processing request from frontend
ipcMain.handle('cancelProcessing', () => {
  cancelProcessingRequested = true; // Set the flag to cancel processing
  console.log('Processing has been canceled.');
  return { success: true };
});

// Handle cancel processing request from frontend
ipcMain.handle('deleteFlaggedFiles', async () => {
  try {
    let deleteCount = 0;

    // Iterate through each file and delete it
    for (let file of filesFlaggedForDeletion) {
      await fs.promises.unlink(file); // Delete the file
      deleteCount++;
    }

    // Return success with the count of deleted files
    return { success: true, deleteCount };
  } catch (error) {
    console.error('Error deleting files:', error);
    return { success: false, error: error.message };
  }
});


// Rename Files
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

      // Rename the file
      await fs.promises.rename(oldFilePath, newFilePath);
      renamedCount++;

      // Send the rename event back to the renderer with the old and new file names
      event.sender.send('file-renamed', `${jpgFiles[i]} -> ${newFileName}`);
    }

    // Send a final completion message once all files are renamed
    event.sender.send('renaming-complete', `All files renamed successfully: ${renamedCount} files`);
    return { success: true, renamedCount };
  } catch (error) {
    console.error('Error renaming files:', error);
    event.sender.send('renaming-failed', `Renaming failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});