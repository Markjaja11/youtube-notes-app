const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDatabase, getAllVideos, getVideo, addVideo, updateTranscript, getTranscript, deleteVideo, createBookmark, getBookmarks, updateBookmark, deleteBookmark } = require('./database');
const { downloadVideo } = require('./downloader');
const { generateNotePDF, sanitizeFilename } = require('./pdfExporter');
const { checkFFmpegInstalled, getVideoInfo, importVideo, getFileSize, formatFileSize, LARGE_FILE_WARNING_SIZE } = require('./videoImporter');
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
  const windowOptions = {
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
  };

  // Set icon for Windows and Linux (macOS uses the app bundle icon automatically)
  if (process.platform !== 'darwin') {
    windowOptions.icon = path.join(__dirname, '../build/icon.png');
  }

  mainWindow = new BrowserWindow(windowOptions);

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

// Bookmark IPC Handlers
ipcMain.handle('create-bookmark', async (event, videoId, timestamp, title, note) => {
  try {
    const bookmark = createBookmark(videoId, timestamp, title, note);
    return { success: true, bookmark };
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-bookmarks', async (event, videoId) => {
  try {
    return getBookmarks(videoId);
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
});

ipcMain.handle('update-bookmark', async (event, id, title, note) => {
  try {
    updateBookmark(id, title, note);
    return { success: true };
  } catch (error) {
    console.error('Error updating bookmark:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-bookmark', async (event, id) => {
  try {
    deleteBookmark(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return { success: false, error: error.message };
  }
});

// PDF Export Handler
ipcMain.handle('export-pdf', async (event, videoId) => {
  try {
    // Get video data
    const video = getVideo(videoId);
    if (!video) {
      return { success: false, error: 'Video not found' };
    }

    // Get transcript
    const transcript = getTranscript(videoId);

    // Get bookmarks
    const bookmarks = getBookmarks(videoId);

    // Generate PDF buffer
    console.log('Generating PDF for video:', video.title);
    const pdfBuffer = await generateNotePDF(video, transcript, bookmarks);

    // Create default filename
    const sanitizedTitle = sanitizeFilename(video.title);
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const defaultFilename = `${sanitizedTitle}-Notes-${date}.pdf`;

    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Notes as PDF',
      defaultPath: path.join(app.getPath('documents'), defaultFilename),
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    if (canceled || !filePath) {
      return { success: false, error: 'Export canceled' };
    }

    // Write PDF to disk
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('PDF exported successfully to:', filePath);

    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return { success: false, error: error.message };
  }
});

// Video Import Handlers
ipcMain.handle('select-video-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Video File',
      properties: ['openFile'],
      filters: [
        {
          name: 'Video Files',
          extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv']
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const videoInfo = getVideoInfo(filePath);
    const fileSize = getFileSize(filePath);
    const fileSizeFormatted = formatFileSize(fileSize);
    const isLargeFile = fileSize > LARGE_FILE_WARNING_SIZE;

    return {
      success: true,
      filePath,
      videoInfo,
      fileSize,
      fileSizeFormatted,
      isLargeFile
    };
  } catch (error) {
    console.error('Error selecting video file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-ffmpeg', async () => {
  try {
    const isInstalled = await checkFFmpegInstalled();
    return { success: true, installed: isInstalled };
  } catch (error) {
    console.error('Error checking FFmpeg:', error);
    return { success: true, installed: false };
  }
});

ipcMain.handle('import-video', async (event, sourceFilePath) => {
  try {
    console.log('Importing video:', sourceFilePath);

    // Import the video (copy or convert) with progress callback
    const result = await importVideo(
      sourceFilePath,
      app.getPath('userData'),
      (progressData) => {
        // Send progress updates to renderer
        event.sender.send('import-progress', progressData);
      }
    );

    if (!result.success) {
      return { success: false, error: 'Import failed' };
    }

    // Add to database
    const videoData = {
      title: result.title,
      filename: result.fileName,
      source: 'imported'
    };

    const video = addVideo(videoData);

    console.log('Video imported successfully:', result.title);

    return {
      success: true,
      video,
      wasConverted: result.wasConverted
    };
  } catch (error) {
    console.error('Error importing video:', error);
    return { success: false, error: error.message };
  }
});
