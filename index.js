require('dotenv').config();
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sharp = require('sharp');

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
    //mainWindow.webContents.openDevTools();
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

// Remove Bright/Dark Images
ipcMain.handle('images:removeBrightness', async (event, directoryPath, minBrightness, maxBrightness) => {
  const brightThreshold = 240;
  const darkThreshold = 15;

  // Function to calculate brightness stats
  async function calculateBrightnessStats(filePath) {
    const { data, info } = await sharp(filePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let totalBrightness = 0;
    let pixelCount = 0;
    let brightPixelCount = 0;
    let darkPixelCount = 0;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate brightness using the luminosity formula
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalBrightness += brightness;
      pixelCount++;

      if (brightness >= brightThreshold) brightPixelCount++;
      if (brightness <= darkThreshold) darkPixelCount++;
    }

    const averageBrightness = totalBrightness / pixelCount;

    // Scale the brightness to 0-100 range
    const scaledAverageBrightness = Math.round(averageBrightness / 2.55);

    // Calculate bright and dark pixel percentages
    const brightPixelPercentage = (brightPixelCount / pixelCount) * 100;
    const darkPixelPercentage = (darkPixelCount / pixelCount) * 100;

    return { averageBrightness: scaledAverageBrightness, brightPixelPercentage, darkPixelPercentage };
  }

  try {
    const files = await readdirAsync(directoryPath);
    const jpgFiles = files.filter(file => file.endsWith('.jpg'));
    let removedCount = 0;

    for (let file of jpgFiles) {
      const filePath = path.join(directoryPath, file);
      const { averageBrightness } = await calculateBrightnessStats(filePath); // Access averageBrightness

      // Send message to frontend for each file being checked
      if (averageBrightness < minBrightness) {
        const message = `${file}: too dark -> deleted`;
        event.sender.send('brightness-checked', message);
        await fs.promises.unlink(filePath); // Remove file if it's too dark
        removedCount++;
      } else if (averageBrightness > maxBrightness) {
        const message = `${file}: too bright -> deleted`;
        event.sender.send('brightness-checked', message);
        await fs.promises.unlink(filePath); // Remove file if it's too bright
        removedCount++;
      } else {
        const message = `${file}: brightness within range`;
        event.sender.send('brightness-checked', message);
      }
    }

    return { success: true, removedCount };
  } catch (error) {
    console.error('Error removing images:', error);
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
