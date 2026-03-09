const defaultSettings = {
  providerPreference: 'local-first',
  selectedModelId: 'offline-academic',
  citationStyle: 'APA',
  autosave: true,
};

class ProjectStore {
  constructor(db) {
    this.db = db;
  }

  listClasses() {
    return this.db.prepare(`
      SELECT id, name, created_at AS createdAt
      FROM classes
      ORDER BY created_at ASC
    `).all();
  }

  createClass(payload) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      INSERT INTO classes (name, created_at)
      VALUES (?, ?)
    `).run(payload.name.trim(), now);

    return {
      id: Number(result.lastInsertRowid),
      name: payload.name.trim(),
      createdAt: now,
    };
  }

  getDashboardSnapshot() {
    return {
      upcomingAssignments: this.db.prepare(`
        SELECT assignments.id, assignments.title, assignments.due_date AS dueDate, assignments.status, classes.name AS className
        FROM assignments
        JOIN classes ON classes.id = assignments.class_id
        ORDER BY assignments.due_date ASC, assignments.updated_at DESC
        LIMIT 5
      `).all(),
      recentChats: this.db.prepare(`
        SELECT chats.id, chats.title, chats.created_at AS createdAt, assignments.title AS assignmentTitle
        FROM chats
        JOIN assignments ON assignments.id = chats.assignment_id
        ORDER BY chats.created_at DESC
        LIMIT 5
      `).all(),
      activeProjects: this.db.prepare(`
        SELECT assignments.id, assignments.title, assignments.status, classes.name AS className
        FROM assignments
        JOIN classes ON classes.id = assignments.class_id
        ORDER BY assignments.updated_at DESC
        LIMIT 6
      `).all(),
    };
  }

  getSettings() {
    const row = this.db.prepare(`SELECT payload FROM settings WHERE id = 1`).get();
    if (!row) {
      this.db.prepare(`INSERT INTO settings (id, payload) VALUES (1, ?)`).run(JSON.stringify(defaultSettings));
      return { ...defaultSettings };
    }

    return { ...defaultSettings, ...JSON.parse(row.payload) };
  }

  updateSettings(patch) {
    const next = { ...this.getSettings(), ...patch };
    this.db.prepare(`
      INSERT INTO settings (id, payload)
      VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload
    `).run(JSON.stringify(next));
    return next;
  }

  ensureSeedData({ assignmentStore, chatStore, vectorIndex }) {
    const row = this.db.prepare(`SELECT COUNT(*) AS count FROM classes`).get();
    if (row.count > 0) {
      return;
    }

    const createdAt = new Date().toISOString();
    const classNames = ['Calculus II', 'Psychology of Learning', 'Computer Science'];
    const classIds = classNames.map((name) => {
      const result = this.db.prepare(`INSERT INTO classes (name, created_at) VALUES (?, ?)`).run(name, createdAt);
      return Number(result.lastInsertRowid);
    });

    const seedAssignments = [
      {
        classId: classIds[0],
        title: 'Optimization Problem Set',
        description: 'Solve derivatives and justify each method.',
        dueDate: '2026-03-12',
        instructions: 'Show each derivative step, identify constraints, and provide a short interpretation of the maximum or minimum.',
        rubric: 'Accuracy - 40 points\nMethod justification - 30 points\nInterpretation - 20 points\nOrganization - 10 points',
      },
      {
        classId: classIds[1],
        title: 'Behavioral Theory Reflection',
        description: 'Short essay on reinforcement models.',
        dueDate: '2026-03-15',
        instructions: 'Write a 900 word reflection connecting operant conditioning to one real classroom case study.',
        rubric: 'Introduction - 10 points\nArgument - 30 points\nUse of evidence - 30 points\nReflection - 20 points\nMechanics - 10 points',
      },
      {
        classId: classIds[2],
        title: 'Distributed Systems Brief',
        description: 'Compare leader election approaches.',
        dueDate: '2026-03-18',
        instructions: 'Produce a concise technical brief comparing Raft and Bully algorithm tradeoffs.',
        rubric: 'Technical correctness - 35 points\nComparison depth - 35 points\nSources - 20 points\nStyle - 10 points',
      },
    ];

    seedAssignments.forEach((payload) => {
      const assignment = assignmentStore.createAssignment(payload);
      const chat = chatStore.listChatsByAssignment(assignment.id)[0];
      chatStore.addMessage(chat.id, {
        role: 'assistant',
        content: `Workspace ready for ${assignment.title}. I can plan, retrieve sources, and draft sections aligned to the rubric.`,
      });
      const source = assignmentStore.addSource(assignment.id, {
        filePath: `Seed:${assignment.title}`,
        type: 'seed-note',
      });
      void vectorIndex.indexVirtualSource(source, `${assignment.instructions}\n\n${assignment.rubric}`).catch(() => {});
    });
  }
}

module.exports = {
  ProjectStore,
};
