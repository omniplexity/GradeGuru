export function renderImageSolverUI() {
  return `
    <section class="panel tool-panel">
      <div class="eyebrow">Image Solver</div>
      <h3>Vision Homework Pipeline</h3>
      <p class="muted">Upload an image or text capture and run OCR, problem detection, and solver fallback.</p>
      <button class="primary-button" data-action="pick-tool-image">Choose Image</button>
    </section>
  `;
}
