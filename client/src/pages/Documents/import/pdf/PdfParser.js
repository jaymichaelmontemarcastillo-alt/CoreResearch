// src/pages/Documents/import/pdf/PdfParser.js
import * as pdfjsLib from 'pdfjs-dist';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTextRun,
} from '../ir/DocumentIR';
import { PdfLayoutExtractor, normalizePdfFontFamily } from './PdfLayoutExtractor';
import { PdfImages } from './PdfImages';
import { PdfTables } from './PdfTables';

// Configure PDF.js worker in Vite
try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
}

export class PdfParser {
  /**
   * Parse PDF File or ArrayBuffer into High-Fidelity DocumentIR
   * @param {File | ArrayBuffer} fileOrBuffer
   * @param {string} fileName
   * @param {string} documentId
   * @param {string} userId
   * @returns {Promise<DocumentIR>}
   */
  async parse(fileOrBuffer, fileName = 'Document.pdf', documentId = `doc-${Date.now()}`, userId = 'general') {
    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages || 1;
    const nodes = [];
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    let detectedPageSize = 'letter';
    let detectedOrientation = 'portrait';
    let totalTextChars = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width || 612;
      const pageHeight = viewport.height || 792;
      const pageCenter = pageWidth / 2;

      if (pageWidth > pageHeight) {
        detectedOrientation = 'landscape';
      }
      if (Math.abs(pageWidth - 595) < 25 || Math.abs(pageHeight - 842) < 25) {
        detectedPageSize = 'a4';
      } else if (pageHeight > 900) {
        detectedPageSize = 'legal';
      }

      // 1. Extract embedded raster images from this page
      const pageImages = await PdfImages.extractPageImages(page, pageNum, documentId, userId);
      if (pageImages.length > 0) {
        assets.push(...pageImages);
      }

      // 2. Extract text items
      const textContent = await page.getTextContent();
      const rawItems = textContent.items || [];

      if (rawItems.length === 0) {
        if (pageImages.length > 0) {
          nodes.push(...pageImages);
        }
        if (pageNum < numPages) {
          nodes.push(createPageBreakNode());
        }
        continue;
      }

      const processedItems = [];
      rawItems.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        totalTextChars += item.str.trim().length;

        const y = Math.round(item.transform?.[5] || 0);
        const x = Math.round(item.transform?.[4] || 0);
        const scaleX = item.transform?.[0] || 12;
        const fontSize = Math.abs(Math.round(Math.hypot(scaleX, item.transform?.[1] || 0) || item.height || 12));
        const itemWidth = item.width || (item.str.length * fontSize * 0.55);

        const rawFontName = item.fontName || '';
        const isBold = /bold|black|heavy|medium|semi/i.test(rawFontName);
        const isItalic = /italic|oblique/i.test(rawFontName);
        const fontFamily = normalizePdfFontFamily(rawFontName);

        processedItems.push({
          text: item.str,
          x,
          y,
          width: itemWidth,
          maxX: x + itemWidth,
          fontSize,
          fontFamily,
          bold: isBold,
          italic: isItalic,
          hasEOL: Boolean(item.hasEOL),
        });
      });

      // 3. Sort items by reading order
      const sortedItems = PdfLayoutExtractor.sortReadingOrder(processedItems, pageWidth);

      // 4. Group items into horizontal lines
      const lines = PdfLayoutExtractor.groupIntoLines(sortedItems);

      let prevY = null;
      let currentParagraphLines = [];
      let lineIndex = 0;

      while (lineIndex < lines.length) {
        // Check for table structure
        const tableCheck = PdfTables.detectAndReconstructTable(lines, lineIndex);
        if (tableCheck.isTable && tableCheck.tableNode) {
          if (currentParagraphLines.length > 0) {
            nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
            currentParagraphLines = [];
          }
          nodes.push(tableCheck.tableNode);
          lineIndex += tableCheck.consumedLines;
          continue;
        }

        const lineItems = lines[lineIndex];
        const lineText = lineItems.map((it) => it.text).join(' ').trim();
        const currentY = lineItems[0]?.y ?? 0;

        if (prevY !== null) {
          const deltaY = prevY - currentY;
          const avgFontSize = lineItems[0]?.fontSize || 12;

          if (deltaY > avgFontSize * 2.4) {
            if (currentParagraphLines.length > 0) {
              nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
              currentParagraphLines = [];
            }
          }
        }
        prevY = currentY;

        // Check if line is an isolated heading
        const minX = Math.min(...lineItems.map((i) => i.x));
        const maxX = Math.max(...lineItems.map((i) => i.maxX));
        const lineWidth = maxX - minX;
        const lineMid = (minX + maxX) / 2;
        const isCentered = lineWidth < pageWidth * 0.78 && Math.abs(lineMid - pageCenter) <= 35;
        const avgFontSize = lineItems.reduce((acc, it) => acc + it.fontSize, 0) / lineItems.length;

        const isHeading =
          avgFontSize >= 14 ||
          (isCentered && lineText.length < 80 && lineText === lineText.toUpperCase() && /[A-Z]/.test(lineText)) ||
          /^(abstract|introduction|background|methodology|system architecture|results|discussion|conclusion|references|chapter\s+\d+|[0-9]+\.\s+[A-Z])/i.test(lineText);

        if (isHeading || isCentered) {
          if (currentParagraphLines.length > 0) {
            nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
            currentParagraphLines = [];
          }
          nodes.push(this.buildNodeFromLineGroup([lineItems], pageWidth, pageCenter, isHeading));
        } else {
          currentParagraphLines.push(lineItems);

          const isParagraphEnd = /[.?!:;]$/.test(lineText) || lineItems.some((it) => it.hasEOL);
          if (isParagraphEnd) {
            nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
            currentParagraphLines = [];
          }
        }

        lineIndex++;
      }

      if (currentParagraphLines.length > 0) {
        nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
        currentParagraphLines = [];
      }

      // Add page images if any
      if (pageImages.length > 0) {
        nodes.push(...pageImages);
      }

      if (pageNum < numPages) {
        nodes.push(createPageBreakNode());
      }
    }

    if (totalTextChars === 0 && assets.length === 0) {
      throw new Error('This PDF contains no selectable text characters. Scanned image PDFs require OCR.');
    }

    if (nodes.length === 0) {
      nodes.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
    }

    return createDocumentIR({
      metadata: {
        title,
        sourceFormat: 'pdf',
        pageCount: numPages,
      },
      pageSettings: {
        size: detectedPageSize,
        orientation: detectedOrientation,
        marginTop: '1in',
        marginBottom: '1in',
        marginLeft: '1in',
        marginRight: '1in',
      },
      nodes,
      assets,
    });
  }

  buildNodeFromLineGroup(lineGroup, pageWidth, pageCenter, forceHeading = false) {
    const allItems = lineGroup.flat();
    if (allItems.length === 0) {
      return createParagraphNode({ runs: [] });
    }

    const minX = Math.min(...allItems.map((i) => i.x));
    const maxX = Math.max(...allItems.map((i) => i.maxX));
    const lineWidth = maxX - minX;
    const lineMid = (minX + maxX) / 2;

    let alignment = 'left';
    if (lineWidth < pageWidth * 0.82 && Math.abs(lineMid - pageCenter) <= 32) {
      alignment = 'center';
    } else if (minX > pageWidth * 0.55) {
      alignment = 'right';
    } else if (lineWidth >= pageWidth * 0.68) {
      alignment = 'justify';
    }

    const runs = [];
    let currentRun = null;

    allItems.forEach((item) => {
      const text = item.text;
      if (!text) return;

      const fontSizeStr = `${Math.max(item.fontSize || 12, 10)}pt`;
      const fontFamily = item.fontFamily || 'Times New Roman';
      const isBold = Boolean(item.bold);
      const isItalic = Boolean(item.italic);

      if (
        currentRun &&
        currentRun.fontFamily === fontFamily &&
        currentRun.fontSize === fontSizeStr &&
        currentRun.bold === isBold &&
        currentRun.italic === isItalic
      ) {
        currentRun.text += (currentRun.text.endsWith(' ') || text.startsWith(' ') ? '' : ' ') + text;
      } else {
        if (currentRun) {
          runs.push(createTextRun(currentRun));
        }
        currentRun = {
          text,
          fontFamily,
          fontSize: fontSizeStr,
          bold: isBold,
          italic: isItalic,
        };
      }
    });

    if (currentRun) {
      runs.push(createTextRun(currentRun));
    }

    const combinedText = runs.map((r) => r.text).join(' ').trim();
    const avgFontSize = allItems.reduce((acc, it) => acc + it.fontSize, 0) / allItems.length;

    const isHeading =
      forceHeading ||
      avgFontSize >= 15 ||
      (alignment === 'center' && combinedText.length < 70 && combinedText === combinedText.toUpperCase() && /[A-Z]/.test(combinedText));

    if (isHeading) {
      const level = avgFontSize >= 18 || combinedText.length < 40 ? 1 : 2;
      return createHeadingNode({
        level,
        alignment,
        runs,
      });
    }

    return createParagraphNode({
      alignment,
      runs,
    });
  }
}

export const pdfParser = new PdfParser();
export default pdfParser;
