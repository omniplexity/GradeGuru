class MathSolver {
  solve(input) {
    const prompt = String(input.problem || input.query || '').trim();
    if (!prompt) {
      return { answer: 'No math problem provided.', explanation: 'Provide an arithmetic expression or simple linear equation.' };
    }

    const linearMatch = prompt.match(/^\s*([+-]?\d*\.?\d*)x\s*([+-]\s*\d*\.?\d+)?\s*=\s*([+-]?\d*\.?\d+)\s*$/i);
    if (linearMatch) {
      const coefficient = Number(linearMatch[1] || 1);
      const constant = Number((linearMatch[2] || '0').replace(/\s+/g, ''));
      const target = Number(linearMatch[3]);
      const x = (target - constant) / coefficient;
      return {
        answer: `x = ${x}`,
        explanation: `Move the constant term to the other side and divide by ${coefficient}.`,
      };
    }

    if (!/^[0-9+\-*/().^\s]+$/.test(prompt)) {
      return {
        answer: 'Unsupported problem format.',
        explanation: 'The built-in solver handles arithmetic and simple linear equations.',
      };
    }

    const expression = prompt.replace(/\^/g, '**');
    let value;
    try {
      value = Function(`"use strict"; return (${expression});`)();
    } catch (error) {
      return {
        answer: 'Invalid expression.',
        explanation: error.message,
      };
    }
    return {
      answer: String(value),
      explanation: `Evaluated the expression ${prompt}.`,
    };
  }
}

module.exports = {
  MathSolver,
};
