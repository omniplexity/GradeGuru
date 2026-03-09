async function generateDraft(router, context) {
  const messages = [
    {
      role: 'system',
      content: [
        'You are assisting with an academic assignment.',
        'Use the provided sources only when supported by the context.',
        'Cite sources using [1], [2], etc.',
        'Do not fabricate sources or claims.',
        'Follow the rubric carefully.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: context,
    },
  ];

  return router.generate({
    messages,
    require: {
      reasoning: true,
    },
  });
}

module.exports = { generateDraft };
