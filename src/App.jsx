import React, { useState, useRef } from 'react';
import Split from 'react-split';
import './split.css';
import './App.css';
import VideoPlayer from './components/VideoPlayer';
import NotesEditor from './components/NotesEditor';
import VideoLibrary from './components/VideoLibrary';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const libraryRef = useRef();

  const handleTranscriptUpdate = () => {
    libraryRef.current?.refresh();
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200 m-4 ml-4 mr-0 rounded-l-xl">
          <VideoLibrary
            ref={libraryRef}
            onSelectVideo={setSelectedVideo}
            selectedVideo={selectedVideo}
          />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <Split
            className="flex w-full h-full"
            sizes={[50, 50]}
            minSize={300}
            gutterSize={8}
            direction="horizontal"
          >
            <div className="flex flex-col bg-white overflow-hidden border-r border-gray-200">
              <VideoPlayer video={selectedVideo} />
            </div>
            <div className="flex flex-col bg-white overflow-hidden">
              <NotesEditor video={selectedVideo} onTranscriptUpdate={handleTranscriptUpdate} />
            </div>
          </Split>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
