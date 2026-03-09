const { RubricParser } = require('../tools/rubricParser');

class Planner {
  createPlan({ assignment, request }) {
    const rubric = new RubricParser().parse({ text: assignment?.rubric || '' });
    const steps = [`Clarify deliverable for "${assignment?.title || 'assignment'}".`];

    if (rubric.length > 0) {
      rubric.forEach((criterion) => {
        steps.push(`Address rubric criterion: ${criterion.section}${criterion.points ? ` (${criterion.points} pts)` : ''}.`);
      });
    } else {
      steps.push('Extract key requirements from the instructions.');
    }

    steps.push(`Produce a response focused on: ${request}.`);
    return steps;
  }
}

module.exports = {
  Planner,
};
