const { MathSolver } = require('./mathSolver');
const { RubricParser } = require('./rubricParser');
const { CitationFormatter } = require('./citationFormatter');
const { ImageProblemSolver } = require('./imageProblemSolver');

class ToolManager {
  constructor() {
    this.tools = {
      math_solver: {
        name: 'math_solver',
        label: 'Math Solver',
        description: 'Evaluate arithmetic expressions and simple equations.',
        run: (input) => new MathSolver().solve(input),
      },
      image_problem_solver: {
        name: 'image_problem_solver',
        label: 'Image Solver',
        description: 'OCR an image and attempt to solve detected homework problems.',
        run: (input) => new ImageProblemSolver().solve(input),
      },
      rubric_parser: {
        name: 'rubric_parser',
        label: 'Rubric Parser',
        description: 'Turn rubric text into structured scoring criteria.',
        run: (input) => new RubricParser().parse(input),
      },
      citation_formatter: {
        name: 'citation_formatter',
        label: 'Citation Formatter',
        description: 'Generate quick APA or MLA citations.',
        run: (input) => ({ citation: new CitationFormatter().format(input) }),
      },
      document_reader: {
        name: 'document_reader',
        label: 'Document Reader',
        description: 'Request document snippets from the retrieval layer.',
        run: (input) => ({ request: input }),
      },
    };
  }

  listTools() {
    return Object.values(this.tools).map(({ run, ...tool }) => tool);
  }

  async runTool(name, input) {
    const tool = this.tools[name];
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const output = await tool.run(input || {});
    return {
      type: 'toolResult',
      tool: name,
      output,
    };
  }
}

module.exports = {
  ToolManager,
};
