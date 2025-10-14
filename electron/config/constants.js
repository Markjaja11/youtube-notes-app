/**
 * Application constants
 */

module.exports = {
  // Directory names
  DIRS: {
    DOWNLOADS: 'downloads',
    USER_DATA: 'userData',
  },

  // Database
  DB: {
    NAME: 'youtube-notes.db',
    TABLES: {
      VIDEOS: 'videos',
      TRANSCRIPTS: 'transcripts',
    },
  },

  // Video formats
  VIDEO: {
    DEFAULT_FORMAT: 'mp4',
    MIME_TYPE: 'video/mp4',
    SUPPORTED_FORMATS: ['mp4', 'webm', 'mkv'],
  },

  // HTTP Status Codes
  HTTP: {
    OK: 200,
    PARTIAL_CONTENT: 206,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Window configuration
  WINDOW: {
    DEFAULT_WIDTH: 1400,
    DEFAULT_HEIGHT: 900,
    MIN_WIDTH: 1000,
    MIN_HEIGHT: 600,
  },
};
