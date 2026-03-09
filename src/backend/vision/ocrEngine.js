const fs = require('fs');
const path = require('path');

class OCREngine {
  read(input) {
    const filePath = input.filePath || '';
    if (!filePath) {
      return 'No image supplied.';
    }

    if (path.extname(filePath).toLowerCase() === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    }

    return `Image uploaded: ${path.basename(filePath)}. OCR fallback extracted file metadata only.`;
  }
}

module.exports = {
  OCREngine,
};
