const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

async function downloadVideo(url) {
  return new Promise((resolve, reject) => {
    const downloadDir = path.join(app.getPath('userData'), 'downloads');

    // Ensure downloads directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Use yt-dlp to download video
    // Output template: video_id.ext
    const outputTemplate = path.join(downloadDir, '%(id)s.%(ext)s');

    // Format selection optimized for HTML5 playback
    // Remux to proper MP4 to avoid MPEG-TS issues
    const args = [
      // Select best single-file format with video+audio already muxed
      '-f', 'best[vcodec^=avc1][ext=mp4]/best[ext=mp4]/best[ext=webm]/best',
      '--remux-video', 'mp4',  // Force remux to proper MP4 container
      '--no-check-certificates',
      '--no-warnings',
      '-o', outputTemplate,
      '--print', 'after_move:%(id)s',
      '--print', 'after_move:%(title)s',
      '--print', 'after_move:%(ext)s',
      '--print', 'after_move:%(duration)s',
      '--print', 'after_move:%(thumbnail)s',
      url
    ];

    // Add PO token support if available (helps with YouTube restrictions)
    // Users can set YOUTUBE_PO_TOKEN environment variable if needed
    const poToken = process.env.YOUTUBE_PO_TOKEN;
    if (poToken) {
      args.splice(0, 0, '--extractor-args', `youtube:po_token=${poToken}`);
    }

    const ytdlp = spawn('yt-dlp', args);

    let outputData = '';
    let errorData = '';

    ytdlp.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      errorData += data.toString();
      console.log('yt-dlp:', data.toString());
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorData}`));
        return;
      }

      try {
        // Parse the output from yt-dlp (one value per line)
        const lines = outputData.trim().split('\n').filter(line => line.length > 0);

        // Get the last 5 lines (the after_move prints)
        const dataLines = lines.slice(-5);

        if (dataLines.length < 3) {
          reject(new Error('Failed to parse yt-dlp output: insufficient data'));
          return;
        }

        const [id, title, ext, duration, thumbnail] = dataLines;

        resolve({
          title: title || 'Unknown',
          url: url,
          filename: `${id}.${ext}`,
          thumbnail: thumbnail !== 'NA' ? thumbnail : null,
          duration: duration && duration !== 'NA' ? parseInt(duration) : null,
        });
      } catch (error) {
        reject(new Error(`Failed to parse video info: ${error.message}`));
      }
    });

    ytdlp.on('error', (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}`));
    });
  });
}

module.exports = { downloadVideo };
