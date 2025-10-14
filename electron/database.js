const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const { DB, DIRS } = require('./config/constants');
const { isValidVideoId, isValidTranscript } = require('./utils/validators');

let db;

function initDatabase() {
  const userDataPath = app.getPath(DIRS.USER_DATA);
  const dbPath = path.join(userDataPath, DB.NAME);

  // Ensure userData directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');  // Enable foreign key constraints

  // Create videos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      thumbnail TEXT,
      duration INTEGER,
      download_date INTEGER NOT NULL
    )
  `);

  // Create transcripts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);

  console.log('Database initialized at:', dbPath);
}

function getAllVideos() {
  try {
    const stmt = db.prepare('SELECT * FROM videos ORDER BY download_date DESC');
    return stmt.all();
  } catch (error) {
    console.error('Error getting all videos:', error);
    throw new Error(`Failed to retrieve videos: ${error.message}`);
  }
}

function getVideo(id) {
  try {
    if (!isValidVideoId(id)) {
      throw new Error('Invalid video ID');
    }

    const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
    return stmt.get(id);
  } catch (error) {
    console.error('Error getting video:', error);
    throw new Error(`Failed to retrieve video: ${error.message}`);
  }
}

function addVideo(videoData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO videos (title, url, filename, thumbnail, duration, download_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      videoData.title,
      videoData.url,
      videoData.filename,
      videoData.thumbnail || null,
      videoData.duration || null,
      Date.now()
    );

    // Create empty transcript
    const transcriptStmt = db.prepare(`
      INSERT INTO transcripts (video_id, content, created_at, updated_at)
      VALUES (?, '', ?, ?)
    `);
    const now = Date.now();
    transcriptStmt.run(result.lastInsertRowid, now, now);

    return getVideo(result.lastInsertRowid);
  } catch (error) {
    console.error('Error adding video:', error);
    throw new Error(`Failed to add video to database: ${error.message}`);
  }
}

function updateTranscript(videoId, content) {
  try {
    if (!isValidVideoId(videoId)) {
      throw new Error('Invalid video ID');
    }

    if (!isValidTranscript(content)) {
      throw new Error('Invalid transcript content');
    }

    const stmt = db.prepare(`
      UPDATE transcripts
      SET content = ?, updated_at = ?
      WHERE video_id = ?
    `);
    stmt.run(content, Date.now(), videoId);
  } catch (error) {
    console.error('Error updating transcript:', error);
    throw new Error(`Failed to update transcript: ${error.message}`);
  }
}

function getTranscript(videoId) {
  try {
    const stmt = db.prepare('SELECT content FROM transcripts WHERE video_id = ?');
    const result = stmt.get(videoId);
    return result ? result.content : '';
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw new Error(`Failed to retrieve transcript: ${error.message}`);
  }
}

function deleteVideo(id) {
  try {
    if (!isValidVideoId(id)) {
      throw new Error('Invalid video ID');
    }

    // Get video info before deletion to access filename
    const video = getVideo(id);

    if (!video) {
      throw new Error(`Video with id ${id} not found`);
    }

    // Delete video file from disk
    const videoPath = path.join(app.getPath(DIRS.USER_DATA), DIRS.DOWNLOADS, video.filename);
    if (fs.existsSync(videoPath)) {
      try {
        fs.unlinkSync(videoPath);
        console.log(`Deleted video file: ${videoPath}`);
      } catch (fileError) {
        console.error(`Failed to delete video file: ${fileError.message}`);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete transcript first (due to foreign key)
    const transcriptStmt = db.prepare('DELETE FROM transcripts WHERE video_id = ?');
    transcriptStmt.run(id);

    // Delete video from database
    const videoStmt = db.prepare('DELETE FROM videos WHERE id = ?');
    videoStmt.run(id);

    console.log(`Successfully deleted video id ${id}`);
  } catch (error) {
    console.error(`Error deleting video: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getAllVideos,
  getVideo,
  addVideo,
  updateTranscript,
  getTranscript,
  deleteVideo,
};
