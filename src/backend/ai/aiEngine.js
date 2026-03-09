const { ContextBuilder } = require('./contextBuilder');
const { Planner } = require('./planner');
const { planAssignment } = require('./reasoning/planner');
const { generateDraft } = require('./reasoning/draftGenerator');
const { critiqueDraft } = require('./reasoning/critic');
const { reviseDraft } = require('./reasoning/reviser');
const { evaluateRubric } = require('./reasoning/rubricEvaluator');
const { verifyCitations } = require('./citationVerifier');

const MAX_REVISION_CYCLES = 2;
const STREAM_CHUNK_SIZE = 120;

class AIEngine {
  constructor({ assignmentStore, chatStore, vectorIndex, modelRouter, toolManager }) {
    this.assignmentStore = assignmentStore;
    this.chatStore = chatStore;
    this.contextBuilder = new ContextBuilder({ assignmentStore, chatStore, vectorIndex });
    this.modelRouter = modelRouter;
    this.planner = new Planner();
    this.toolManager = toolManager;
    this.metrics = {
      reasoning: {
        plans: 0,
        drafts: 0,
        revisions: 0,
      },
    };
  }

  async streamAssignmentResponse({ assignmentId, chatId, message, attachments, onChunk }) {
    const context = await this.contextBuilder.buildContext(assignmentId, message, chatId);
    const assignment = context.assignment;
    const toolResult = await this.tryTool(message, attachments);
    const legacyPlan = this.planner.createPlan({ assignment, request: message });
    const reasoningPlan = planAssignment({
      instructions: assignment?.instructions,
      rubric: assignment?.rubric,
      userQuery: message,
      toolSummary: toolResult?.summary || '',
    });
    this.metrics.reasoning.plans += 1;

    const reasoningContext = this.contextBuilder.buildReasoningContext({
      assignment,
      recentMessages: context.recentMessages,
      relevantChunks: context.relevantChunks,
      plan: {
        steps: [...legacyPlan, ...reasoningPlan.steps],
      },
      userMessage: message,
      toolResult,
    });

    const messageId = `assistant-${Date.now()}`;
    const draft = await generateDraft(this.modelRouter, reasoningContext);
    this.metrics.reasoning.drafts += 1;

    let currentDraft = draft;
    let latestCritique = '';
    let critique = await critiqueDraft(
      this.modelRouter,
      currentDraft,
      assignment?.rubric || '',
      assignment?.instructions || '',
    );
    latestCritique = critique;

    let revisionCount = 0;
    for (let cycle = 0; cycle < MAX_REVISION_CYCLES; cycle += 1) {
      const revised = await reviseDraft(this.modelRouter, currentDraft, critique, reasoningContext);
      this.metrics.reasoning.revisions += 1;
      revisionCount += 1;
      currentDraft = revised;

      const rubricReport = evaluateRubric(currentDraft, assignment?.rubric || '');
      const hasRubricGaps = rubricReport.some((entry) => !entry.satisfied);
      if (!hasRubricGaps || cycle === MAX_REVISION_CYCLES - 1) {
        break;
      }

      critique = await critiqueDraft(
        this.modelRouter,
        currentDraft,
        assignment?.rubric || '',
        assignment?.instructions || '',
      );
      latestCritique = critique;
    }

    const finalDraft = this.applyCitationVerification(currentDraft, context.relevantChunks);
    const finalContent = this.buildFinalContent(finalDraft, toolResult);

    for (const piece of chunkText(finalContent, STREAM_CHUNK_SIZE)) {
      onChunk({ id: messageId, content: piece, done: false });
    }
    onChunk({ id: messageId, content: '', done: true });

    const assistantMessage = this.chatStore.addMessage(chatId, {
      role: 'assistant',
      content: finalContent,
      attachments: [],
    });

    if (/draft|write|outline|generate/i.test(message)) {
      this.assignmentStore.updateAssignment(assignmentId, {
        generatedWork: finalContent,
        status: 'in-progress',
      });
    }

    this.assignmentStore.saveDraft(assignmentId, finalContent);
    this.assignmentStore.saveReasoningTrace(assignmentId, {
      plan: {
        legacyPlan,
        reasoningPlan: reasoningPlan.steps,
      },
      critique: latestCritique,
      revisions: revisionCount,
    });

    return assistantMessage;
  }

  applyCitationVerification(content, relevantChunks) {
    const check = verifyCitations(content, relevantChunks || []);
    if (check.valid) {
      return content;
    }

    return `${content}\n\nNote: Some citations could not be verified.`;
  }

  buildFinalContent(content, toolResult) {
    if (!toolResult) {
      return content;
    }

    return `${content}\n\nTool result:\n${toolResult.summary}`;
  }

  async tryTool(message, attachments) {
    if (/solve|equation|calculate|derivative/i.test(message)) {
      const result = await this.toolManager.runTool('math_solver', { problem: message });
      return { summary: `${result.output.answer} (${result.output.explanation})` };
    }

    const imageAttachment = (attachments || []).find((item) => item.kind === 'image');
    if (imageAttachment) {
      const result = await this.toolManager.runTool('image_problem_solver', { filePath: imageAttachment.path });
      return { summary: `${result.output.answer} (${result.output.detectedType})` };
    }

    return null;
  }
}

module.exports = {
  AIEngine,
};

function chunkText(text, size) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [''];
}
