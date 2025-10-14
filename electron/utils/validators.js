/**
 * Validation utilities
 */

/**
 * Validate YouTube URL
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const youtubeRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}$/;
  const youtubeRegexWithParams = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(&.*)?)$/;

  return youtubeRegex.test(url) || youtubeRegexWithParams.test(url);
}

/**
 * Validate video ID (integer > 0)
 */
function isValidVideoId(id) {
  return Number.isInteger(id) && id > 0;
}

/**
 * Validate filename for security
 * Ensures no path traversal attempts
 */
function isValidFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }

  // Check for valid extension
  const validExtensions = ['.mp4', '.webm', '.mkv'];
  const hasValidExtension = validExtensions.some(ext => filename.toLowerCase().endsWith(ext));

  return hasValidExtension;
}

/**
 * Validate transcript content
 */
function isValidTranscript(content) {
  // Allow empty transcripts
  if (content === '' || content === null || content === undefined) {
    return true;
  }

  // Must be a string
  if (typeof content !== 'string') {
    return false;
  }

  // Check reasonable length (max 1MB of text)
  const MAX_LENGTH = 1024 * 1024;
  return content.length <= MAX_LENGTH;
}

module.exports = {
  isValidYouTubeUrl,
  isValidVideoId,
  isValidFilename,
  isValidTranscript,
};
