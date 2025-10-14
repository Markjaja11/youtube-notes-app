# YouTube Notes App

A native desktop application for downloading YouTube videos and taking notes/transcripts alongside video playback.

## Features

- **Download YouTube Videos**: Download videos directly from YouTube using yt-dlp
- **Split-Pane Interface**:
  - Left panel: Video player for downloaded content
  - Right panel: Note-taking area for transcripts and annotations
- **Local Storage**: All videos and notes stored locally using SQLite database
- **Auto-Save**: Notes automatically saved as you type
- **Clean UI**: Minimalist design focused on productivity

## Prerequisites

Before running the application, you need to install **yt-dlp**:

### macOS (using Homebrew or pip)
```bash
# Using Homebrew
brew install yt-dlp

# Or using pip (faster)
pip3 install yt-dlp
```

### Windows (using winget)
```bash
winget install yt-dlp
```

Or download from: https://github.com/yt-dlp/yt-dlp/releases

### Linux
```bash
# Ubuntu/Debian
sudo apt install yt-dlp

# Or using pip
pip3 install yt-dlp
```

### Optional: ffmpeg (Recommended for better video quality)
For highest quality videos with merged video+audio tracks:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
winget install ffmpeg
```

**Note**: The app works without ffmpeg but will download lower quality pre-muxed videos.

## Installation

1. Navigate to the project directory:
```bash
cd youtube-notes-app
```

2. Install dependencies:
```bash
npm install
```

## Running the App

### Development Mode
```bash
npm start
```

This will:
- Start the Vite development server
- Launch the Electron app with hot-reload enabled
- Open DevTools automatically

### Production Build
```bash
npm run build
npm run electron
```

### Package for Distribution
```bash
npm run package
```

This creates distributable packages in the `dist` folder for your platform.

## Usage

1. **Download a Video**:
   - Paste a YouTube URL in the input field in the sidebar
   - Click "Download" button
   - Wait for the download to complete

2. **Play Video**:
   - Click on any downloaded video in the library
   - Video will appear in the left panel

3. **Take Notes**:
   - With a video selected, type notes in the right panel
   - Notes auto-save every second after you stop typing

4. **Delete Video**:
   - Click the × button on any video in the library
   - Confirm deletion

## Project Structure

```
youtube-notes-app/
├── electron/               # Electron main process
│   ├── main.js            # Application entry point
│   ├── preload.js         # Secure IPC bridge
│   ├── database.js        # SQLite operations
│   └── downloader.js      # YouTube download logic
├── src/                   # React frontend
│   ├── components/
│   │   ├── VideoPlayer.jsx
│   │   ├── NotesEditor.jsx
│   │   └── VideoLibrary.jsx
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── downloads/             # Downloaded videos (created at runtime)
├── index.html
├── vite.config.js
└── package.json
```

## Data Storage

- **Database**: SQLite database stored in application user data directory
  - macOS: `~/Library/Application Support/youtube-notes-app/`
  - Windows: `%APPDATA%/youtube-notes-app/`
  - Linux: `~/.config/youtube-notes-app/`

- **Videos**: Stored in `downloads/` subdirectory within user data directory

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI components
- **Vite**: Build tool and dev server
- **SQLite** (better-sqlite3): Local database
- **yt-dlp**: YouTube video downloader
- **react-split**: Resizable split panes

## Troubleshooting

### Videos won't download
- Ensure yt-dlp is installed and accessible in PATH
- Check internet connection
- Verify the YouTube URL is valid
- For age-restricted or private videos, see PO Token section below

### Video won't play after download
- **Most common cause**: ffmpeg is not installed
  - The app will work without ffmpeg but downloads pre-muxed lower quality videos
  - Install ffmpeg for better quality: `brew install ffmpeg` (macOS) or `pip3 install ffmpeg`
- Ensure video was fully downloaded (check console for errors)
- Check the downloads folder in app data directory
- Try downloading the video again

### "WARNING: formats won't be merged" error
- This means ffmpeg is not installed
- The app will still work but may download lower quality videos
- Solution: Install ffmpeg (see Prerequisites section)

### YouTube PO Token (for restricted videos)
If you encounter errors downloading certain videos, YouTube may require PO tokens:

1. **Set PO Token via environment variable**:
   ```bash
   export YOUTUBE_PO_TOKEN="your_token_here"
   npm start
   ```

2. **To get a PO token**:
   - See the official guide: https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide
   - Or use automated tools like yt-dlp plugins

**Note**: Most videos work without PO tokens. Only needed for specific restricted content.

### Database errors
- Check file permissions in app data directory
- Try deleting the database file (you'll lose data) and restart the app

## License

ISC
