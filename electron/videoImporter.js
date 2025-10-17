const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Formats that Chromium/Electron can play natively
const SUPPORTED_FORMATS = ['.mp4', '.webm', '.ogg'];

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const LARGE_FILE_WARNING_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

// Conversion timeout (30 minutes for very large files)
const CONVERSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Check if FFmpeg is installed on the system
 */
async function checkFFmpegInstalled() {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    console.log('FFmpeg detected:', stdout.split('\n')[0]);
    return true;
  } catch (error) {
    console.error('FFmpeg not found:', error.message);
    return false;
  }
}

/**
 * Check if a video file needs conversion to be playable
 */
function needsConversion(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return !SUPPORTED_FORMATS.includes(ext);
}

/**
 * Extract video information from file path
 */
function getVideoInfo(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath).toLowerCase();

  return {
    title: filename,
    extension: ext,
    needsConversion: needsConversion(filePath),
    originalPath: filePath
  };
}

/**
 * Generate a unique video ID
 */
function generateVideoId() {
  return 'imported_' + Date.now() + '_' + Math.random().toString(36).substring(7);
}

/**
 * Convert video to MP4 using FFmpeg
 * @param {string} inputPath - Source video file path
 * @param {string} outputPath - Destination MP4 file path
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<void>}
 */
async function convertToMP4(inputPath, outputPath, onProgress, timeout = CONVERSION_TIMEOUT) {
  return new Promise((resolve, reject) => {
    console.log(`Converting video: ${inputPath} -> ${outputPath}`);

    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-c:v', 'libx264',        // H.264 video codec
      '-preset', 'fast',         // Faster encoding
      '-crf', '23',              // Quality (lower = better, 18-28 range)
      '-c:a', 'aac',            // AAC audio codec
      '-b:a', '128k',           // Audio bitrate
      '-movflags', '+faststart', // Web optimization (moov atom at start)
      '-y',                     // Overwrite output file
      '-progress', 'pipe:2',    // Output progress to stderr
      outputPath
    ]);

    let stderr = '';
    let duration = null;
    let timeoutHandle = null;

    // Set timeout for conversion
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        reject(new Error(`Video conversion timed out after ${Math.floor(timeout / 60000)} minutes. The file may be too large or complex.`));
      }, timeout);
    }

    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;

      // Parse video duration from FFmpeg output (appears early in output)
      if (!duration) {
        const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseInt(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      }

      // Parse current time progress
      if (onProgress && duration) {
        const timeMatch = chunk.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const percentage = Math.min(Math.round((currentTime / duration) * 100), 99);

          onProgress({
            stage: 'converting',
            progress: percentage,
            currentTime,
            duration
          });
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (code === 0) {
        console.log('Video conversion completed successfully');
        if (onProgress) {
          onProgress({ stage: 'completed', progress: 100 });
        }
        resolve();
      } else {
        console.error('FFmpeg conversion failed with code:', code);
        console.error('FFmpeg stderr:', stderr);

        // Provide more helpful error messages
        let errorMessage = 'Video conversion failed';
        if (stderr.includes('Invalid data')) {
          errorMessage = 'The video file appears to be corrupted or in an unsupported format';
        } else if (stderr.includes('No such file')) {
          errorMessage = 'Video file not found';
        } else if (stderr.includes('Permission denied')) {
          errorMessage = 'Permission denied - unable to access video file';
        }

        reject(new Error(errorMessage));
      }
    });

    ffmpeg.on('error', (error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.error('FFmpeg process error:', error);
      reject(new Error('Failed to start video conversion. Please ensure FFmpeg is installed correctly.'));
    });
  });
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Get available disk space in bytes
 */
async function getAvailableDiskSpace(dirPath) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      // Use df command on Unix-like systems
      const { stdout } = await execAsync(`df -k "${dirPath}" | tail -1 | awk '{print $4}'`);
      return parseInt(stdout.trim()) * 1024; // Convert from KB to bytes
    } else if (process.platform === 'win32') {
      // Use wmic on Windows
      const drive = dirPath.substring(0, 2); // e.g., "C:"
      const { stdout } = await execAsync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`);
      const lines = stdout.trim().split('\n');
      return parseInt(lines[1].trim());
    }
  } catch (error) {
    console.error('Error getting disk space:', error);
    return null;
  }
}

/**
 * Check if file is likely a valid video by checking magic numbers
 */
function isLikelyValidVideo(filePath) {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // Check for common video file signatures
    const hex = buffer.toString('hex');

    // MP4/MOV: starts with ftyp
    if (hex.includes('66747970')) return true;

    // AVI: starts with RIFF....AVI
    if (hex.substring(0, 8) === '52494646' && hex.substring(16, 24) === '41564920') return true;

    // WebM/MKV: starts with EBML
    if (hex.substring(0, 8) === '1a45dfa3') return true;

    // FLV: starts with FLV
    if (hex.substring(0, 6) === '464c56') return true;

    // If we can't detect format, assume it might be valid
    return true;
  } catch (error) {
    console.error('Error checking file validity:', error);
    return true; // Assume valid if we can't check
  }
}

/**
 * Format bytes to human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Copy video file directly (for supported formats)
 * @param {string} sourcePath - Source video file path
 * @param {string} destPath - Destination file path
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<void>}
 */
async function copyVideoFile(sourcePath, destPath, onProgress) {
  console.log(`Copying video: ${sourcePath} -> ${destPath}`);

  if (onProgress) {
    onProgress({ stage: 'copying', progress: 0 });
  }

  // For copy operations, we'll just show intermediate progress
  await fs.copyFile(sourcePath, destPath);

  if (onProgress) {
    onProgress({ stage: 'copying', progress: 100 });
  }

  console.log('Video copied successfully');
}

/**
 * Import a video file into the app
 * @param {string} sourceFilePath - Source video file path
 * @param {string} appDataPath - App data directory path
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Video import result
 */
async function importVideo(sourceFilePath, appDataPath, onProgress) {
  // === Validation Phase ===

  // 1. Check if file exists
  if (!await fs.pathExists(sourceFilePath)) {
    throw new Error('Video file not found. Please ensure the file still exists.');
  }

  const videoInfo = getVideoInfo(sourceFilePath);
  const videoId = generateVideoId();
  const fileSize = getFileSize(sourceFilePath);
  const fileSizeFormatted = formatFileSize(fileSize);

  // 2. Check file size limits
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size (${fileSizeFormatted}) exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}. Please use a smaller file.`);
  }

  // 3. Check if file is likely a valid video
  if (!isLikelyValidVideo(sourceFilePath)) {
    throw new Error('The selected file does not appear to be a valid video file. Please check the file and try again.');
  }

  // 4. Warn about large files (but don't fail)
  const isLargeFile = fileSize > LARGE_FILE_WARNING_SIZE;
  if (isLargeFile) {
    console.warn(`Large file detected: ${fileSizeFormatted}. Import may take a while.`);
  }

  // Ensure downloads directory exists
  const downloadsDir = path.join(appDataPath, 'downloads');
  await fs.ensureDir(downloadsDir);

  // 5. Check available disk space
  const availableSpace = await getAvailableDiskSpace(downloadsDir);
  if (availableSpace !== null) {
    // Estimate required space (conversion may need 2x space temporarily)
    const requiredSpace = videoInfo.needsConversion ? fileSize * 2.5 : fileSize * 1.1;

    if (availableSpace < requiredSpace) {
      throw new Error(`Insufficient disk space. Required: ${formatFileSize(requiredSpace)}, Available: ${formatFileSize(availableSpace)}. Please free up some space and try again.`);
    }
  }

  let outputPath;
  let fileName;

  try {
    if (videoInfo.needsConversion) {
      // Convert to MP4
      fileName = `${videoId}.mp4`;
      outputPath = path.join(downloadsDir, fileName);

      if (onProgress) {
        onProgress({
          stage: 'converting',
          progress: 0,
          fileSize: fileSizeFormatted
        });
      }

      await convertToMP4(sourceFilePath, outputPath, (progressData) => {
        if (onProgress) {
          onProgress({
            ...progressData,
            fileSize: fileSizeFormatted
          });
        }
      });

      if (onProgress) {
        onProgress({
          stage: 'completed',
          progress: 100,
          fileSize: fileSizeFormatted
        });
      }
    } else {
      // Direct copy
      fileName = `${videoId}${videoInfo.extension}`;
      outputPath = path.join(downloadsDir, fileName);

      if (onProgress) {
        onProgress({
          stage: 'copying',
          progress: 0,
          fileSize: fileSizeFormatted
        });
      }

      await copyVideoFile(sourceFilePath, outputPath, (progressData) => {
        if (onProgress) {
          onProgress({
            ...progressData,
            fileSize: fileSizeFormatted
          });
        }
      });

      if (onProgress) {
        onProgress({
          stage: 'completed',
          progress: 100,
          fileSize: fileSizeFormatted
        });
      }
    }

    return {
      success: true,
      videoId,
      title: videoInfo.title,
      filePath: outputPath,
      fileName,
      wasConverted: videoInfo.needsConversion
    };
  } catch (error) {
    // Clean up partial file if it exists
    if (outputPath && await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }
    throw error;
  }
}

module.exports = {
  checkFFmpegInstalled,
  needsConversion,
  getVideoInfo,
  generateVideoId,
  convertToMP4,
  copyVideoFile,
  importVideo,
  getFileSize,
  formatFileSize,
  getAvailableDiskSpace,
  isLikelyValidVideo,
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE,
  LARGE_FILE_WARNING_SIZE
};
