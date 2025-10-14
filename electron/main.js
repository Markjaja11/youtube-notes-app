const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getAllVideos, getVideo, addVideo, updateTranscript, getTranscript, deleteVideo } = require('./database');
const { downloadVideo } = require('./downloader');
const { WINDOW, DIRS, VIDEO, HTTP } = require('./config/constants');
const { isValidYouTubeUrl, isValidFilename } = require('./utils/validators');

let mainWindow;

// Register custom protocol scheme privileges BEFORE app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'video',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: false,
      bypassCSP: false
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW.DEFAULT_WIDTH,
    height: WINDOW.DEFAULT_HEIGHT,
    minWidth: WINDOW.MIN_WIDTH,
    minHeight: WINDOW.MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Keep security enabled - use custom protocol instead
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
  // Register custom protocol with stream protocol for better video support
  // Using stream protocol ensures proper support for range requests (seeking)
  protocol.registerStreamProtocol('video', (request, callback) => {
    try {
      // Extract filename from URL (format: video://filename.mp4)
      let url = request.url.substr(8); // Remove 'video://'

      // Remove trailing slash if present (browsers may add it)
      url = url.replace(/\/$/, '');

      // Validate filename
      if (!isValidFilename(url)) {
        console.error('Invalid filename:', url);
        callback({ statusCode: HTTP.BAD_REQUEST, data: null });
        return;
      }

      // Validate and construct safe path
      const downloadsDir = path.join(app.getPath(DIRS.USER_DATA), DIRS.DOWNLOADS);
      const videoPath = path.normalize(path.join(downloadsDir, url));

      // Security check: ensure the resolved path is within downloads directory
      if (!videoPath.startsWith(downloadsDir)) {
        console.error('Security violation: attempted path traversal', videoPath);
        callback({ statusCode: HTTP.FORBIDDEN, data: null });
        return;
      }

      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        console.error('Video file not found:', videoPath);
        callback({ statusCode: HTTP.NOT_FOUND, data: null });
        return;
      }

      // Get file stats for proper range request handling
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;

      // Parse range header if present (for video seeking)
      const rangeHeader = request.headers.Range || request.headers.range;
      let start = 0;
      let end = fileSize - 1;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : end;
      }

      // Create read stream for the requested range
      const stream = fs.createReadStream(videoPath, { start, end });

      callback({
        statusCode: rangeHeader ? HTTP.PARTIAL_CONTENT : HTTP.OK,
        headers: {
          'Content-Type': VIDEO.MIME_TYPE,
          'Content-Length': (end - start + 1).toString(),
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        },
        data: stream,
      });
    } catch (error) {
      console.error('Error in video protocol handler:', error);
      callback({ statusCode: HTTP.INTERNAL_SERVER_ERROR, data: null });
    }
  });

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
  try {
    return getAllVideos();
  } catch (error) {
    console.error('Error getting videos:', error);
    return [];
  }
});

ipcMain.handle('get-video', async (event, id) => {
  try {
    return getVideo(id);
  } catch (error) {
    console.error('Error getting video:', error);
    return null;
  }
});

ipcMain.handle('download-video', async (event, url) => {
  try {
    // Validate URL
    if (!isValidYouTubeUrl(url)) {
      return { success: false, error: 'Invalid YouTube URL' };
    }

    const videoData = await downloadVideo(url);
    const video = addVideo(videoData);
    return { success: true, video };
  } catch (error) {
    console.error('Error downloading video:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-transcript', async (event, videoId, content) => {
  try {
    updateTranscript(videoId, content);
    return { success: true };
  } catch (error) {
    console.error('Error updating transcript:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-transcript', async (event, videoId) => {
  try {
    return getTranscript(videoId);
  } catch (error) {
    console.error('Error getting transcript:', error);
    return '';
  }
});

ipcMain.handle('delete-video', async (event, id) => {
  try {
    deleteVideo(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
