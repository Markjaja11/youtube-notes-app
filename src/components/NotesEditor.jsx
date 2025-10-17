import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { FileText, Save, Check, Clock, Bookmark, FileDown } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import { useAutoSave } from '../hooks/useAutoSave';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './ui/toast';

function NotesEditor({ video, onTranscriptUpdate, videoPlayerRef }) {
  const [content, setContent] = useState('');
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const editorRef = useRef(null);
  const { toasts, toast, removeToast } = useToast();

  // Load transcript when video changes
  useEffect(() => {
    if (video) {
      loadTranscript();
    } else {
      setContent('');
    }
  }, [video]);

  const loadTranscript = async () => {
    if (!video) return;
    try {
      const transcript = await window.electronAPI.getTranscript(video.id);
      setContent(transcript || '');
    } catch (error) {
      console.error('Failed to load transcript:', error);
    }
  };

  const saveTranscript = useCallback(async () => {
    if (!video) return;

    await window.electronAPI.updateTranscript(video.id, content);
    // Notify parent to refresh video list
    if (onTranscriptUpdate) {
      onTranscriptUpdate(video.id);
    }
  }, [video, content, onTranscriptUpdate]);

  // Auto-save hook
  const { isSaving, lastSaved, hasUnsavedChanges, saveNow } = useAutoSave(
    content,
    saveTranscript,
    { delay: 2000, enabled: !!video }
  );

  const handleChange = (e) => {
    setContent(e.target.value);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInsertTimestamp = useCallback(() => {
    if (!videoPlayerRef || !videoPlayerRef.current) return;

    const currentTime = videoPlayerRef.current.getCurrentTime();
    const formattedTime = formatTime(currentTime);

    // Insert timestamp at the end of the content
    const timestampText = `\n\n[${formattedTime}] `;
    setContent(prevContent => {
      // If content is empty, don't add extra newlines
      if (!prevContent.trim()) {
        return `[${formattedTime}] `;
      }
      return prevContent + timestampText;
    });

    // Focus the editor and move cursor to end
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current.focus();
      }, 50);
    }
  }, [videoPlayerRef]);

  const parseTimestampToSeconds = (timestamp) => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const handleTimestampClick = useCallback((timestamp) => {
    if (!videoPlayerRef || !videoPlayerRef.current) return;

    const seconds = parseTimestampToSeconds(timestamp);
    videoPlayerRef.current.jumpToTimestamp(seconds);
  }, [videoPlayerRef]);

  // Keyboard shortcut for inserting timestamps
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+T (Windows/Linux) or Cmd+T (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleInsertTimestamp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInsertTimestamp]);

  const handleAddBookmark = () => {
    if (videoPlayerRef && videoPlayerRef.current) {
      setCurrentTimestamp(videoPlayerRef.current.getCurrentTime());
      setShowBookmarkDialog(true);
      setBookmarkTitle('');
      setBookmarkNote('');
    }
  };

  const handleSaveBookmark = async () => {
    if (!video || !bookmarkTitle.trim()) return;

    try {
      const result = await window.electronAPI.createBookmark(
        video.id,
        currentTimestamp,
        bookmarkTitle.trim(),
        bookmarkNote.trim()
      );

      if (result.success) {
        setShowBookmarkDialog(false);
        setBookmarkTitle('');
        setBookmarkNote('');
      }
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  };

  const handleExportPDF = async () => {
    if (!video) return;

    setIsExporting(true);

    // Show info toast when starting export
    toast.info('Exporting PDF', 'Generating your notes...');

    try {
      const result = await window.electronAPI.exportPDF(video.id);

      if (result.success) {
        console.log('PDF exported successfully to:', result.filePath);
        // Extract just the filename from the path
        const filename = result.filePath.split('/').pop();
        toast.success('PDF Exported Successfully', `Saved as ${filename}`);
      } else if (result.error !== 'Export canceled') {
        console.error('Failed to export PDF:', result.error);
        toast.error('Export Failed', result.error);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Export Failed', error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-xs px-10">
          <FileText className="w-20 h-20 mx-auto mb-5 text-gray-400" strokeWidth={1.5} />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No notes</h3>
          <p className="text-sm text-gray-500">Select a video to start taking notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-200 flex justify-between items-center bg-white">
        <h3 className="text-lg font-semibold text-gray-900">Note</h3>
        <div className="flex items-center gap-3">
          {/* Auto-save status indicator */}
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {!isSaving && lastSaved && !hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>Saved {formatTimeAgo(lastSaved)}</span>
            </div>
          )}
          {!isSaving && hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
          {/* Manual save button (optional) */}
          <Button
            onClick={saveNow}
            disabled={isSaving || !hasUnsavedChanges}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save Now
          </Button>
          {/* Export PDF button */}
          <Button
            onClick={handleExportPDF}
            disabled={isExporting || !video}
            size="sm"
            variant="default"
            className="text-xs"
            title="Export notes as PDF"
          >
            {isExporting ? (
              <>
                <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>
      <MarkdownEditor
        ref={editorRef}
        value={content}
        onChange={handleChange}
        onTimestampClick={handleTimestampClick}
        placeholder="Write your notes here... Use # for headings, **bold**, *italic*, - lists, `code`"
        className="flex-1 text-base leading-relaxed"
      />

      {/* Timestamp and Bookmark Buttons at Bottom with Glassmorphism */}
      <div className="px-5 py-4 border-t border-white/30 flex gap-3 bg-white/60 backdrop-blur-xl">
        <Button
          onClick={handleInsertTimestamp}
          disabled={!video}
          className="flex-1 flex items-center justify-center gap-2 bg-white/50 hover:bg-white/70 border-white/40 backdrop-blur-lg"
          variant="outline"
          title="Insert timestamp at end of notes (Ctrl+T)"
        >
          <Clock className="w-4 h-4" />
          Insert Time
        </Button>
        <Button
          onClick={handleAddBookmark}
          className="flex-1 flex items-center justify-center gap-2 bg-white/50 hover:bg-white/70 border-white/40 backdrop-blur-lg"
          variant="outline"
        >
          <Bookmark className="w-4 h-4" />
          Add Bookmark
        </Button>
      </div>

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 max-w-[90%] shadow-2xl border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Bookmark className="w-5 h-5" />
              Add Bookmark at {formatTime(currentTimestamp)}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  placeholder="What's this moment about?"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && bookmarkTitle.trim()) {
                      handleSaveBookmark();
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="Add more details..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder-gray-400"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBookmarkDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveBookmark}
                  disabled={!bookmarkTitle.trim()}
                >
                  Save Bookmark
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
}

export default NotesEditor;
