const { RubricParser } = require('../../tools/rubricParser');

function planAssignment({ instructions, rubric, userQuery, toolSummary = '' }) {
  const criteria = new RubricParser().parse({ text: rubric || '' });
  const steps = [];

  if (instructions) {
    steps.push('Understand assignment instructions');
  }

  if (criteria.length > 0) {
    steps.push('Identify rubric evaluation criteria');
    criteria.forEach((criterion) => {
      steps.push(`Cover rubric criterion: ${criterion.section}`);
    });
  }

  steps.push('Retrieve relevant sources');

  if (toolSummary) {
    steps.push(`Use tool output when relevant: ${toolSummary}`);
  }

  steps.push('Draft structured answer');
  steps.push('Cite sources where appropriate');
  steps.push('Check rubric compliance');

  return {
    goal: userQuery || '',
    steps,
    rubricCriteria: criteria.map((criterion) => criterion.section),
  };
}

module.exports = { planAssignment };
