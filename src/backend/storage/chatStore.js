class ChatStore {
  constructor(db) {
    this.db = db;
  }

  createChat(assignmentId, title = 'Assignment Chat') {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO chats (assignment_id, title, created_at)
      VALUES (?, ?, ?)
    `).run(assignmentId, title, now);

    return {
      id: Number(result.lastInsertRowid),
      assignmentId,
      title,
      createdAt: now,
    };
  }

  listChatsByAssignment(assignmentId) {
    return this.db.prepare(`
      SELECT id, assignment_id AS assignmentId, title, created_at AS createdAt
      FROM chats
      WHERE assignment_id = ?
      ORDER BY created_at DESC
    `).all(assignmentId);
  }

  listMessages(chatId) {
    return this.db.prepare(`
      SELECT id, chat_id AS chatId, role, content, attachments, timestamp
      FROM messages
      WHERE chat_id = ?
      ORDER BY id ASC
    `).all(chatId).map((row) => ({
      ...row,
      attachments: JSON.parse(row.attachments || '[]'),
    }));
  }

  addMessage(chatId, payload) {
    const timestamp = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO messages (chat_id, role, content, attachments, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(chatId, payload.role, payload.content, JSON.stringify(payload.attachments || []), timestamp);

    return {
      id: Number(result.lastInsertRowid),
      chatId,
      role: payload.role,
      content: payload.content,
      attachments: payload.attachments || [],
      timestamp,
    };
  }

  getRecentMessages(chatId, limit = 8) {
    return this.db.prepare(`
      SELECT id, chat_id AS chatId, role, content, attachments, timestamp
      FROM messages
      WHERE chat_id = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(chatId, limit).reverse().map((row) => ({
      ...row,
      attachments: JSON.parse(row.attachments || '[]'),
    }));
  }
}

module.exports = {
  ChatStore,
};
