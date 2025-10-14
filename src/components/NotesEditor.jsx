import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { FileText } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';

function NotesEditor({ video, onTranscriptUpdate }) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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

  const saveTranscript = async () => {
    if (!video) return;

    setIsSaving(true);
    try {
      await window.electronAPI.updateTranscript(video.id, content);
      setLastSaved(new Date());
      // Notify parent to refresh video list
      if (onTranscriptUpdate) {
        onTranscriptUpdate(video.id);
      }
    } catch (error) {
      console.error('Failed to save transcript:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
  };

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center max-w-xs px-10">
          <FileText className="w-20 h-20 mx-auto mb-5 text-gray-300" strokeWidth={1.5} />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No notes</h3>
          <p className="text-sm text-gray-500">Select a video to start taking notes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 py-5 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Note</h3>
        <div className="flex items-center gap-3">
          <Button
            onClick={saveTranscript}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {lastSaved && (
            <span className="text-xs text-green-600">Saved {formatTimeAgo(lastSaved)}</span>
          )}
        </div>
      </div>
      <MarkdownEditor
        value={content}
        onChange={handleChange}
        placeholder="Write your notes here... Use # for headings"
        className="flex-1 text-base leading-relaxed"
      />
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
