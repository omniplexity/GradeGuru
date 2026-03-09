class AssignmentStore {
  constructor(db, chatStore = null) {
    this.db = db;
    this.chatStore = chatStore;
  }

  createAssignment(payload) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO assignments (
        class_id, title, description, due_date, instructions, rubric, generated_work, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.classId,
      payload.title.trim(),
      payload.description || '',
      payload.dueDate || '',
      payload.instructions || '',
      payload.rubric || '',
      payload.generatedWork || '',
      payload.status || 'draft',
      now,
      now
    );

    const assignmentId = Number(result.lastInsertRowid);

    if (this.chatStore) {
      this.chatStore.createChat(assignmentId, 'Default Chat');
    }

    return this.getAssignment(assignmentId);
  }

  listAssignmentsByClass(classId) {
    return this.db.prepare(`
      SELECT
        id,
        class_id AS classId,
        title,
        description,
        due_date AS dueDate,
        instructions,
        rubric,
        generated_work AS generatedWork,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assignments
      WHERE class_id = ?
      ORDER BY due_date ASC, updated_at DESC
    `).all(classId);
  }

  getAssignment(assignmentId) {
    return this.db.prepare(`
      SELECT
        id,
        class_id AS classId,
        title,
        description,
        due_date AS dueDate,
        instructions,
        rubric,
        generated_work AS generatedWork,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assignments
      WHERE id = ?
    `).get(assignmentId);
  }

  getSources(assignmentId) {
    return this.db.prepare(`
      SELECT id, assignment_id AS assignmentId, file_path AS filePath, embedding_index AS embeddingIndex, type
      FROM sources
      WHERE assignment_id = ?
      ORDER BY id ASC
    `).all(assignmentId);
  }

  getAssignmentBundle(assignmentId, chatStore) {
    const assignment = this.getAssignment(assignmentId);
    return {
      ...assignment,
      sources: this.getSources(assignmentId),
      chats: chatStore.listChatsByAssignment(assignmentId),
    };
  }

  updateAssignment(assignmentId, patch) {
    const current = this.getAssignment(assignmentId);
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.db.prepare(`
      UPDATE assignments
      SET title = ?,
          description = ?,
          due_date = ?,
          instructions = ?,
          rubric = ?,
          generated_work = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      next.title,
      next.description,
      next.dueDate,
      next.instructions,
      next.rubric,
      next.generatedWork || '',
      next.status,
      next.updatedAt,
      assignmentId
    );

    return this.getAssignment(assignmentId);
  }

  addSource(assignmentId, payload) {
    const result = this.db.prepare(`
      INSERT INTO sources (assignment_id, file_path, embedding_index, type)
      VALUES (?, ?, ?, ?)
    `).run(assignmentId, payload.filePath, payload.embeddingIndex || 'pending', payload.type || 'file');

    return this.db.prepare(`
      SELECT id, assignment_id AS assignmentId, file_path AS filePath, embedding_index AS embeddingIndex, type
      FROM sources
      WHERE id = ?
    `).get(result.lastInsertRowid);
  }

  updateSourceIndexStatus(sourceId, embeddingIndex) {
    this.db.prepare(`
      UPDATE sources
      SET embedding_index = ?
      WHERE id = ?
    `).run(embeddingIndex, sourceId);
  }

  getNextDraftVersion(assignmentId) {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(version), 0) AS version
      FROM assignment_drafts
      WHERE assignment_id = ?
    `).get(assignmentId);

    return Number(row?.version || 0) + 1;
  }

  saveDraft(assignmentId, content) {
    const version = this.getNextDraftVersion(assignmentId);
    const result = this.db.prepare(`
      INSERT INTO assignment_drafts (assignment_id, version, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(assignmentId, version, content);

    return {
      id: Number(result.lastInsertRowid),
      assignmentId,
      version,
      content,
    };
  }

  saveReasoningTrace(assignmentId, { plan, critique, revisions }) {
    const result = this.db.prepare(`
      INSERT INTO reasoning_traces (assignment_id, plan, critique, revisions, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      assignmentId,
      JSON.stringify(plan || []),
      critique || '',
      revisions || 0,
    );

    return Number(result.lastInsertRowid);
  }
}

module.exports = {
  AssignmentStore,
};
