const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const MarkdownIt = require('markdown-it');

// Initialize markdown parser
const md = new MarkdownIt({
  html: false,        // Disable HTML for security
  breaks: true,       // Convert \n to <br>
  linkify: false,     // Disable auto-URL conversion (might interfere with timestamps)
  typographer: false  // Disable smart quotes (might interfere with our placeholders)
});

/**
 * Formats duration in seconds to HH:MM:SS or MM:SS format
 */
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats timestamp for bookmarks
 */
function formatTimestamp(seconds) {
  return formatDuration(seconds);
}

/**
 * Sanitizes filename by removing invalid characters
 */
function sanitizeFilename(filename) {
  // Remove invalid characters: / \ : * ? " < > |
  let sanitized = filename.replace(/[/\\:*?"<>|]/g, '-');

  // Limit length to 200 characters (leave room for suffix and extension)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Remove trailing dots and spaces (Windows issue)
  sanitized = sanitized.replace(/[\s.]+$/, '');

  return sanitized || 'Notes';
}

/**
 * Enhanced markdown parsing with timestamp support
 */
function parseMarkdownWithTimestamps(markdown) {
  // First, extract timestamps and replace with unique placeholders
  // This must happen BEFORE markdown parsing to prevent markdown-it from modifying them
  const timestampPattern = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
  const timestamps = [];

  // Replace timestamps with unique placeholders that won't conflict with markdown
  // Use angle brackets which markdown-it won't process as emphasis
  let processedMarkdown = markdown.replace(timestampPattern, (match, time) => {
    const index = timestamps.length;
    timestamps.push(time);
    // Use a unique placeholder that markdown-it won't interpret
    // Using <<<>>> format to avoid markdown processing
    return `<<<TIMESTAMP_${index}_PLACEHOLDER>>>`;
  });

  // Parse markdown to HTML
  let html = md.render(processedMarkdown);

  // Restore timestamps with proper styling using global regex
  timestamps.forEach((time, index) => {
    // Use regex to ensure we catch all instances, even if wrapped in tags
    // Need to escape angle brackets for regex
    const placeholderRegex = new RegExp(`&lt;&lt;&lt;TIMESTAMP_${index}_PLACEHOLDER&gt;&gt;&gt;`, 'g');
    const timestampHtml = `<span class="timestamp">[${time}]</span>`;
    html = html.replace(placeholderRegex, timestampHtml);
  });

  return html;
}

/**
 * Generates HTML template for PDF
 */
function generateHTMLTemplate(videoData, transcript, bookmarks) {
  const { title, url, duration } = videoData;
  const contentHTML = transcript ? parseMarkdownWithTimestamps(transcript) : '<p class="empty-note">No notes available.</p>';

  // Generate bookmarks HTML
  let bookmarksHTML = '';
  if (bookmarks && bookmarks.length > 0) {
    bookmarksHTML = `
      <section class="bookmarks-section">
        <h2>Bookmarks</h2>
        <div class="bookmarks-list">
          ${bookmarks.map(bookmark => `
            <div class="bookmark-item">
              <div class="bookmark-header">
                <span class="bookmark-timestamp">[${formatTimestamp(bookmark.timestamp)}]</span>
                <span class="bookmark-title">${escapeHtml(bookmark.title)}</span>
              </div>
              ${bookmark.note ? `<div class="bookmark-note">${escapeHtml(bookmark.note)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  const cssPath = path.join(__dirname, 'pdfStyles.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : getDefaultStyles();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)} - Notes</title>
      <style>
        ${css}
      </style>
    </head>
    <body>
      <header class="pdf-header">
        <h1 class="video-title">${escapeHtml(title)}</h1>
        <div class="video-meta">
          <div class="meta-item">
            <span class="meta-label">URL:</span>
            <span class="meta-value">${escapeHtml(url)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Duration:</span>
            <span class="meta-value">${formatDuration(duration)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Exported:</span>
            <span class="meta-value">${new Date().toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main class="pdf-content">
        <h2>Notes</h2>
        <div class="notes-content">
          ${contentHTML}
        </div>
      </main>

      ${bookmarksHTML}

      <footer class="pdf-footer">
        <p>Generated with YouTube Notes App</p>
      </footer>
    </body>
    </html>
  `;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Default CSS styles if external file not found
 */
function getDefaultStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 20mm;
    }

    @page {
      margin: 20mm;
      size: A4;
    }

    .pdf-header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }

    .video-title {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 15px;
      color: #111827;
    }

    .video-meta {
      font-size: 9pt;
      color: #6b7280;
    }

    .meta-item {
      margin-bottom: 5px;
    }

    .meta-label {
      font-weight: 600;
      margin-right: 8px;
    }

    .pdf-content h2 {
      font-size: 16pt;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 15px;
      color: #111827;
    }

    .notes-content h1 {
      font-size: 18pt;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .notes-content h2 {
      font-size: 15pt;
      font-weight: 700;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    .notes-content h3 {
      font-size: 13pt;
      font-weight: 700;
      margin-top: 15px;
      margin-bottom: 8px;
    }

    .notes-content p {
      margin-bottom: 12px;
    }

    .notes-content ul, .notes-content ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }

    .notes-content li {
      margin-bottom: 6px;
    }

    .notes-content code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }

    .notes-content pre {
      background-color: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 12px;
    }

    .notes-content pre code {
      background: none;
      padding: 0;
    }

    .notes-content strong {
      font-weight: 700;
    }

    .notes-content em {
      font-style: italic;
    }

    .timestamp {
      color: #2563eb;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .empty-note {
      color: #9ca3af;
      font-style: italic;
    }

    .bookmarks-section {
      margin-top: 40px;
      page-break-before: auto;
    }

    .bookmarks-section h2 {
      font-size: 16pt;
      font-weight: 700;
      margin-bottom: 15px;
      color: #111827;
    }

    .bookmark-item {
      margin-bottom: 20px;
      padding: 12px;
      background-color: #f9fafb;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      page-break-inside: avoid;
    }

    .bookmark-header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 5px;
    }

    .bookmark-timestamp {
      color: #2563eb;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      font-size: 10pt;
    }

    .bookmark-title {
      font-weight: 600;
      color: #111827;
      font-size: 11pt;
    }

    .bookmark-note {
      color: #4b5563;
      font-size: 10pt;
      margin-top: 5px;
      line-height: 1.5;
    }

    .pdf-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 9pt;
    }

    @media print {
      body {
        padding: 0;
      }

      .pdf-header {
        page-break-after: avoid;
      }

      h1, h2, h3 {
        page-break-after: avoid;
      }

      .bookmark-item {
        page-break-inside: avoid;
      }
    }
  `;
}

/**
 * Main function to generate PDF from video data
 */
async function generateNotePDF(videoData, transcript, bookmarks) {
  return new Promise((resolve, reject) => {
    let pdfWindow = null;

    try {
      // Generate HTML content
      const htmlContent = generateHTMLTemplate(videoData, transcript, bookmarks);

      // Create a hidden browser window for PDF generation
      pdfWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      // Load HTML content
      pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // Wait for content to load
      pdfWindow.webContents.on('did-finish-load', async () => {
        try {
          // Give the page a moment to render completely
          await new Promise(resolve => setTimeout(resolve, 500));

          // Generate PDF
          const pdfBuffer = await pdfWindow.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: {
              top: 0.5,
              bottom: 0.5,
              left: 0.5,
              right: 0.5
            }
          });

          // Close the window
          if (pdfWindow && !pdfWindow.isDestroyed()) {
            pdfWindow.close();
          }

          resolve(pdfBuffer);
        } catch (error) {
          if (pdfWindow && !pdfWindow.isDestroyed()) {
            pdfWindow.close();
          }
          reject(error);
        }
      });

      // Handle load errors
      pdfWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.close();
        }
        reject(new Error(`Failed to load content: ${errorDescription}`));
      });

      // Set a timeout to prevent hanging
      setTimeout(() => {
        if (pdfWindow && !pdfWindow.isDestroyed()) {
          pdfWindow.close();
          reject(new Error('PDF generation timed out after 30 seconds'));
        }
      }, 30000);

    } catch (error) {
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
      reject(error);
    }
  });
}

module.exports = {
  generateNotePDF,
  sanitizeFilename,
  formatDuration
};
