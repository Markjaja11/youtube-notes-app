import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2 } from 'lucide-react';

const VideoLibrary = forwardRef(({ onSelectVideo, selectedVideo, onDownloadComplete }, ref) => {
  const [videos, setVideos] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (onDownloadComplete) {
      loadVideos();
    }
  }, [onDownloadComplete]);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: loadVideos
  }));

  const loadVideos = async () => {
    try {
      const videoList = await window.electronAPI.getVideos();

      // Load transcripts for each video
      const videosWithTranscripts = await Promise.all(
        videoList.map(async (video) => {
          try {
            const transcript = await window.electronAPI.getTranscript(video.id);
            return { ...video, transcript };
          } catch (error) {
            return { ...video, transcript: '' };
          }
        })
      );

      setVideos(videosWithTranscripts);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

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
        await loadVideos();
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
      await window.electronAPI.deleteVideo(videoId);
      await loadVideos();

      // Deselect if this was the selected video
      if (selectedVideo && selectedVideo.id === videoId) {
        onSelectVideo(null);
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      setError('Failed to delete video');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Video Library</h2>
      </div>

      <form className="px-4 py-4 bg-gray-50 border-b border-gray-200 space-y-2.5" onSubmit={handleDownload}>
        <Input
          type="text"
          placeholder="Paste YouTube URL here..."
          value={downloadUrl}
          onChange={(e) => setDownloadUrl(e.target.value)}
          disabled={isDownloading}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
      </form>

      {error && <div className="px-4 py-3 bg-red-50 text-red-800 text-sm border-l-3 border-red-800">{error}</div>}

      <div className="flex-1 overflow-y-auto">
        {videos.length === 0 ? (
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
    </div>
  );
});

export default VideoLibrary;
