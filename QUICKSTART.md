# Quick Start Guide

## Prerequisites Check

Before running the app, ensure you have:

1. **Node.js 18+** (check with `node --version`)
2. **yt-dlp** installed (check with `yt-dlp --version`)

## Installation

```bash
# Navigate to project directory
cd youtube-notes-app

# Install dependencies (if not already done)
npm install
```

## Running the App

```bash
npm start
```

The application will:
1. Start the Vite development server
2. Launch the Electron desktop application
3. Open with an empty video library

## Using the App

### 1. Download Your First Video

1. Copy a YouTube video URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
2. Paste it in the "Paste YouTube URL here..." input field in the left sidebar
3. Click the "Download" button
4. Wait for the download to complete (progress shown in console)

### 2. Watch and Take Notes

1. Click on the downloaded video in the library (left sidebar)
2. The video will appear in the left panel
3. Click the play button to start watching
4. Type your notes in the right panel
5. Notes auto-save every second after you stop typing

### 3. Manage Your Library

- **Select a video**: Click on any video in the library
- **Delete a video**: Click the × button on the right side of the video item
- **Download more**: Add more YouTube URLs and download

## Keyboard Shortcuts

- **Resize panels**: Drag the divider between video and notes panels
- **Standard video controls**: Space to play/pause, arrow keys to seek

## Data Location

Your videos and notes are stored locally:
- **macOS**: `~/Library/Application Support/youtube-notes-app/`
- **Windows**: `%APPDATA%/youtube-notes-app/`
- **Linux**: `~/.config/youtube-notes-app/`

Inside this folder you'll find:
- `youtube-notes.db` - SQLite database with metadata and notes
- `downloads/` - Downloaded video files

## Tips

1. **Note Auto-Save**: Notes save automatically 1 second after you stop typing
2. **Video Format**: Videos are downloaded in MP4 format for best compatibility
3. **File Organization**: Videos are named by their YouTube ID
4. **Clean UI**: The interface is intentionally minimal to reduce distractions

## Troubleshooting

### "yt-dlp not found"
Install yt-dlp:
```bash
# macOS
brew install yt-dlp

# Or with pip
pip3 install yt-dlp
```

### Video won't download
- Check your internet connection
- Verify the YouTube URL is valid
- Look at the console/DevTools for error messages

### Video won't play
- Ensure the download completed successfully
- Try restarting the application
- Check that the video file exists in the downloads folder

## Next Steps

For more detailed information, see:
- `README.md` - Full documentation
- `SETUP.md` - Detailed setup instructions
