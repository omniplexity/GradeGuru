const fs = require('fs');
const os = require('os');
const path = require('path');
const { ProjectStore } = require('../src/backend/storage/projectStore');
const { AssignmentStore } = require('../src/backend/storage/assignmentStore');
const { ChatStore } = require('../src/backend/storage/chatStore');
const { VectorIndex } = require('../src/backend/rag/vectorIndex');
const { parsePDF } = require('../src/backend/rag/documentParser');
const { EmbeddingEngine } = require('../src/backend/rag/embeddingEngine');
const { ToolManager } = require('../src/backend/tools/toolManager');
const { ModelRouter } = require('../src/backend/ai/modelRouter');
const { AIEngine } = require('../src/backend/ai/aiEngine');
const { ContextBuilder } = require('../src/backend/ai/contextBuilder');
const { planAssignment } = require('../src/backend/ai/reasoning/planner');
const { evaluateRubric } = require('../src/backend/ai/reasoning/rubricEvaluator');
const ANNIndex = require('../src/backend/rag/annIndex');
const { verifyCitations } = require('../src/backend/ai/citationVerifier');

class FakeDatabase {
  constructor() {
    this.tables = {
      classes: [],
      assignments: [],
      sources: [],
      chats: [],
      messages: [],
      source_chunks: [],
      settings: [],
      assignment_drafts: [],
      reasoning_traces: [],
    };
    this.counters = {
      classes: 1,
      assignments: 1,
      sources: 1,
      chats: 1,
      messages: 1,
      source_chunks: 1,
      assignment_drafts: 1,
      reasoning_traces: 1,
    };
  }

  prepare(sql) {
    const text = sql.replace(/\s+/g, ' ').trim();
    const db = this;

    return {
      run(...args) {
        if (text.includes('INSERT INTO classes')) {
          const row = { id: db.counters.classes++, name: args[0], created_at: args[1] };
          db.tables.classes.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('INSERT INTO assignments')) {
          const row = {
            id: db.counters.assignments++,
            class_id: args[0],
            title: args[1],
            description: args[2],
            due_date: args[3],
            instructions: args[4],
            rubric: args[5],
            generated_work: args[6],
            status: args[7],
            created_at: args[8],
            updated_at: args[9],
          };
          db.tables.assignments.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('UPDATE assignments SET')) {
          const row = db.tables.assignments.find((item) => item.id === args[8]);
          Object.assign(row, {
            title: args[0],
            description: args[1],
            due_date: args[2],
            instructions: args[3],
            rubric: args[4],
            generated_work: args[5],
            status: args[6],
            updated_at: args[7],
          });
          return { changes: 1 };
        }

        if (text.includes('INSERT INTO sources')) {
          const row = {
            id: db.counters.sources++,
            assignment_id: args[0],
            file_path: args[1],
            embedding_index: args[2],
            type: args[3],
          };
          db.tables.sources.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('UPDATE sources SET embedding_index')) {
          const row = db.tables.sources.find((item) => item.id === Number(args[args.length - 1]));
          const literalMatch = text.match(/SET embedding_index = '([^']+)'/);
          row.embedding_index = literalMatch ? literalMatch[1] : args[0];
          return { changes: 1 };
        }

        if (text.includes('INSERT INTO chats')) {
          const row = {
            id: db.counters.chats++,
            assignment_id: args[0],
            title: args[1],
            created_at: args[2],
          };
          db.tables.chats.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('INSERT INTO messages')) {
          const row = {
            id: db.counters.messages++,
            chat_id: args[0],
            role: args[1],
            content: args[2],
            attachments: args[3],
            timestamp: args[4],
          };
          db.tables.messages.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('DELETE FROM source_chunks')) {
          db.tables.source_chunks = db.tables.source_chunks.filter((item) => item.source_id !== args[0]);
          return { changes: 1 };
        }

        if (text.includes('INSERT INTO source_chunks')) {
          db.tables.source_chunks.push({
            id: db.counters.source_chunks++,
            source_id: args[0],
            assignment_id: args[1],
            chunk_index: args[2],
            chunk_text: args[3],
            embedding: args[4],
            embedding_json: args[5],
          });
          return { lastInsertRowid: db.counters.source_chunks - 1 };
        }

        if (text.includes('UPDATE source_chunks SET embedding = ?, embedding_json = ?')) {
          const row = db.tables.source_chunks.find((item) => item.id === Number(args[2]));
          row.embedding = args[0];
          row.embedding_json = args[1];
          return { changes: 1 };
        }

        if (text.includes('INSERT INTO settings')) {
          db.tables.settings = [{ id: 1, payload: args[0] }];
          return { changes: 1 };
        }

        if (text.includes('INSERT INTO assignment_drafts')) {
          const row = {
            id: db.counters.assignment_drafts++,
            assignment_id: args[0],
            version: args[1],
            content: args[2],
            created_at: new Date().toISOString(),
          };
          db.tables.assignment_drafts.push(row);
          return { lastInsertRowid: row.id };
        }

        if (text.includes('INSERT INTO reasoning_traces')) {
          const row = {
            id: db.counters.reasoning_traces++,
            assignment_id: args[0],
            plan: args[1],
            critique: args[2],
            revisions: args[3],
            created_at: new Date().toISOString(),
          };
          db.tables.reasoning_traces.push(row);
          return { lastInsertRowid: row.id };
        }

        throw new Error(`Unsupported run SQL: ${text}`);
      },

      get(...args) {
        if (text.includes('SELECT COUNT(*) AS count FROM classes')) {
          return { count: db.tables.classes.length };
        }

        if (text.includes('SELECT payload FROM settings WHERE id = 1')) {
          return db.tables.settings[0] || undefined;
        }

        if (text.includes('SELECT COALESCE(MAX(version), 0) AS version FROM assignment_drafts')) {
          const rows = db.tables.assignment_drafts.filter((item) => item.assignment_id === Number(args[0]));
          const version = rows.reduce((max, row) => Math.max(max, row.version), 0);
          return { version };
        }

        if (text.includes('FROM assignments WHERE id = ?')) {
          const row = db.tables.assignments.find((item) => item.id === Number(args[0]));
          return row ? mapAssignmentRow(row) : undefined;
        }

        if (text.includes('FROM sources WHERE id = ?')) {
          const row = db.tables.sources.find((item) => item.id === Number(args[0]));
          return row ? mapSourceRow(row) : undefined;
        }

        throw new Error(`Unsupported get SQL: ${text}`);
      },

      all(...args) {
        if (text.includes('FROM classes')) {
          return db.tables.classes
            .slice()
            .sort((left, right) => left.created_at.localeCompare(right.created_at))
            .map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
        }

        if (text.includes('FROM assignments WHERE class_id = ?')) {
          return db.tables.assignments
            .filter((item) => item.class_id === Number(args[0]))
            .map(mapAssignmentRow);
        }

        if (text.includes('FROM sources WHERE assignment_id = ?')) {
          return db.tables.sources
            .filter((item) => item.assignment_id === Number(args[0]))
            .map(mapSourceRow);
        }

        if (text.includes('FROM chats WHERE assignment_id = ?')) {
          return db.tables.chats
            .filter((item) => item.assignment_id === Number(args[0]))
            .map((row) => ({
              id: row.id,
              assignmentId: row.assignment_id,
              title: row.title,
              createdAt: row.created_at,
            }));
        }

        if (text.includes('FROM messages WHERE chat_id = ?')) {
          return db.tables.messages
            .filter((item) => item.chat_id === Number(args[0]))
            .sort((left, right) => left.id - right.id)
            .map((row) => ({
              id: row.id,
              chatId: row.chat_id,
              role: row.role,
              content: row.content,
              attachments: row.attachments,
              timestamp: row.timestamp,
            }));
        }

        if (text.includes('FROM source_chunks WHERE assignment_id = ?')) {
          return db.tables.source_chunks
            .filter((item) => item.assignment_id === Number(args[0]))
            .map((row) => ({
              id: row.id,
              sourceId: row.source_id,
              assignmentId: row.assignment_id,
              chunkIndex: row.chunk_index,
              chunkText: row.chunk_text,
              embedding: row.embedding,
              embeddingJson: row.embedding_json,
            }));
        }

        if (text.includes("FROM source_chunks WHERE embedding IS NOT NULL AND embedding != ''")) {
          return db.tables.source_chunks
            .filter((item) => item.embedding)
            .map((row) => ({
              id: row.id,
              assignmentId: row.assignment_id,
              embedding: row.embedding,
            }));
        }

        if (text.includes('FROM source_chunks WHERE source_id = ?')) {
          return db.tables.source_chunks
            .filter((item) => item.source_id === Number(args[0]))
            .map((row) => ({ id: row.id }));
        }

        if (text.includes('FROM source_chunks WHERE id IN')) {
          const ids = new Set(args.map((value) => Number(value)));
          return db.tables.source_chunks
            .filter((item) => ids.has(item.id))
            .map((row) => ({
              id: row.id,
              sourceId: row.source_id,
              assignmentId: row.assignment_id,
              chunkIndex: row.chunk_index,
              chunkText: row.chunk_text,
              embedding: row.embedding,
              embeddingJson: row.embedding_json,
            }));
        }

        if (text.includes('FROM assignments JOIN classes')) {
          return [];
        }

        if (text.includes('FROM chats JOIN assignments')) {
          return [];
        }

        throw new Error(`Unsupported all SQL: ${text}`);
      },
    };
  }
}

function mapAssignmentRow(row) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    instructions: row.instructions,
    rubric: row.rubric,
    generatedWork: row.generated_work,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSourceRow(row) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    filePath: row.file_path,
    embeddingIndex: row.embedding_index,
    type: row.type,
  };
}

describe('Workflow stabilization', () => {
  test('create class -> create assignment -> default chat -> message -> source indexing', async () => {
    const db = new FakeDatabase();
    const projectStore = new ProjectStore(db);
    const chatStore = new ChatStore(db);
    const assignmentStore = new AssignmentStore(db, chatStore);
    const vectorIndex = new VectorIndex(db);
    vectorIndex.embeddingEngine.embed = jest.fn(async (text) => [text.length, 0.25, 0.5]);

    const createdClass = projectStore.createClass({ name: 'Physics' });
    expect(createdClass.name).toBe('Physics');

    const assignment = assignmentStore.createAssignment({
      classId: createdClass.id,
      title: 'Lab Summary',
      instructions: 'Summarize the experiment.',
      rubric: 'Method - 10 points\nAnalysis - 20 points',
    });

    const chats = chatStore.listChatsByAssignment(assignment.id);
    expect(chats).toHaveLength(1);
    expect(chats[0].title).toBe('Default Chat');

    const message = chatStore.addMessage(chats[0].id, {
      role: 'user',
      content: 'Draft the introduction.',
      attachments: [],
    });
    expect(message.content).toBe('Draft the introduction.');

    const source = assignmentStore.addSource(assignment.id, {
      filePath: 'Seed:Lab Summary',
      type: 'seed-note',
    });
    expect(source.embeddingIndex).toBe('pending');

    await vectorIndex.indexVirtualSource(source, 'Experiment setup\n\nResult interpretation');

    const refreshedSource = assignmentStore.getSources(assignment.id)[0];
    expect(refreshedSource.embeddingIndex).toBe('ready');
    expect(db.tables.source_chunks.length).toBeGreaterThan(0);
    expect(db.tables.source_chunks[0].embedding).toContain('[');
  });

  test('document parser extracts pdf text', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gradeguru-rag-'));
    const pdfPath = path.join(tempDir, 'sample.pdf');

    fs.writeFileSync(pdfPath, createPdfBuffer('Academic retrieval pipeline test document.'));

    const text = await parsePDF(pdfPath);

    expect(text).toContain('Academic retrieval pipeline test document');
  });

  test('embedding engine returns vector', async () => {
    const engine = new EmbeddingEngine({
      pipelineFactory: async () => async () => ({
        data: Float32Array.from([0.1, 0.2, 0.3, 0.4]),
      }),
    });

    const vector = await engine.embed('test sentence');

    expect(vector).toHaveLength(4);
    expect(vector[0]).toBeGreaterThan(0);
  });

  test('ann index returns neighbors', () => {
    const index = new ANNIndex(3);

    index.add(1, [1, 0, 0]);
    index.add(2, [0, 1, 0]);

    const result = index.search([1, 0, 0], 1);

    expect(result.length).toBe(1);
  });

  test('tool manager returns structured tool results', async () => {
    const toolManager = new ToolManager();
    const result = await toolManager.runTool('math_solver', { problem: '2 + 2' });

    expect(result.type).toBe('toolResult');
    expect(result.tool).toBe('math_solver');
    expect(result.output.answer).toBe('4');
  });

  test('router selects the highest priority available provider', async () => {
    const router = new ModelRouter({
      configPath: null,
      registry: {
        async getAvailableProviders() {
          return [
            createProvider({ id: 'openrouter', name: 'OpenRouter', capabilities: { streaming: true, vision: true, tools: true } }),
            createProvider({ id: 'ollama', name: 'Ollama', capabilities: { streaming: true, vision: true, tools: false } }),
          ];
        },
      },
    });

    const provider = await router.selectProvider();

    expect(provider.id).toBe('ollama');
  });

  test('router filters providers by capability', async () => {
    const router = new ModelRouter({
      configPath: null,
      registry: {
        async getAvailableProviders() {
          return [
            createProvider({ id: 'groq', name: 'Groq', capabilities: { streaming: true, vision: false, tools: true } }),
            createProvider({ id: 'openrouter', name: 'OpenRouter', capabilities: { streaming: true, vision: true, tools: true } }),
          ];
        },
      },
    });

    const provider = await router.selectProvider({
      streaming: true,
      vision: true,
    });

    expect(provider).toBeDefined();
    expect(provider.id).toBe('openrouter');
  });

  test('router falls back to offline mode when no providers are available', async () => {
    const router = new ModelRouter({
      configPath: null,
      registry: {
        async getAvailableProviders() {
          return [];
        },
      },
    });

    const chunks = [];
    const response = await router.streamText({
      assignment: { title: 'Essay Draft' },
      context: { relevantChunks: [] },
      plan: ['Write an intro'],
      userMessage: 'Draft the introduction.',
    }, (chunk) => chunks.push(chunk));

    expect(response.model.id).toBe('offline-academic');
    expect(response.content).toContain('Offline Academic Draft');
    expect(chunks.at(-1).done).toBe(true);
  });

  test('router retries the next provider when the first one fails', async () => {
    const failingProvider = createProvider({
      id: 'lmstudio',
      name: 'LM Studio',
      streamError: new Error('LM Studio unavailable'),
      capabilities: { streaming: true, vision: false, tools: false },
    });
    const fallbackProvider = createProvider({
      id: 'groq',
      name: 'Groq',
      chunks: ['Hello', ' world'],
      capabilities: { streaming: true, vision: false, tools: true },
    });

    const router = new ModelRouter({
      configPath: null,
      registry: {
        async getAvailableProviders() {
          return [failingProvider, fallbackProvider];
        },
      },
    });

    const streamed = [];
    const response = await router.streamText({
      assignment: { title: 'Essay Draft' },
      context: { relevantChunks: [] },
      plan: ['Write an intro'],
      userMessage: 'Draft the introduction.',
    }, (chunk) => streamed.push(chunk));

    expect(response.model.providerId).toBe('groq');
    expect(response.content).toBe('Hello world');
    expect(streamed.some((chunk) => chunk.content === 'Hello')).toBe(true);
  });

  test('router generate retries provider failure', async () => {
    const failingProvider = createProvider({
      id: 'lmstudio',
      name: 'LM Studio',
      generateError: new Error('LM Studio unavailable'),
      capabilities: { streaming: true, vision: false, tools: false },
    });
    const fallbackProvider = createProvider({
      id: 'groq',
      name: 'Groq',
      chunks: ['Recovered'],
      capabilities: { streaming: true, vision: false, tools: true },
    });

    const router = new ModelRouter({
      configPath: null,
      registry: {
        async getAvailableProviders() {
          return [failingProvider, fallbackProvider];
        },
      },
    });

    const result = await router.generate({
      messages: [{ role: 'user', content: 'test' }],
      require: { streaming: true },
    });

    expect(result).toBe('Recovered');
  });

  test('planner generates structured reasoning steps', () => {
    const plan = planAssignment({
      instructions: 'Write an essay',
      rubric: 'Thesis\nEvidence',
      userQuery: 'Draft my response',
    });

    expect(plan.goal).toBe('Draft my response');
    expect(plan.steps.length).toBeGreaterThan(2);
    expect(plan.steps).toContain('Retrieve relevant sources');
  });

  test('context builder adds citation safety instructions', async () => {
    const builder = new ContextBuilder({
      assignmentStore: {
        getAssignment() {
          return {
            id: 1,
            title: 'Essay',
            instructions: 'Explain the argument.',
            rubric: 'Evidence',
          };
        },
      },
      chatStore: {
        getRecentMessages() {
          return [{ role: 'user', content: 'Use the article.' }];
        },
      },
      vectorIndex: {
        async search() {
          return [{ chunkText: 'Source evidence paragraph.' }];
        },
      },
    });

    const context = await builder.buildContext(1, 'Help me write this', 1);

    expect(context.prompt).toContain('Use citations like [1].');
    expect(context.prompt).toContain('Do not fabricate sources.');
  });

  test('rubric evaluator reports satisfied criteria', () => {
    const report = evaluateRubric('Clear thesis with supporting evidence [1].', 'Thesis\nEvidence');

    expect(report).toHaveLength(2);
    expect(report.every((entry) => entry.satisfied)).toBe(true);
  });

  test('citation verifier detects invalid references', () => {
    const result = verifyCitations('Example text [1] [3]', [{}, {}]);

    expect(result.valid).toBe(false);
  });

  test('ai engine runs reasoning pipeline and streams final revision', async () => {
    const db = new FakeDatabase();
    const projectStore = new ProjectStore(db);
    const chatStore = new ChatStore(db);
    const assignmentStore = new AssignmentStore(db, chatStore);
    const vectorIndex = new VectorIndex(db);

    vectorIndex.search = jest.fn(async () => [
      { chunkText: 'Primary source support for the thesis.' },
    ]);

    const createdClass = projectStore.createClass({ name: 'English' });
    const assignment = assignmentStore.createAssignment({
      classId: createdClass.id,
      title: 'Argument Essay',
      instructions: 'Write a short argument essay.',
      rubric: 'Thesis\nEvidence',
    });
    const chat = chatStore.listChatsByAssignment(assignment.id)[0];

    const router = {
      generate: jest.fn()
        .mockResolvedValueOnce('Initial draft with thesis [1].')
        .mockResolvedValueOnce('Missing evidence support.')
        .mockResolvedValueOnce('Revised draft with thesis and evidence [1].'),
    };

    const aiEngine = new AIEngine({
      assignmentStore,
      chatStore,
      vectorIndex,
      modelRouter: router,
      toolManager: {
        runTool: jest.fn(),
      },
    });

    const chunks = [];
    const assistantMessage = await aiEngine.streamAssignmentResponse({
      assignmentId: assignment.id,
      chatId: chat.id,
      message: 'Write a draft for me',
      attachments: [],
      onChunk: (chunk) => chunks.push(chunk),
    });

    expect(router.generate).toHaveBeenCalledTimes(3);
    expect(aiEngine.metrics.reasoning).toEqual({
      plans: 1,
      drafts: 1,
      revisions: 1,
    });
    expect(assistantMessage.content).toContain('thesis and evidence');
    expect(chunks.some((chunk) => chunk.content.includes('Revised draft'))).toBe(true);
    expect(chunks.at(-1).done).toBe(true);
    expect(db.tables.assignment_drafts).toHaveLength(1);
    expect(db.tables.reasoning_traces).toHaveLength(1);
  });
});

function createProvider({
  id,
  name,
  chunks = ['ok'],
  streamError = null,
  generateError = null,
  capabilities = { streaming: true, vision: false, tools: false },
}) {
  return {
    id,
    name,
    priority: id === 'ollama' ? 2 : id === 'openrouter' ? 5 : id === 'groq' ? 3 : 1,
    capabilities() {
      return capabilities;
    },
    async generate() {
      if (generateError || streamError) {
        throw (generateError || streamError);
      }
      return chunks.join('');
    },
    async *stream() {
      if (streamError) {
        throw streamError;
      }
      for (const chunk of chunks) {
        yield { type: 'token', text: chunk };
      }
      yield { type: 'end' };
    },
  };
}

function createPdfBuffer(text) {
  const parts = [];
  const offsets = [0];

  function push(value) {
    parts.push(value);
  }

  function pushObject(id, body) {
    offsets[id] = Buffer.byteLength(parts.join(''), 'utf8');
    push(`${id} 0 obj\n${body}\nendobj\n`);
  }

  push('%PDF-1.4\n');
  pushObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  pushObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  pushObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');

  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${escapePdfText(text)}) Tj\nET`;
  pushObject(4, `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  pushObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const startXref = Buffer.byteLength(parts.join(''), 'utf8');
  push('xref\n');
  push('0 6\n');
  push('0000000000 65535 f \n');

  for (let index = 1; index <= 5; index += 1) {
    push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }

  push('trailer\n');
  push('<< /Size 6 /Root 1 0 R >>\n');
  push('startxref\n');
  push(`${startXref}\n`);
  push('%%EOF');

  return Buffer.from(parts.join(''), 'utf8');
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
