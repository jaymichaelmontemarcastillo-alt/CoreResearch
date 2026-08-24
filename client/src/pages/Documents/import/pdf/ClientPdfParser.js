// src/pages/Documents/import/pdf/ClientPdfParser.js
import * as pdfjsLib from 'pdfjs-dist';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTextRun,
} from '../ir/DocumentIR';
import { PdfLayoutAnalyzer } from './PdfLayoutAnalyzer';

// Configure PDF.js worker in Vite
try {
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  }
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
}

/**
 * Normalizes raw PDF font names to standard typography
 */
function normalizeFontFamily(rawName) {
  if (!rawName) return 'Times New Roman';
  const name = rawName.replace(/^[A-Z]{6}\+/, ''); // Strip subset prefix like ABCDEF+

  if (/times|roman|nimbusrom|liberationserif/i.test(name)) return 'Times New Roman';
  if (/arial|helvetica|nimbussans|liberationsans/i.test(name)) return 'Arial';
  if (/calibri/i.test(name)) return 'Calibri';
  if (/georgia/i.test(name)) return 'Georgia';
  if (/courier|mono|nimbusmono/i.test(name)) return 'Courier New';
  if (/cambria/i.test(name)) return 'Cambria';
  if (/garamond/i.test(name)) return 'Garamond';
  if (/roboto/i.test(name)) return 'Roboto';
  if (/verdana/i.test(name)) return 'Verdana';
  if (/tahoma/i.test(name)) return 'Tahoma';

  return 'Times New Roman';
}

export class ClientPdfParser {
  /**
   * Parse PDF File or ArrayBuffer into High-Fidelity DocumentIR
   * @param {File | ArrayBuffer} fileOrBuffer
   * @param {string} fileName
   * @returns {Promise<DocumentIR>}
   */
  async parse(fileOrBuffer, fileName = 'Document.pdf') {
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

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageWidth = viewport.width || 612;
      const pageHeight = viewport.height || 792;
      const pageCenter = pageWidth / 2;

      if (pageWidth > pageHeight) {
        detectedOrientation = 'landscape';
      }
      if (Math.abs(pageWidth - 595) < 20 || Math.abs(pageHeight - 842) < 20) {
        detectedPageSize = 'a4';
      } else if (pageHeight > 900) {
        detectedPageSize = 'legal';
      }

      const textContent = await page.getTextContent();
      const rawItems = textContent.items || [];

      if (rawItems.length === 0) continue;

      const processedItems = [];
      rawItems.forEach((item) => {
        if (!item.str || !item.str.trim()) return;

        const y = Math.round(item.transform?.[5] || 0);
        const x = Math.round(item.transform?.[4] || 0);
        const scaleX = item.transform?.[0] || 12;
        const fontSize = Math.abs(Math.round(Math.hypot(scaleX, item.transform?.[1] || 0) || item.height || 12));
        const itemWidth = item.width || (item.str.length * fontSize * 0.55);

        const rawFontName = item.fontName || '';
        const isBold = /bold|black|heavy|medium|semi/i.test(rawFontName);
        const isItalic = /italic|oblique/i.test(rawFontName);
        const fontFamily = normalizeFontFamily(rawFontName);

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

      // Sort items by reading order (handling 2-column papers)
      const sortedItems = PdfLayoutAnalyzer.sortReadingOrder(processedItems, pageWidth);

      // Group items into horizontal lines
      const lineMap = new Map();
      sortedItems.forEach((item) => {
        let foundKey = null;
        for (const key of lineMap.keys()) {
          if (Math.abs(key - item.y) <= 4) {
            foundKey = key;
            break;
          }
        }

        const bucketKey = foundKey !== null ? foundKey : item.y;
        if (!lineMap.has(bucketKey)) {
          lineMap.set(bucketKey, []);
        }
        lineMap.get(bucketKey).push(item);
      });

      const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

      let prevY = null;
      let currentParagraphLines = [];

      sortedYKeys.forEach((yKey) => {
        const lineItems = lineMap.get(yKey).sort((a, b) => a.x - b.x);
        if (lineItems.length === 0) return;

        const lineText = lineItems.map((it) => it.text).join(' ').trim();
        if (!lineText) return;

        // Check for vertical spacing gap between lines
        if (prevY !== null) {
          const deltaY = prevY - yKey;
          const avgFontSize = lineItems[0]?.fontSize || 12;

          if (deltaY > avgFontSize * 2.4) {
            if (currentParagraphLines.length > 0) {
              nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
              currentParagraphLines = [];
            }
            nodes.push(createParagraphNode({ alignment: 'center', runs: [] }));
          }
        }
        prevY = yKey;

        // Check if this line is an independent heading or title block
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
      });

      if (currentParagraphLines.length > 0) {
        nodes.push(this.buildNodeFromLineGroup(currentParagraphLines, pageWidth, pageCenter));
        currentParagraphLines = [];
      }

      if (pageNum < numPages) {
        nodes.push(createPageBreakNode());
      }
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

export const clientPdfParser = new ClientPdfParser();
export default clientPdfParser;
