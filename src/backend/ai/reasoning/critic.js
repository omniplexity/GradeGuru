async function critiqueDraft(router, draft, rubric, instructions = '') {
  const messages = [
    {
      role: 'system',
      content: [
        'Evaluate the following assignment draft.',
        'Be strict about rubric coverage, factual grounding, and citation usage.',
        'Return a concise critique with weaknesses and missing criteria.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Instructions:\n${instructions || 'None provided.'}`,
        `Rubric:\n${rubric || 'None provided.'}`,
        `Draft:\n${draft || 'No draft provided.'}`,
        'List weaknesses, unsupported claims, citation gaps, and missing rubric criteria.',
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

module.exports = { critiqueDraft };
