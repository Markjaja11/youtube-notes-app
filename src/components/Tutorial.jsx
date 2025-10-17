import React, { useState } from 'react';
import { BookOpen, Keyboard, Hash, Bold, Italic, Code, List, Clock, Bookmark, Save, ChevronDown, ChevronUp } from 'lucide-react';

function Tutorial() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-semibold text-gray-900">
            Tutorial & Shortcuts
          </h3>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto bg-white">

      <div className="px-5 py-4 space-y-6">
        {/* Markdown Syntax Section */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-blue-600" />
            Markdown Syntax
          </h4>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1">Headings</div>
              <code className="text-xs text-gray-600">
                # Heading 1<br/>
                ## Heading 2<br/>
                ### Heading 3
              </code>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Bold className="w-3 h-3" /> Bold Text
              </div>
              <code className="text-xs text-gray-600">
                **bold text** or __bold text__
              </code>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Italic className="w-3 h-3" /> Italic Text
              </div>
              <code className="text-xs text-gray-600">
                *italic text* or _italic text_
              </code>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Code className="w-3 h-3" /> Inline Code
              </div>
              <code className="text-xs text-gray-600">
                `code here`
              </code>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                <List className="w-3 h-3" /> Lists
              </div>
              <code className="text-xs text-gray-600">
                - Bullet item<br/>
                * Another bullet<br/>
                <br/>
                1. Numbered item<br/>
                2. Second item
              </code>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="font-medium text-gray-700 mb-1">Code Blocks</div>
              <code className="text-xs text-gray-600">
                ```javascript<br/>
                code here<br/>
                ```
              </code>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts Section */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-600" />
            Keyboard Shortcuts
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
              <span className="text-gray-700">Insert Timestamp</span>
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                Ctrl/Cmd + T
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
              <span className="text-gray-700">Undo</span>
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                Ctrl/Cmd + Z
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
              <span className="text-gray-700">Redo</span>
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                Ctrl/Cmd + Y
              </kbd>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
              <span className="text-gray-700">Save Notes</span>
              <span className="text-xs text-gray-500">Auto-saves every 2s</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            App Features
          </h4>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-md border-l-3 border-blue-600">
              <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Clickable Timestamps
              </div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Click "Insert Time" or press Ctrl/Cmd+T to add timestamps like [3:30] to your notes.
                Click any timestamp to jump the video to that moment.
              </p>
            </div>

            <div className="bg-green-50 p-3 rounded-md border-l-3 border-green-600">
              <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-green-600" />
                Bookmarks
              </div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Click "Add Bookmark" to save important moments with a title and notes.
                View all bookmarks in the Bookmarks tab. Click any bookmark to jump to that moment.
              </p>
            </div>

            <div className="bg-purple-50 p-3 rounded-md border-l-3 border-purple-600">
              <div className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                <Save className="w-4 h-4 text-purple-600" />
                Auto-Save
              </div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Your notes are automatically saved every 2 seconds.
                Look for the "Saved" indicator in the header.
              </p>
            </div>

            <div className="bg-orange-50 p-3 rounded-md border-l-3 border-orange-600">
              <div className="font-medium text-gray-900 mb-1">Markdown Support</div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Use markdown syntax to format your notes with headings, bold, italic, lists, and code blocks.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border-l-3 border-gray-400">
              <div className="font-medium text-gray-900 mb-1">Collapsible Sidebar</div>
              <p className="text-gray-700 text-xs leading-relaxed">
                Click the burger menu (☰) next to the Bookmarks tab to hide the sidebar and get more screen space.
              </p>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="pb-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">💡 Tips</h4>
          <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
            <p className="bg-yellow-50 p-2 rounded-md">
              • Use timestamps throughout your notes to mark different topics
            </p>
            <p className="bg-yellow-50 p-2 rounded-md">
              • Create bookmarks for key moments you want to review later
            </p>
            <p className="bg-yellow-50 p-2 rounded-md">
              • Use headings (# ## ###) to organize your notes into sections
            </p>
            <p className="bg-yellow-50 p-2 rounded-md">
              • Your notes auto-save, but you can manually save anytime
            </p>
          </div>
        </section>
      </div>
        </div>
      )}
    </div>
  );
}

export default Tutorial;
