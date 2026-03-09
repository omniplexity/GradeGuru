export function renderMathSolverUI() {
  return `
    <section class="panel tool-panel">
      <div class="eyebrow">Math Solver</div>
      <h3>Quick Equation Help</h3>
      <input id="mathSolverInput" class="text-field" placeholder="e.g. 2x + 4 = 10 or (3+5)/2">
      <button class="primary-button" data-action="run-tool" data-tool="math_solver">Run</button>
    </section>
  `;
}
