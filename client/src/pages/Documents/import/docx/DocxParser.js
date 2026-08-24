// src/pages/Documents/import/docx/DocxParser.js
import JSZip from 'jszip';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTextRun,
} from '../ir/DocumentIR';
import { DocxStyles } from './DocxStyles';
import { DocxNumbering } from './DocxNumbering';
import { DocxSections } from './DocxSections';
import { DocxImages } from './DocxImages';
import { DocxTables } from './DocxTables';

export class DocxParser {
  constructor() {
    this.styles = new DocxStyles();
    this.numbering = new DocxNumbering();
  }

  /**
   * Parse DOCX file/buffer into High-Fidelity DocumentIR
   * @param {File | ArrayBuffer} fileOrBuffer
   * @param {string} fileName
   * @param {string} documentId
   * @param {string} userId
   * @returns {Promise<DocumentIR>}
   */
  async parse(fileOrBuffer, fileName = 'Document.docx', documentId = `doc-${Date.now()}`, userId = 'general') {
    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    // 1. Extract and upload all media images to Firebase Storage
    const imageMap = await DocxImages.extractAndUploadImages(zip, documentId, userId);

    // 2. Parse word/styles.xml for complete style inheritance
    const stylesFile = zip.file('word/styles.xml');
    if (stylesFile) {
      const stylesXml = await stylesFile.async('text');
      this.styles.parse(stylesXml);
    }

    // 3. Parse word/numbering.xml for ordered and bullet lists
    const numberingFile = zip.file('word/numbering.xml');
    if (numberingFile) {
      const numberingXml = await numberingFile.async('text');
      this.numbering.parse(numberingXml);
    }

    // 4. Parse word/document.xml for content body
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('Invalid DOCX document: missing word/document.xml');
    }

    const docXmlText = await docFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
    const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0];

    const nodes = [];
    let pageSettings = {
      size: 'letter',
      orientation: 'portrait',
      marginTop: '1in',
      marginBottom: '1in',
      marginLeft: '1in',
      marginRight: '1in',
    };

    if (body) {
      const children = body.childNodes;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const nodeName = child.nodeName;

        if (nodeName === 'w:p') {
          const parsed = this.parseParagraph(child, imageMap);
          if (parsed) {
            if (Array.isArray(parsed)) nodes.push(...parsed);
            else nodes.push(parsed);
          }
        } else if (nodeName === 'w:tbl') {
          const tableNode = DocxTables.extractTable(child, imageMap, (pElem, map) =>
            this.parseParagraph(pElem, map)
          );
          if (tableNode) nodes.push(tableNode);
        } else if (nodeName === 'w:sectPr') {
          pageSettings = DocxSections.extract(child);
        }
      }
    }

    if (nodes.length === 0) {
      nodes.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
    }

    return createDocumentIR({
      metadata: {
        title,
        sourceFormat: 'docx',
        pageCount: 1,
      },
      pageSettings,
      nodes,
      assets: Array.from(imageMap.values()),
    });
  }

  /**
   * Parse a <w:p> element into DocumentIR node(s)
   */
  parseParagraph(pElem, imageMap) {
    const resultNodes = [];

    // 1. Check for explicit page break in paragraph
    const brs = pElem.getElementsByTagName('w:br');
    for (let b = 0; b < brs.length; b++) {
      if (brs[b].getAttribute('w:type') === 'page') {
        resultNodes.push(createPageBreakNode());
      }
    }

    // 2. Check for embedded drawings / images
    const images = DocxImages.extractImagesFromParagraph(pElem, imageMap);
    if (images.length > 0) {
      resultNodes.push(...images);
    }

    // 3. Resolve Paragraph Properties & Inheritance
    const pPr = pElem.getElementsByTagName('w:pPr')[0];
    let styleId = null;
    if (pPr) {
      const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
      if (pStyle) {
        styleId = pStyle.getAttribute('w:val');
      }
    }

    const resolvedStyle = this.styles.resolveStyle(styleId);

    let alignment = resolvedStyle.pPr?.alignment || 'left';
    let lineSpacing = resolvedStyle.pPr?.lineSpacing || null;
    let spaceBefore = resolvedStyle.pPr?.spaceBefore || null;
    let spaceAfter = resolvedStyle.pPr?.spaceAfter || null;
    let indentation = null;
    let isHeading = resolvedStyle.headingLevel > 0;
    let headingLevel = resolvedStyle.headingLevel || 1;
    let listType = null;
    let listLevel = 0;

    if (pPr) {
      // Direct alignment override
      const jc = pPr.getElementsByTagName('w:jc')[0];
      if (jc) {
        const val = jc.getAttribute('w:val');
        if (val === 'both') alignment = 'justify';
        else if (['center', 'right', 'left'].includes(val)) alignment = val;
      }

      // Direct spacing override
      const spacing = pPr.getElementsByTagName('w:spacing')[0];
      if (spacing) {
        const lineVal = parseInt(spacing.getAttribute('w:line') || '', 10);
        if (!isNaN(lineVal)) {
          lineSpacing = (lineVal / 240).toFixed(2);
        }
        const befVal = parseInt(spacing.getAttribute('w:before') || '', 10);
        if (!isNaN(befVal)) spaceBefore = `${Math.round(befVal / 20)}pt`;
        const aftVal = parseInt(spacing.getAttribute('w:after') || '', 10);
        if (!isNaN(aftVal)) spaceAfter = `${Math.round(aftVal / 20)}pt`;
      }

      // Direct indentation override
      const ind = pPr.getElementsByTagName('w:ind')[0];
      if (ind) {
        const leftTwips = parseInt(ind.getAttribute('w:left') || '', 10);
        const firstTwips = parseInt(ind.getAttribute('w:firstLine') || '', 10);
        if (!isNaN(leftTwips) || !isNaN(firstTwips)) {
          indentation = {
            left: !isNaN(leftTwips) ? `${Math.round(leftTwips / 20)}pt` : null,
            firstLine: !isNaN(firstTwips) ? `${Math.round(firstTwips / 20)}pt` : null,
          };
        }
      }

      // Lists (<w:numPr>)
      const numPr = pPr.getElementsByTagName('w:numPr')[0];
      if (numPr) {
        const ilvlElem = numPr.getElementsByTagName('w:ilvl')[0];
        const numIdElem = numPr.getElementsByTagName('w:numId')[0];
        const ilvl = ilvlElem ? parseInt(ilvlElem.getAttribute('w:val') || '0', 10) : 0;
        const numId = numIdElem ? numIdElem.getAttribute('w:val') : null;

        if (numId) {
          const listInfo = this.numbering.resolveListInfo(numId, ilvl);
          listType = listInfo.listType;
          listLevel = listInfo.listLevel;
        }
      }
    }

    // 4. Parse Text Runs (<w:r>) with style cascade
    const runs = [];
    const runElems = pElem.getElementsByTagName('w:r');

    for (let r = 0; r < runElems.length; r++) {
      const runElem = runElems[r];
      const tElems = runElem.getElementsByTagName('w:t');
      let text = '';
      for (let t = 0; t < tElems.length; t++) {
        text += tElems[t].textContent || '';
      }

      if (!text) continue;

      const rPr = runElem.getElementsByTagName('w:rPr')[0];
      let fontFamily = resolvedStyle.rPr?.fontFamily || 'Times New Roman';
      let fontSize = resolvedStyle.rPr?.fontSize || '12pt';
      let bold = resolvedStyle.rPr?.bold || false;
      let italic = resolvedStyle.rPr?.italic || false;
      let underline = resolvedStyle.rPr?.underline || false;
      let strike = false;
      let subscript = false;
      let superscript = false;
      let color = resolvedStyle.rPr?.color || null;
      let highlight = null;

      if (rPr) {
        // Font
        const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
        if (rFonts) {
          const fontVal = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi') || rFonts.getAttribute('w:asciiTheme');
          if (fontVal) fontFamily = this.styles.normalizeFont(fontVal);
        }

        // Size
        const sz = rPr.getElementsByTagName('w:sz')[0];
        if (sz) {
          const halfPts = parseInt(sz.getAttribute('w:val') || '24', 10);
          fontSize = `${Math.round(halfPts / 2)}pt`;
        }

        // Marks
        const b = rPr.getElementsByTagName('w:b')[0];
        if (b) {
          const val = b.getAttribute('w:val');
          bold = val !== '0' && val !== 'false';
        }

        const it = rPr.getElementsByTagName('w:i')[0];
        if (it) {
          const val = it.getAttribute('w:val');
          italic = val !== '0' && val !== 'false';
        }

        const u = rPr.getElementsByTagName('w:u')[0];
        if (u) {
          const val = u.getAttribute('w:val');
          underline = val !== 'none';
        }

        const st = rPr.getElementsByTagName('w:strike')[0];
        if (st) {
          const val = st.getAttribute('w:val');
          strike = val !== '0' && val !== 'false';
        }

        const vertAlign = rPr.getElementsByTagName('w:vertAlign')[0];
        if (vertAlign) {
          const val = vertAlign.getAttribute('w:val');
          if (val === 'subscript') subscript = true;
          else if (val === 'superscript') superscript = true;
        }

        const colElem = rPr.getElementsByTagName('w:color')[0];
        if (colElem) {
          const val = colElem.getAttribute('w:val');
          if (val && val !== 'auto') color = `#${val}`;
        }

        const hlElem = rPr.getElementsByTagName('w:highlight')[0];
        if (hlElem) {
          const val = hlElem.getAttribute('w:val');
          if (val && val !== 'none') highlight = val;
        }
      }

      runs.push(
        createTextRun({
          text,
          bold,
          italic,
          underline,
          strike,
          subscript,
          superscript,
          fontFamily,
          fontSize,
          color,
          highlight,
          lineHeight: lineSpacing,
        })
      );
    }

    if (runs.length > 0) {
      if (isHeading) {
        resultNodes.push(
          createHeadingNode({
            level: headingLevel,
            alignment,
            lineSpacing,
            spaceBefore,
            spaceAfter,
            runs,
          })
        );
      } else {
        resultNodes.push(
          createParagraphNode({
            alignment,
            lineSpacing,
            spaceBefore,
            spaceAfter,
            indentation,
            listType,
            listLevel,
            runs,
          })
        );
      }
    } else if (resultNodes.length === 0) {
      resultNodes.push(
        createParagraphNode({
          alignment,
          lineSpacing,
          spaceBefore,
          spaceAfter,
          indentation,
          listType,
          listLevel,
          runs: [],
        })
      );
    }

    return resultNodes;
  }
}

export const docxParser = new DocxParser();
export default docxParser;
