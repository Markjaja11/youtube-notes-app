const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getAllVideos, getVideo, addVideo, updateTranscript, getTranscript, deleteVideo } = require('./database');
const { downloadVideo } = require('./downloader');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local video files
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-videos', async () => {
  return getAllVideos();
});

ipcMain.handle('get-video', async (event, id) => {
  return getVideo(id);
});

ipcMain.handle('download-video', async (event, url) => {
  try {
    const videoData = await downloadVideo(url);
    const video = addVideo(videoData);
    return { success: true, video };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-transcript', async (event, videoId, content) => {
  updateTranscript(videoId, content);
  return { success: true };
});

ipcMain.handle('get-transcript', async (event, videoId) => {
  return getTranscript(videoId);
});

ipcMain.handle('delete-video', async (event, id) => {
  deleteVideo(id);
  return { success: true };
});

ipcMain.handle('get-video-path', async (event, filename) => {
  return path.join(app.getPath('userData'), 'downloads', filename);
});
