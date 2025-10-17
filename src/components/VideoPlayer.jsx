import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Play } from 'lucide-react';

const VideoPlayer = forwardRef(({ video }, ref) => {
  const videoRef = useRef(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    jumpToTimestamp: (timestamp) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
        videoRef.current.play();
      }
    },
    getCurrentTime: () => {
      return videoRef.current ? videoRef.current.currentTime : 0;
    }
  }));

  useEffect(() => {
    if (video && videoRef.current) {
      const videoPath = `video://${video.filename}`;

      // Get the current src (may include full URL with protocol)
      const currentSrc = videoRef.current.src;

      // Only reload if it's a different video (compare filenames)
      if (!currentSrc.endsWith(video.filename)) {
        videoRef.current.src = videoPath;
        videoRef.current.load();
      }
    }
  }, [video]);

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center max-w-xs px-10">
          <Play className="w-20 h-20 mx-auto mb-5 text-gray-300" strokeWidth={1.5} />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No video selected</h3>
          <p className="text-sm text-gray-500">Download a video or select one from your library</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{video.title}</h2>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black p-5">
        <video
          ref={videoRef}
          controls
          className="max-w-full max-h-full w-full h-full"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
});

export default VideoPlayer;
