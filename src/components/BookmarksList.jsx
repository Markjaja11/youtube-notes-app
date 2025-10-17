import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Edit2, Clock } from 'lucide-react';
import { Button } from './ui/button';

function BookmarksList({ video, onJumpToTimestamp }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');

  useEffect(() => {
    if (video) {
      loadBookmarks();
    } else {
      setBookmarks([]);
    }
  }, [video]);

  const loadBookmarks = async () => {
    if (!video) return;
    try {
      const bookmarksData = await window.electronAPI.getBookmarks(video.id);
      setBookmarks(bookmarksData);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const handleJumpTo = (timestamp) => {
    if (onJumpToTimestamp) {
      onJumpToTimestamp(timestamp);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this bookmark?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteBookmark(id);
      if (result.success) {
        await loadBookmarks();
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const startEdit = (bookmark, e) => {
    e.stopPropagation();
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditNote(bookmark.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditNote('');
  };

  const saveEdit = async (id) => {
    try {
      const result = await window.electronAPI.updateBookmark(id, editTitle, editNote);
      if (result.success) {
        setEditingId(null);
        setEditTitle('');
        setEditNote('');
        await loadBookmarks();
      }
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    }
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

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
        <Bookmark className="w-16 h-16 mb-3 text-gray-300" strokeWidth={1.5} />
        <p className="text-sm text-center">Select a video to view bookmarks</p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
        <Bookmark className="w-16 h-16 mb-3 text-gray-300" strokeWidth={1.5} />
        <p className="text-sm text-center">No bookmarks yet</p>
        <p className="text-xs text-center mt-1 text-gray-400">Click the bookmark button while watching to add one</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Bookmarks ({bookmarks.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => !editingId && handleJumpTo(bookmark.timestamp)}
          >
            {editingId === bookmark.id ? (
              // Edit mode
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Title"
                  autoFocus
                />
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Note (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveEdit(bookmark.id)}
                    className="text-xs h-7"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-blue-600">
                        {formatTime(bookmark.timestamp)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {bookmark.title}
                    </h4>
                    {bookmark.note && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {bookmark.note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => startEdit(bookmark, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit bookmark"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(bookmark.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookmarksList;
