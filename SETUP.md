# Setup Instructions

## Step 1: Install yt-dlp

The application requires **yt-dlp** to download YouTube videos. Install it using one of these methods:

### macOS (Homebrew)
```bash
brew install yt-dlp
```

### Alternative: Using pip
```bash
pip3 install yt-dlp
```

Or download the binary directly from: https://github.com/yt-dlp/yt-dlp/releases

### Verify Installation
```bash
yt-dlp --version
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Run the Application

### Development Mode
```bash
npm start
```

This will:
- Start the Vite dev server on http://localhost:5173
- Launch the Electron application
- Enable hot-reload for development
- Open DevTools automatically

### First Run Notes
- The app will create a database in your user data directory
- Downloads folder will be created automatically
- You may see a security prompt on macOS - click "Open" to proceed

## Troubleshooting

### yt-dlp not found
If you get errors about yt-dlp not being found:
1. Make sure yt-dlp is installed: `which yt-dlp`
2. Restart your terminal after installation
3. On macOS, ensure `/opt/homebrew/bin` is in your PATH

### Permission Errors
On macOS, you may need to grant permissions:
- Settings → Privacy & Security → Files and Folders
- Allow the app to access Downloads folder

### Xcode License (macOS)
If you see Xcode license errors with Homebrew:
```bash
sudo xcodebuild -license accept
```

### Node/npm Issues
Make sure you have Node.js 18+ installed:
```bash
node --version  # Should be v18 or higher
npm --version
```

## Building for Production

To create a distributable application:

```bash
npm run build
npm run package
```

The packaged app will be in the `dist` folder.
