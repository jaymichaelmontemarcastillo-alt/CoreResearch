// src/pages/Documents/import/docx/ClientDocxParser.js
import JSZip from 'jszip';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTableNode,
  createTableCell,
  createImageNode,
  createTextRun,
} from '../ir/DocumentIR';

export class ClientDocxParser {
  /**
   * Parse DOCX file into High-Fidelity DocumentIR extracting text, styles, fonts, tables, and images
   * @param {File | ArrayBuffer} fileOrBuffer
   * @param {string} fileName
   * @returns {Promise<DocumentIR>}
   */
  async parse(fileOrBuffer, fileName = 'Document.docx') {
    const arrayBuffer = fileOrBuffer instanceof ArrayBuffer
      ? fileOrBuffer
      : await fileOrBuffer.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    // 1. Extract and map media images from word/media/ and word/_rels/document.xml.rels
    const imageMap = new Map(); // rId -> dataUrl
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      const relsXmlText = await relsFile.async('text');
      const parser = new DOMParser();
      const relsDoc = parser.parseFromString(relsXmlText, 'text/xml');
      const relElements = relsDoc.getElementsByTagName('Relationship');

      for (let i = 0; i < relElements.length; i++) {
        const rel = relElements[i];
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target') || '';
        const type = rel.getAttribute('Type') || '';

        if (type.includes('image') || target.includes('media/')) {
          const mediaPath = target.startsWith('media/') ? `word/${target}` : `word/${target.replace(/^..\//, '')}`;
          const imgFile = zip.file(mediaPath);
          if (imgFile) {
            const ext = target.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
            const base64 = await imgFile.async('base64');
            if (base64.length < 524288) {
              const dataUrl = `data:${mimeType};base64,${base64}`;
              imageMap.set(id, dataUrl);
            } else {
              imageMap.set(id, '');
            }
          }
        }
      }
    }

    // 2. Parse word/document.xml
    const docFile = zip.file('word/document.xml');
    if (!docFile) {
      throw new Error('Invalid DOCX: missing word/document.xml');
    }

    const docXmlText = await docFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
    const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0];

    const nodes = [];
    let detectedPageSize = 'letter';
    let detectedOrientation = 'portrait';
    let marginTop = '1in';
    let marginBottom = '1in';
    let marginLeft = '1in';
    let marginRight = '1in';

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
          const tableNode = this.parseTable(child, imageMap);
          if (tableNode) nodes.push(tableNode);
        } else if (nodeName === 'w:sectPr') {
          // Page settings
          const pgSz = child.getElementsByTagName('w:pgSz')[0];
          if (pgSz) {
            const w = parseInt(pgSz.getAttribute('w:w') || '12240', 10);
            const h = parseInt(pgSz.getAttribute('w:h') || '15840', 10);
            if (w > h) detectedOrientation = 'landscape';
            if (Math.abs(w - 11906) < 300) detectedPageSize = 'a4';
            else if (h > 18000) detectedPageSize = 'legal';
          }
          const pgMar = child.getElementsByTagName('w:pgMar')[0];
          if (pgMar) {
            const top = (parseInt(pgMar.getAttribute('w:top') || '1440', 10) / 1440).toFixed(2);
            const bottom = (parseInt(pgMar.getAttribute('w:bottom') || '1440', 10) / 1440).toFixed(2);
            const left = (parseInt(pgMar.getAttribute('w:left') || '1440', 10) / 1440).toFixed(2);
            const right = (parseInt(pgMar.getAttribute('w:right') || '1440', 10) / 1440).toFixed(2);
            marginTop = `${top}in`;
            marginBottom = `${bottom}in`;
            marginLeft = `${left}in`;
            marginRight = `${right}in`;
          }
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
      pageSettings: {
        size: detectedPageSize,
        orientation: detectedOrientation,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
      },
      nodes,
      assets: [],
    });
  }

  parseParagraph(pElem, imageMap) {
    const resultNodes = [];
    const pPr = pElem.getElementsByTagName('w:pPr')[0];

    // Alignment
    let alignment = 'left';
    let lineSpacing = null;
    let spaceBefore = null;
    let spaceAfter = null;

    if (pPr) {
      const jc = pPr.getElementsByTagName('w:jc')[0];
      if (jc) {
        const val = jc.getAttribute('w:val');
        if (val === 'center') alignment = 'center';
        else if (val === 'right') alignment = 'right';
        else if (val === 'both' || val === 'justify') alignment = 'justify';
      }

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
    }

    // Heading level
    let isHeading = false;
    let headingLevel = 1;
    if (pPr) {
      const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
      if (pStyle) {
        const styleVal = pStyle.getAttribute('w:val') || '';
        if (/heading\s*1|title/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 1;
        } else if (/heading\s*2|subtitle/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 2;
        } else if (/heading\s*3/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 3;
        } else if (/heading\s*4/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 4;
        } else if (/heading\s*5/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 5;
        } else if (/heading\s*6/i.test(styleVal)) {
          isHeading = true;
          headingLevel = 6;
        }
      }
    }

    // Check for drawings / embedded images
    const drawings = pElem.getElementsByTagName('w:drawing');
    for (let d = 0; d < drawings.length; d++) {
      const blip = drawings[d].getElementsByTagName('a:blip')[0];
      if (blip) {
        const embedId = blip.getAttribute('r:embed');
        if (embedId && imageMap.has(embedId)) {
          // Dimensions
          let width = null;
          let height = null;
          const extent = drawings[d].getElementsByTagName('wp:extent')[0];
          if (extent) {
            const cx = parseInt(extent.getAttribute('cx') || '0', 10);
            const cy = parseInt(extent.getAttribute('cy') || '0', 10);
            if (cx > 0) width = Math.round(cx / 9525);
            if (cy > 0) height = Math.round(cy / 9525);
          }

          resultNodes.push(
            createImageNode({
              src: imageMap.get(embedId),
              alt: 'Document Image',
              width,
              height,
              alignment: 'center',
            })
          );
        }
      }
    }

    // Check for explicit page breaks
    const brs = pElem.getElementsByTagName('w:br');
    for (let b = 0; b < brs.length; b++) {
      if (brs[b].getAttribute('w:type') === 'page') {
        resultNodes.push(createPageBreakNode());
      }
    }

    // Parse Text Runs
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
      let bold = false;
      let italic = false;
      let underline = false;
      let strike = false;
      let fontFamily = 'Times New Roman';
      let fontSize = '12pt';
      let color = null;

      if (rPr) {
        bold = rPr.getElementsByTagName('w:b').length > 0;
        italic = rPr.getElementsByTagName('w:i').length > 0;
        underline = rPr.getElementsByTagName('w:u').length > 0;
        strike = rPr.getElementsByTagName('w:strike').length > 0;

        const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
        if (rFonts) {
          const fontVal = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi');
          if (fontVal) fontFamily = fontVal;
        }

        const sz = rPr.getElementsByTagName('w:sz')[0];
        if (sz) {
          const val = parseInt(sz.getAttribute('w:val') || '24', 10);
          fontSize = `${Math.round(val / 2)}pt`;
        }

        const colorElem = rPr.getElementsByTagName('w:color')[0];
        if (colorElem) {
          const val = colorElem.getAttribute('w:val');
          if (val && val !== 'auto') color = `#${val}`;
        }
      }

      runs.push(
        createTextRun({
          text,
          bold,
          italic,
          underline,
          strike,
          fontFamily,
          fontSize,
          color,
          lineHeight: lineSpacing,
        })
      );
    }

    if (runs.length > 0) {
      if (isHeading) {
        resultNodes.push(createHeadingNode({ level: headingLevel, alignment, lineSpacing, spaceBefore, spaceAfter, runs }));
      } else {
        resultNodes.push(createParagraphNode({ alignment, lineSpacing, spaceBefore, spaceAfter, runs }));
      }
    } else if (resultNodes.length === 0) {
      resultNodes.push(createParagraphNode({ alignment, lineSpacing, spaceBefore, spaceAfter, runs: [] }));
    }

    return resultNodes;
  }

  parseTable(tblElem, imageMap) {
    const rows = [];
    const trElems = tblElem.getElementsByTagName('w:tr');

    for (let r = 0; r < trElems.length; r++) {
      const trElem = trElems[r];
      const cells = [];
      const tcElems = trElem.getElementsByTagName('w:tc');

      for (let c = 0; c < tcElems.length; c++) {
        const tcElem = tcElems[c];
        const tcPr = tcElem.getElementsByTagName('w:tcPr')[0];
        let colSpan = 1;
        let rowSpan = 1;
        let backgroundColor = null;

        if (tcPr) {
          const gridSpan = tcPr.getElementsByTagName('w:gridSpan')[0];
          if (gridSpan) {
            colSpan = parseInt(gridSpan.getAttribute('w:val') || '1', 10);
          }
          const shd = tcPr.getElementsByTagName('w:shd')[0];
          if (shd) {
            const fill = shd.getAttribute('w:fill');
            if (fill && fill !== 'auto') backgroundColor = `#${fill}`;
          }
        }

        const cellContent = [];
        const pElems = tcElem.getElementsByTagName('w:p');
        for (let p = 0; p < pElems.length; p++) {
          const parsedP = this.parseParagraph(pElems[p], imageMap);
          if (parsedP) {
            if (Array.isArray(parsedP)) cellContent.push(...parsedP);
            else cellContent.push(parsedP);
          }
        }

        if (cellContent.length === 0) {
          cellContent.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
        }

        cells.push(
          createTableCell({
            isHeader: r === 0,
            colSpan,
            rowSpan,
            backgroundColor,
            content: cellContent,
          })
        );
      }

      if (cells.length > 0) {
        rows.push({ cells });
      }
    }

    return createTableNode({ rows });
  }
}

export const clientDocxParser = new ClientDocxParser();
export default clientDocxParser;
