async function reviseDraft(router, draft, critique, context) {
  const messages = [
    {
      role: 'system',
      content: [
        'Improve the assignment draft.',
        'Preserve supported claims, strengthen rubric coverage, and keep citations grounded.',
        'If evidence is missing, say so instead of inventing content.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Context:\n${context}`,
        `Draft:\n${draft}`,
        `Critique:\n${critique}`,
        'Revise the draft to address the critique and keep citation formatting like [1].',
      ].join('\n\n'),
    },
  ];

  return router.generate({
    messages,
    require: {
      reasoning: true,
    },
  });
}

module.exports = { reviseDraft };
