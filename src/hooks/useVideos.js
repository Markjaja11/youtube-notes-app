import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing videos
 * Handles loading, state management, and cleanup
 */
export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const videoList = await window.electronAPI.getVideos();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Load transcripts for each video
      const videosWithTranscripts = await Promise.all(
        videoList.map(async (video) => {
          try {
            const transcript = await window.electronAPI.getTranscript(video.id);
            return { ...video, transcript };
          } catch (error) {
            console.error(`Failed to load transcript for video ${video.id}:`, error);
            return { ...video, transcript: '' };
          }
        })
      );

      // Check again before setting state
      if (isMountedRef.current) {
        setVideos(videosWithTranscripts);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load videos');
        console.error('Error loading videos:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadVideos();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [loadVideos]);

  return {
    videos,
    loading,
    error,
    reload: loadVideos,
  };
}
