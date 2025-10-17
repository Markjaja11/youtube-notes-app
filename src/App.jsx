import React, { useState, useRef } from 'react';
import Split from 'react-split';
import './split.css';
import './App.css';
import VideoPlayer from './components/VideoPlayer';
import NotesEditor from './components/NotesEditor';
import VideoLibrary from './components/VideoLibrary';
import BookmarksList from './components/BookmarksList';
import ErrorBoundary from './components/ErrorBoundary';
import { Menu } from 'lucide-react';

function App() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const libraryRef = useRef();
  const videoPlayerRef = useRef();

  const handleTranscriptUpdate = () => {
    libraryRef.current?.refresh();
  };

  const handleJumpToTimestamp = (timestamp) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.jumpToTimestamp(timestamp);
    }
  };

  return (
    <ErrorBoundary>
      {/* System Background with vivid colors for glassmorphism visibility */}
      <div
        className="flex h-screen relative"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        {/* Sidebar with Glassmorphism */}
        {!sidebarCollapsed && (
          <div className="w-80 bg-white/60 backdrop-blur-xl border-r border-white/30 shadow-xl">
            <VideoLibrary
              ref={libraryRef}
              onSelectVideo={setSelectedVideo}
              selectedVideo={selectedVideo}
              videoPlayerRef={videoPlayerRef}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              sidebarCollapsed={sidebarCollapsed}
            />
          </div>
        )}

        {/* Show sidebar button when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-md hover:bg-white/90 transition-all border border-white/40"
            title="Show sidebar"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Main Content with Glassmorphism */}
        <div className={`flex-1 flex overflow-hidden ${sidebarCollapsed ? 'pl-4' : ''}`}>
          <Split
            className="flex w-full h-full"
            sizes={[57, 43]}
            minSize={200}
            gutterSize={12}
            direction="horizontal"
          >
            <div className="flex flex-col bg-white/60 backdrop-blur-xl overflow-hidden shadow-lg">
              <VideoPlayer
                ref={videoPlayerRef}
                video={selectedVideo}
              />
            </div>
            <div className="flex flex-col bg-white overflow-hidden shadow-lg">
              <NotesEditor
                video={selectedVideo}
                onTranscriptUpdate={handleTranscriptUpdate}
                videoPlayerRef={videoPlayerRef}
              />
            </div>
          </Split>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
