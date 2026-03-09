const { RubricParser } = require('../../tools/rubricParser');

function evaluateRubric(draft, rubric) {
  const content = String(draft || '').toLowerCase();
  const criteria = new RubricParser().parse({ text: rubric || '' });

  return criteria.map((criterion) => {
    const keywords = criterion.section
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 3);
    const satisfied = keywords.length === 0
      ? content.includes(criterion.section.toLowerCase())
      : keywords.some((token) => content.includes(token));

    return {
      criterion: criterion.section,
      satisfied,
    };
  });
}

module.exports = { evaluateRubric };
