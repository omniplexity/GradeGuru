const path = require('path');
const BetterSqlite3 = require('better-sqlite3');

class DatabaseManager {
  constructor(app) {
    const dbPath = path.join(app.getPath('userData'), 'gradeguru-v2.db');
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        due_date TEXT DEFAULT '',
        instructions TEXT DEFAULT '',
        rubric TEXT DEFAULT '',
        generated_work TEXT DEFAULT '',
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(class_id) REFERENCES classes(id)
      );

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        embedding_index TEXT DEFAULT '',
        type TEXT DEFAULT 'file',
        FOREIGN KEY(assignment_id) REFERENCES assignments(id)
      );

      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        title TEXT DEFAULT 'Assignment Chat',
        created_at TEXT NOT NULL,
        FOREIGN KEY(assignment_id) REFERENCES assignments(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        attachments TEXT DEFAULT '[]',
        timestamp TEXT NOT NULL,
        FOREIGN KEY(chat_id) REFERENCES chats(id)
      );

      CREATE TABLE IF NOT EXISTS source_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        assignment_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding TEXT DEFAULT '',
        embedding_json TEXT DEFAULT '',
        FOREIGN KEY(source_id) REFERENCES sources(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assignment_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(assignment_id) REFERENCES assignments(id)
      );

      CREATE TABLE IF NOT EXISTS reasoning_traces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        plan TEXT NOT NULL,
        critique TEXT NOT NULL,
        revisions INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(assignment_id) REFERENCES assignments(id)
      );
    `);

    this.ensureColumn('source_chunks', 'embedding', `ALTER TABLE source_chunks ADD COLUMN embedding TEXT DEFAULT ''`);
    this.ensureColumn('source_chunks', 'embedding_json', `ALTER TABLE source_chunks ADD COLUMN embedding_json TEXT DEFAULT ''`);
  }

  ensureColumn(tableName, columnName, sql) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!columns.some((column) => column.name === columnName)) {
      this.db.exec(sql);
    }
  }

  prepare(sql) {
    return this.db.prepare(sql);
  }

  close() {
    this.db.close();
  }
}

module.exports = {
  DatabaseManager,
};
