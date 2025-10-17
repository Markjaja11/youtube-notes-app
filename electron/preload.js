const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideos: () => ipcRenderer.invoke('get-videos'),
  getVideo: (id) => ipcRenderer.invoke('get-video', id),
  downloadVideo: (url) => ipcRenderer.invoke('download-video', url),
  updateTranscript: (videoId, content) => ipcRenderer.invoke('update-transcript', videoId, content),
  getTranscript: (videoId) => ipcRenderer.invoke('get-transcript', videoId),
  deleteVideo: (id) => ipcRenderer.invoke('delete-video', id),
  getVideoPath: (filename) => ipcRenderer.invoke('get-video-path', filename),

  // Bookmark APIs
  createBookmark: (videoId, timestamp, title, note) => ipcRenderer.invoke('create-bookmark', videoId, timestamp, title, note),
  getBookmarks: (videoId) => ipcRenderer.invoke('get-bookmarks', videoId),
  updateBookmark: (id, title, note) => ipcRenderer.invoke('update-bookmark', id, title, note),
  deleteBookmark: (id) => ipcRenderer.invoke('delete-bookmark', id),

  // PDF Export API
  exportPDF: (videoId) => ipcRenderer.invoke('export-pdf', videoId),

  // Video Import APIs
  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  importVideo: (filePath) => ipcRenderer.invoke('import-video', filePath),

  // Progress event listeners
  onImportProgress: (callback) => {
    ipcRenderer.on('import-progress', (event, data) => callback(data));
  },
  removeImportProgressListener: () => {
    ipcRenderer.removeAllListeners('import-progress');
  }
});
