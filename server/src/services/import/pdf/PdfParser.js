// server/src/services/import/pdf/PdfParser.js
import { createRequire } from 'module';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTextRun,
} from '../ir/DocumentIR.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export class PdfParser {
  /**
   * Parse PDF buffer into canonical DocumentIR
   * @param {Buffer} pdfBuffer
   * @param {string} fileName
   * @returns {Promise<DocumentIR>}
   */
  async parse(pdfBuffer, fileName = 'Document.pdf') {
    const nodes = [];
    const assets = [];
    let pageCount = 1;

    try {
      let fullText = '';
      let pages = [];

      if (pdf.PDFParse) {
        const parser = new pdf.PDFParse({ data: pdfBuffer });
        const res = await parser.getText();
        fullText = res.text || '';
        pageCount = res.total || 1;
        pages = res.pages || [];
      } else if (typeof pdf === 'function') {
        const data = await pdf(pdfBuffer);
        fullText = data.text || '';
        pageCount = data.numpages || 1;
      }

      if (pages.length > 0) {
        pages.forEach((page, pageIdx) => {
          const rawLines = (page.text || '').split(/\r?\n/);
          let currentParagraphLines = [];

          rawLines.forEach((line) => {
            const cleanLine = line.trim();
            if (!cleanLine) {
              if (currentParagraphLines.length > 0) {
                nodes.push(this.createNodeFromLines(currentParagraphLines));
                currentParagraphLines = [];
              }
            } else {
              currentParagraphLines.push(cleanLine);
            }
          });

          if (currentParagraphLines.length > 0) {
            nodes.push(this.createNodeFromLines(currentParagraphLines));
          }

          if (pageIdx < pages.length - 1) {
            nodes.push(createPageBreakNode());
          }
        });
      } else {
        const rawLines = fullText.split(/\r?\n/);
        let currentParagraphLines = [];

        for (let i = 0; i < rawLines.length; i++) {
          const line = rawLines[i].trim();

          if (line.includes('\f')) {
            if (currentParagraphLines.length > 0) {
              nodes.push(this.createNodeFromLines(currentParagraphLines));
              currentParagraphLines = [];
            }
            nodes.push(createPageBreakNode());
            continue;
          }

          if (!line) {
            if (currentParagraphLines.length > 0) {
              nodes.push(this.createNodeFromLines(currentParagraphLines));
              currentParagraphLines = [];
            }
          } else {
            currentParagraphLines.push(line);
          }
        }

        if (currentParagraphLines.length > 0) {
          nodes.push(this.createNodeFromLines(currentParagraphLines));
        }
      }
    } catch (err) {
      console.warn('[PdfParser] Parse warning:', err.message);
      nodes.push(
        createParagraphNode({
          runs: [createTextRun({ text: 'Unable to extract full PDF text. Original file is preserved.' })],
        })
      );
    }

    if (nodes.length === 0) {
      nodes.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
    }

    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    return createDocumentIR({
      metadata: {
        title,
        sourceFormat: 'pdf',
        pageCount,
      },
      pageSettings: {
        size: 'letter',
        orientation: 'portrait',
        marginTop: '1in',
        marginBottom: '1in',
        marginLeft: '1in',
        marginRight: '1in',
      },
      nodes,
      assets,
    });
  }

  createNodeFromLines(lines) {
    const text = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) {
      return createParagraphNode({ runs: [createTextRun({ text: '' })] });
    }

    // Detect Headings (e.g. short lines, all-caps, or starting with Chapter/Section/Abstract)
    const isHeading =
      (lines.length === 1 && text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) ||
      /^(abstract|introduction|background|methodology|results|discussion|conclusion|references|chapter\s+\d+|[0-9]+\.\s+[A-Z])/i.test(text);

    if (isHeading) {
      const level = text.length < 40 ? 1 : 2;
      return createHeadingNode({
        level,
        runs: [createTextRun({ text, bold: true, fontSize: level === 1 ? '16pt' : '14pt' })],
      });
    }

    return createParagraphNode({
      alignment: 'justify',
      runs: [createTextRun({ text })],
    });
  }
}

export default PdfParser;
