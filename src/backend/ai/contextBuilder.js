class ContextBuilder {
  constructor({ assignmentStore, chatStore, vectorIndex }) {
    this.assignmentStore = assignmentStore;
    this.chatStore = chatStore;
    this.vectorIndex = vectorIndex;
  }

  async buildContext(assignmentId, message, chatId) {
    const assignment = this.assignmentStore.getAssignment(assignmentId);
    const recentMessages = this.chatStore.getRecentMessages(chatId, 8);
    const relevantChunks = await this.vectorIndex.search(assignmentId, message, 5);
    const sourceContext = this.formatSources(relevantChunks);

    return {
      assignment,
      recentMessages,
      relevantChunks,
      prompt: [
        `Assignment: ${assignment?.title || 'Unknown'}`,
        `Instructions:\n${assignment?.instructions || 'None provided.'}`,
        `Rubric:\n${assignment?.rubric || 'None provided.'}`,
        `Relevant sources:\n${sourceContext}`,
        'Use citations like [1]. Do not fabricate sources. If uncertain, say so.',
        `Recent chat:\n${recentMessages.map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n') || 'No history.'}`,
      ].join('\n\n'),
    };
  }

  buildReasoningContext({ assignment, recentMessages, relevantChunks, plan, userMessage, toolResult }) {
    const recentChat = (recentMessages || [])
      .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
      .join('\n') || 'No history.';
    const planSteps = (plan?.steps || plan || [])
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n') || '1. Review the assignment and produce a grounded answer.';

    return [
      `Assignment: ${assignment?.title || 'Unknown'}`,
      `Instructions:\n${assignment?.instructions || 'None provided.'}`,
      `Rubric:\n${assignment?.rubric || 'None provided.'}`,
      `User request:\n${userMessage || 'Help with the assignment.'}`,
      `Plan:\n${planSteps}`,
      toolResult ? `Tool output:\n${toolResult.summary}` : null,
      `Sources:\n${this.formatSources(relevantChunks)}`,
      'Use citations like [1].',
      'Do not fabricate sources.',
      'If uncertain, say so.',
      `Recent chat:\n${recentChat}`,
    ].filter(Boolean).join('\n\n');
  }

  formatSources(relevantChunks = []) {
    if (!relevantChunks.length) {
      return 'No relevant chunks found.';
    }

    const groups = [];

    relevantChunks.forEach((chunk, index) => {
      const groupIndex = Math.max(1, chunk.synthesisGroup || 1) - 1;
      if (!groups[groupIndex]) {
        groups[groupIndex] = [];
      }
      groups[groupIndex].push(`[${index + 1}] ${chunk.chunkText}`);
    });

    return groups
      .filter(Boolean)
      .map((items, index) => `Theme ${index + 1}:\n${items.join('\n')}`)
      .join('\n\n');
  }
}

module.exports = {
  ContextBuilder,
};
