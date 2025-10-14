const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db;

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'youtube-notes.db');

  // Ensure userData directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

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
  const stmt = db.prepare('SELECT * FROM videos ORDER BY download_date DESC');
  return stmt.all();
}

function getVideo(id) {
  const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
  return stmt.get(id);
}

function addVideo(videoData) {
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
}

function updateTranscript(videoId, content) {
  const stmt = db.prepare(`
    UPDATE transcripts
    SET content = ?, updated_at = ?
    WHERE video_id = ?
  `);
  stmt.run(content, Date.now(), videoId);
}

function getTranscript(videoId) {
  const stmt = db.prepare('SELECT content FROM transcripts WHERE video_id = ?');
  const result = stmt.get(videoId);
  return result ? result.content : '';
}

function deleteVideo(id) {
  // Delete transcript first (due to foreign key)
  const transcriptStmt = db.prepare('DELETE FROM transcripts WHERE video_id = ?');
  transcriptStmt.run(id);

  // Delete video
  const videoStmt = db.prepare('DELETE FROM videos WHERE id = ?');
  videoStmt.run(id);
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
