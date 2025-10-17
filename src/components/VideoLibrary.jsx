import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Video, Bookmark, Menu } from 'lucide-react';
import { useVideos } from '../hooks/useVideos';
import BookmarksList from './BookmarksList';
import Tutorial from './Tutorial';

const VideoLibrary = forwardRef(({ onSelectVideo, selectedVideo, videoPlayerRef, onToggleSidebar }, ref) => {
  const { videos, loading, error: loadError, reload } = useVideos();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'bookmarks'
  const [ffmpegInstalled, setFfmpegInstalled] = useState(null);
  const [importProgress, setImportProgress] = useState(null); // { stage, progress, fileSize }
  const [isDragging, setIsDragging] = useState(false);
  const [batchImportQueue, setBatchImportQueue] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: reload
  }));

  const getFirst100Words = (text) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    return words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!downloadUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      const result = await window.electronAPI.downloadVideo(downloadUrl);

      if (result.success) {
        setDownloadUrl('');
        await reload();
        // Auto-select the newly downloaded video
        if (result.video) {
          onSelectVideo(result.video);
        }
      } else {
        setError(result.error || 'Download failed');
      }
    } catch (error) {
      setError(error.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (videoId, e) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteVideo(videoId);

      if (result.success) {
        await reload();

        // Deselect if this was the selected video
        if (selectedVideo && selectedVideo.id === videoId) {
          onSelectVideo(null);
        }
      } else {
        setError(result.error || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      setError('Failed to delete video');
    }
  };

  const handleJumpToTimestamp = (timestamp) => {
    if (videoPlayerRef && videoPlayerRef.current) {
      videoPlayerRef.current.jumpToTimestamp(timestamp);
    }
  };

  // Check FFmpeg on mount
  useEffect(() => {
    const checkFFmpeg = async () => {
      try {
        const result = await window.electronAPI.checkFFmpeg();
        setFfmpegInstalled(result.installed);
      } catch (error) {
        console.error('Error checking FFmpeg:', error);
        setFfmpegInstalled(false);
      }
    };
    checkFFmpeg();
  }, []);

  // Set up progress event listener
  useEffect(() => {
    // Listen to import progress events
    window.electronAPI.onImportProgress((progressData) => {
      setImportProgress(progressData);
    });

    // Cleanup listener on unmount
    return () => {
      window.electronAPI.removeImportProgressListener();
    };
  }, []);

  const handleImportVideo = async () => {
    try {
      setError('');
      setIsDownloading(true);
      setImportProgress(null); // Reset progress

      // Check FFmpeg first if needed
      if (ffmpegInstalled === false) {
        setError('Note: FFmpeg not installed. Only MP4, WebM, and OGG formats will work.');
      }

      // Open file dialog
      const selectResult = await window.electronAPI.selectVideoFile();

      if (!selectResult.success) {
        if (!selectResult.canceled) {
          setError(selectResult.error || 'Failed to select video file');
        }
        setIsDownloading(false);
        setImportProgress(null);
        return;
      }

      const { videoInfo, filePath, fileSizeFormatted, isLargeFile } = selectResult;

      // Warn about large files
      if (isLargeFile) {
        setError(`⚠️ Large file detected (${fileSizeFormatted}). Import may take several minutes.`);
      }

      // Check if conversion needed but FFmpeg not available
      if (videoInfo.needsConversion && !ffmpegInstalled) {
        setError(`This video format (${videoInfo.extension}) requires FFmpeg for conversion. Please install FFmpeg or use MP4/WebM/OGG formats.`);
        setIsDownloading(false);
        setImportProgress(null);
        return;
      }

      // Import the video (progress updates will come via event listener)
      const importResult = await window.electronAPI.importVideo(filePath);

      if (!importResult.success) {
        setError(importResult.error || 'Failed to import video');
        setIsDownloading(false);
        setImportProgress(null);
        return;
      }

      // Success! Reload video list and select the imported video
      await reload();
      onSelectVideo(importResult.video);

      // Show success message
      const message = importResult.wasConverted
        ? `Video converted and imported successfully!`
        : `Video imported successfully!`;

      console.log(message);

    } catch (error) {
      console.error('Error importing video:', error);
      setError('Failed to import video: ' + error.message);
    } finally {
      setIsDownloading(false);
      // Clear progress after a short delay
      setTimeout(() => setImportProgress(null), 1500);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if leaving the container itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Import a single file
  const importSingleFile = async (filePath) => {
    try {
      const importResult = await window.electronAPI.importVideo(filePath);

      if (!importResult.success) {
        throw new Error(importResult.error || 'Failed to import video');
      }

      await reload();
      return importResult.video;
    } catch (error) {
      throw error;
    }
  };

  // Process batch import queue
  useEffect(() => {
    const processBatchImport = async () => {
      if (batchImportQueue.length === 0 || isDownloading) return;

      setIsDownloading(true);
      setError('');
      setImportProgress(null);

      let lastImportedVideo = null;

      for (let i = 0; i < batchImportQueue.length; i++) {
        const file = batchImportQueue[i];
        setCurrentBatchIndex(i);

        try {
          console.log(`Importing ${i + 1}/${batchImportQueue.length}: ${file.name}`);
          const video = await importSingleFile(file.path);
          lastImportedVideo = video;
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
          setError(`Failed to import ${file.name}: ${error.message}`);
          // Continue with next file
        }
      }

      // Select the last successfully imported video
      if (lastImportedVideo) {
        onSelectVideo(lastImportedVideo);
      }

      // Clear batch queue
      setBatchImportQueue([]);
      setCurrentBatchIndex(0);
      setIsDownloading(false);
      setTimeout(() => setImportProgress(null), 1500);
    };

    processBatchImport();
  }, [batchImportQueue]);

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isDownloading) {
      setError('Please wait for the current import to finish.');
      return;
    }

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    // Validate file types
    const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv'];
    const validFiles = files.filter(file => {
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      return validExtensions.includes(fileExtension);
    });

    if (validFiles.length === 0) {
      setError('No valid video files found. Please drop video files.');
      return;
    }

    if (validFiles.length < files.length) {
      setError(`${files.length - validFiles.length} non-video file(s) skipped. Importing ${validFiles.length} video(s)...`);
    }

    // Start batch import
    if (validFiles.length === 1) {
      // Single file - use direct import (keeps the old behavior)
      const file = validFiles[0];

      try {
        setError('');
        setIsDownloading(true);
        setImportProgress(null);

        const video = await importSingleFile(file.path);
        onSelectVideo(video);

        console.log('Video imported successfully via drag & drop!');

      } catch (error) {
        console.error('Error importing dropped video:', error);
        setError('Failed to import video: ' + error.message);
      } finally {
        setIsDownloading(false);
        setTimeout(() => setImportProgress(null), 1500);
      }
    } else {
      // Multiple files - use batch import
      console.log(`Starting batch import of ${validFiles.length} videos`);
      setBatchImportQueue(validFiles);
    }
  };

  return (
    <div
      className="flex flex-col h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/90 px-8 py-6 rounded-lg shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="text-6xl mb-4 animate-bounce">📹</div>
            <p className="text-xl font-semibold text-blue-600 mb-2">Drop video here</p>
            <p className="text-sm text-gray-600 mb-3">Supports MP4, MOV, AVI, MKV, and more</p>
            <p className="text-xs text-gray-500">✨ Supports multiple files!</p>
          </div>
        </div>
      )}

      {/* App Header with Logo */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white/50">
        <div className="flex items-center gap-2">
          <img
            src="./images/logo.svg"
            alt="Laman Logo"
            className="w-8 h-8"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-800">Laman</h1>
            <p className="text-xs text-gray-500">Video Notes for Students</p>
          </div>
        </div>
      </div>

      {/* Tabs with Burger Menu */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'videos'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Video className="w-4 h-4" />
          Videos
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'bookmarks'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Bookmarks
        </button>
        <button
          onClick={onToggleSidebar}
          className="px-3 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center border-l border-gray-200"
          title="Hide sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'videos' && (
        <>
          <form className="px-4 py-4 bg-white/40 backdrop-blur-md border-b border-white/30 space-y-2.5" onSubmit={handleDownload}>
            <Input
              type="text"
              placeholder="Paste YouTube URL here..."
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              disabled={isDownloading}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download YouTube'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleImportVideo}
                disabled={isDownloading}
              >
                Import Video
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500 italic">
              💡 Tip: You can also drag & drop video files here
            </p>
          </form>

          {(error || loadError) && (
            <div className="px-4 py-3 bg-red-50 text-red-800 text-sm border-l-3 border-red-800">
              {error || loadError}
            </div>
          )}

          {/* Progress Indicator */}
          {(importProgress || batchImportQueue.length > 0) && (
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
              {batchImportQueue.length > 0 && (
                <div className="mb-2 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-blue-800">
                      Batch Import: {currentBatchIndex + 1} / {batchImportQueue.length}
                    </span>
                    <div className="text-xs text-blue-600 mt-1">
                      {batchImportQueue[currentBatchIndex]?.name}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBatchImportQueue([]);
                      setCurrentBatchIndex(0);
                      setIsDownloading(false);
                      setImportProgress(null);
                      setError('Batch import cancelled');
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Cancel Batch
                  </button>
                </div>
              )}
              {importProgress && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      {importProgress.stage === 'converting' && 'Converting video...'}
                      {importProgress.stage === 'copying' && 'Importing video...'}
                      {importProgress.stage === 'completed' && 'Import complete!'}
                    </span>
                    <span className="text-xs text-blue-700">
                      {importProgress.fileSize && `${importProgress.fileSize}`}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.progress || 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-blue-700">
                      {importProgress.progress || 0}%
                    </span>
                    {importProgress.currentTime && importProgress.duration && (
                      <span className="text-xs text-blue-600">
                        {Math.floor(importProgress.currentTime)}s / {Math.floor(importProgress.duration)}s
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-10 px-5 text-center text-gray-500">
                <p>Loading videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="py-10 px-5 text-center text-gray-500">
                <p>No videos yet. Download one to get started!</p>
              </div>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className={`px-4 py-3.5 border-b border-gray-100 cursor-pointer transition-colors duration-150 flex justify-between items-center hover:bg-gray-50 ${
                    selectedVideo && selectedVideo.id === video.id
                      ? 'bg-blue-50 border-l-3 border-l-blue-600'
                      : ''
                  }`}
                  onClick={() => onSelectVideo(video)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1 overflow-hidden text-ellipsis line-clamp-2">
                      {video.title}
                    </h4>
                    {video.transcript && (
                      <p className="text-xs text-gray-600 my-1.5 leading-relaxed overflow-hidden text-ellipsis line-clamp-3">
                        {getFirst100Words(video.transcript)}
                      </p>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(video.download_date).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="ml-2 p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    onClick={(e) => handleDelete(video.id, e)}
                    title="Delete video"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'bookmarks' && (
        <BookmarksList
          video={selectedVideo}
          onJumpToTimestamp={handleJumpToTimestamp}
        />
      )}

      {/* Tutorial Section at Bottom */}
      <div className="border-t border-gray-200 bg-gray-50">
        <Tutorial />
      </div>
    </div>
  );
});

export default VideoLibrary;
