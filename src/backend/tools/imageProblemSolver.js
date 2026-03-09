const { OCREngine } = require('../vision/ocrEngine');
const { ProblemDetector } = require('../vision/problemDetector');
const { MathSolver } = require('./mathSolver');

class ImageProblemSolver {
  constructor() {
    this.ocr = new OCREngine();
    this.detector = new ProblemDetector();
    this.mathSolver = new MathSolver();
  }

  solve(input) {
    const extractedText = this.ocr.read(input);
    const detected = this.detector.detect(extractedText);

    if (detected.type === 'math') {
      const math = this.mathSolver.solve({ problem: detected.prompt });
      return {
        extractedText,
        detectedType: detected.type,
        answer: math.answer,
        explanation: math.explanation,
      };
    }

    return {
      extractedText,
      detectedType: detected.type,
      answer: 'No direct math expression detected.',
      explanation: 'The image was analyzed, but the fallback solver did not find a solvable expression.',
    };
  }
}

module.exports = {
  ImageProblemSolver,
};
