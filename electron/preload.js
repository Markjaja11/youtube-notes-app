const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideos: () => ipcRenderer.invoke('get-videos'),
  getVideo: (id) => ipcRenderer.invoke('get-video', id),
  downloadVideo: (url) => ipcRenderer.invoke('download-video', url),
  updateTranscript: (videoId, content) => ipcRenderer.invoke('update-transcript', videoId, content),
  getTranscript: (videoId) => ipcRenderer.invoke('get-transcript', videoId),
  deleteVideo: (id) => ipcRenderer.invoke('delete-video', id),
  getVideoPath: (filename) => ipcRenderer.invoke('get-video-path', filename),
});
