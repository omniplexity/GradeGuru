const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const mammoth = require('mammoth');
const { htmlToText } = require('html-to-text');

let pdfModulePromise = null;
const execFileAsync = promisify(execFile);

async function loadPdfModule() {
  if (!pdfModulePromise) {
    pdfModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfModulePromise;
}

async function parsePDF(filePath) {
  try {
    const pdf = await loadPdfModule();
    const data = new Uint8Array(fs.readFileSync(filePath));
    const document = await pdf.getDocument({ data }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' ').trim());
    }

    return pages.join('\n').trim();
  } catch (error) {
    if (!/experimental-vm-modules/i.test(String(error && error.message))) {
      throw error;
    }
  }

  const script = `
    import fs from 'fs';
    import * as pdf from 'pdfjs-dist/legacy/build/pdf.mjs';

    const filePath = process.argv[1];
    const data = new Uint8Array(fs.readFileSync(filePath));
    const document = await pdf.getDocument({ data }).promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' ').trim());
    }

    process.stdout.write(JSON.stringify(pages.join('\\n').trim()));
  `;

  const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '-e', script, filePath], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return JSON.parse(stdout);
}

async function parseDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function parseHTML(html) {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { ignoreHref: true } },
    ],
  });
}

class DocumentParser {
  async parseFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    if (filePath.startsWith('Seed:')) {
      return filePath;
    }

    if (['.txt', '.md', '.csv'].includes(extension)) {
      return fs.readFileSync(filePath, 'utf8');
    }

    if (extension === '.json') {
      return JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf8')), null, 2);
    }

    if (extension === '.pdf') {
      return parsePDF(filePath);
    }

    if (extension === '.docx') {
      return parseDOCX(filePath);
    }

    if (['.html', '.htm'].includes(extension)) {
      return parseHTML(fs.readFileSync(filePath, 'utf8'));
    }

    return fs.readFileSync(filePath, 'utf8');
  }
}

module.exports = {
  DocumentParser,
  parsePDF,
  parseDOCX,
  parseHTML,
};
