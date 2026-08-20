// server/src/services/import/docx/DocxParser.js
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import {
  createDocumentIR,
  createParagraphNode,
  createHeadingNode,
  createPageBreakNode,
  createTextRun,
} from '../ir/DocumentIR.js';
import { DocxStyleExtractor } from './DocxStyleExtractor.js';
import { DocxNumberingExtractor } from './DocxNumberingExtractor.js';
import { DocxSectionExtractor } from './DocxSectionExtractor.js';
import { DocxDrawingExtractor } from './DocxDrawingExtractor.js';
import { DocxTableExtractor } from './DocxTableExtractor.js';

export class DocxParser {
  constructor() {
    this.styleExtractor = new DocxStyleExtractor();
    this.numberingExtractor = new DocxNumberingExtractor();
  }

  /**
   * Parse DOCX buffer into High-Fidelity DocumentIR
   * @param {Buffer} docxBuffer
   * @param {string} fileName
   * @returns {Promise<DocumentIR>}
   */
  async parse(docxBuffer, fileName = 'Document.docx') {
    const assets = [];
    const nodes = [];
    let pageSettings = {
      size: 'letter',
      orientation: 'portrait',
      marginTop: '1in',
      marginBottom: '1in',
      marginLeft: '1in',
      marginRight: '1in',
    };

    try {
      const zip = new AdmZip(docxBuffer);
      const zipEntries = zip.getEntries();

      // 1. Extract embedded images from word/media/
      const mediaMap = new Map(); // rawFilename -> asset
      zipEntries.forEach((entry) => {
        if (entry.entryName.startsWith('word/media/') && !entry.isDirectory) {
          const rawName = entry.name;
          const ext = rawName.split('.').pop()?.toLowerCase() || 'png';
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : 'image/png';
          const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${rawName}`;

          const assetObj = {
            id: assetId,
            fileName: rawName,
            mimeType,
            buffer: entry.getData(),
          };
          assets.push(assetObj);
          mediaMap.set(rawName, assetObj);
        }
      });

      // 2. Parse word/_rels/document.xml.rels for rId to media mapping
      const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
      const rIdMap = new Map();
      if (relsEntry) {
        const relsXml = relsEntry.getData().toString('utf8');
        const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g;
        let match;
        while ((match = relRegex.exec(relsXml)) !== null) {
          const rId = match[1];
          const target = match[2].replace(/^media\//, '').replace(/^word\/media\//, '').replace(/^..\//, '');
          if (mediaMap.has(target)) {
            rIdMap.set(rId, mediaMap.get(target));
          }
        }
      }

      // 3. Parse word/styles.xml for style inheritance & doc defaults
      const stylesEntry = zip.getEntry('word/styles.xml');
      if (stylesEntry) {
        this.styleExtractor.parse(stylesEntry.getData().toString('utf8'));
      }

      // 4. Parse word/numbering.xml for lists
      const numEntry = zip.getEntry('word/numbering.xml');
      if (numEntry) {
        this.numberingExtractor.parse(numEntry.getData().toString('utf8'));
      }

      // 5. Parse word/document.xml for full structured content
      const docEntry = zip.getEntry('word/document.xml');
      if (docEntry) {
        const docXml = docEntry.getData().toString('utf8');

        // Extract Page Setup (Page Size & Margins from sectPr)
        const sectPrMatch = docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/i);
        if (sectPrMatch) {
          pageSettings = DocxSectionExtractor.extract(sectPrMatch[0]);
        }

        // Parse Body Children (Paragraphs, Headings, Tables, Drawings)
        const parsedNodes = this.parseDocumentBody(docXml, rIdMap);
        if (parsedNodes && parsedNodes.length > 0) {
          nodes.push(...parsedNodes);
        }
      }
    } catch (zipErr) {
      console.warn('[DocxParser] XML extraction warning, using mammoth fallback:', zipErr.message);
    }

    // 6. Fallback if XML parser did not extract nodes
    if (nodes.length === 0) {
      const fallbackNodes = await this.parseWithMammothFallback(docxBuffer);
      nodes.push(...fallbackNodes);
    }

    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    return createDocumentIR({
      metadata: {
        title,
        sourceFormat: 'docx',
        pageCount: 1,
      },
      pageSettings,
      nodes,
      assets,
    });
  }

  /**
   * Parse <w:body> child elements (<w:p>, <w:tbl>)
   */
  parseDocumentBody(docXml, rIdMap) {
    const nodes = [];
    const bodyMatch = docXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i);
    if (!bodyMatch) return nodes;

    const bodyContent = bodyMatch[1];
    const blockRegex = /(<w:p[ >][\s\S]*?<\/w:p>|<w:tbl[ >][\s\S]*?<\/w:tbl>)/g;
    let block;

    while ((block = blockRegex.exec(bodyContent)) !== null) {
      const xmlChunk = block[1];
      if (xmlChunk.startsWith('<w:tbl')) {
        const tableNode = DocxTableExtractor.extractTable(xmlChunk, rIdMap, (pXml, map) =>
          this.parseParagraphBlock(pXml, map)
        );
        if (tableNode) nodes.push(tableNode);
      } else if (xmlChunk.startsWith('<w:p')) {
        const paragraphOrHeading = this.parseParagraphBlock(xmlChunk, rIdMap);
        if (paragraphOrHeading) {
          if (Array.isArray(paragraphOrHeading)) {
            nodes.push(...paragraphOrHeading);
          } else {
            nodes.push(paragraphOrHeading);
          }
        }
      }
    }

    return nodes;
  }

  /**
   * Parse a <w:p> XML element into IR Paragraph, Heading, Image, or PageBreak
   */
  parseParagraphBlock(pXml, rIdMap) {
    // 1. Check for page break inside paragraph
    if (pXml.includes('<w:br w:type="page"/>') || pXml.includes('<w:br w:type="page" />')) {
      return createPageBreakNode();
    }

    // 2. Check for embedded images (<w:drawing>)
    const extractedImages = DocxDrawingExtractor.extractImages(pXml, rIdMap);
    if (extractedImages.length > 0) {
      return extractedImages;
    }

    // 3. Resolve Paragraph Properties (<w:pPr>)
    let alignment = 'left';
    let lineSpacing = null;
    let spaceBefore = null;
    let spaceAfter = null;
    let indentation = null;
    let listType = null;
    let listLevel = 0;
    let headingLevel = 0;

    // Style ID
    const styleMatch = pXml.match(/<w:pStyle[^>]+w:val="([^"]+)"/i);
    const styleId = styleMatch ? styleMatch[1] : null;
    const resolvedStyle = styleId ? this.styleExtractor.resolveStyle(styleId) : this.styleExtractor.resolveStyle(null);

    if (resolvedStyle.headingLevel > 0) {
      headingLevel = resolvedStyle.headingLevel;
    }
    if (resolvedStyle.pPr.alignment) {
      alignment = resolvedStyle.pPr.alignment;
    }
    if (resolvedStyle.pPr.lineSpacing) {
      lineSpacing = resolvedStyle.pPr.lineSpacing;
    }

    // Direct Paragraph Alignment (<w:jc w:val="center|right|both|left"/>)
    const jcMatch = pXml.match(/<w:jc[^>]+w:val="([^"]+)"/i);
    if (jcMatch) {
      const val = jcMatch[1];
      if (val === 'both') alignment = 'justify';
      else if (['center', 'right', 'left'].includes(val)) alignment = val;
    }

    // Direct Spacing (<w:spacing w:line="360" w:lineRule="auto" w:before="240" w:after="120"/>)
    const spMatch = pXml.match(/<w:spacing([^>]*)\/>/i);
    if (spMatch) {
      const attrs = spMatch[1];
      const lineM = attrs.match(/w:line="(\d+)"/);
      if (lineM) {
        const lineVal = parseInt(lineM[1], 10);
        if (!isNaN(lineVal)) {
          // 240 line twips = single (1.0), 360 = 1.5, 480 = double (2.0)
          lineSpacing = (lineVal / 240).toFixed(2);
        }
      }
      const befM = attrs.match(/w:before="(\d+)"/);
      if (befM) {
        const befVal = parseInt(befM[1], 10);
        if (!isNaN(befVal)) spaceBefore = `${Math.round(befVal / 20)}pt`;
      }
      const aftM = attrs.match(/w:after="(\d+)"/);
      if (aftM) {
        const aftVal = parseInt(aftM[1], 10);
        if (!isNaN(aftVal)) spaceAfter = `${Math.round(aftVal / 20)}pt`;
      }
    }

    // Direct Indentation (<w:ind w:left="720" w:firstLine="720"/>)
    const indMatch = pXml.match(/<w:ind([^>]*)\/>/i);
    if (indMatch) {
      const attrs = indMatch[1];
      const leftM = attrs.match(/w:left="(\d+)"/);
      const firstM = attrs.match(/w:firstLine="(\d+)"/);
      if (leftM || firstM) {
        indentation = {
          left: leftM ? `${Math.round(parseInt(leftM[1], 10) / 20)}pt` : null,
          firstLine: firstM ? `${Math.round(parseInt(firstM[1], 10) / 20)}pt` : null,
        };
      }
    }

    // Lists (<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>)
    const numPrMatch = pXml.match(/<w:numPr[\s\S]*?<\/w:numPr>/i);
    if (numPrMatch) {
      const numPrXml = numPrMatch[0];
      const ilvlM = numPrXml.match(/<w:ilvl[^>]+w:val="(\d+)"/i);
      const numIdM = numPrXml.match(/<w:numId[^>]+w:val="(\d+)"/i);
      const ilvl = ilvlM ? parseInt(ilvlM[1], 10) : 0;
      const numId = numIdM ? numIdM[1] : null;

      if (numId) {
        const listInfo = this.numberingExtractor.resolveListInfo(numId, ilvl);
        listType = listInfo.listType;
        listLevel = listInfo.listLevel;
      }
    }

    // 4. Extract text runs (<w:r>)
    const runs = [];
    const rRegex = /<w:r[ >][\s\S]*?<\/w:r>/g;
    let rMatch;

    while ((rMatch = rRegex.exec(pXml)) !== null) {
      const rXml = rMatch[0];

      // Text value (<w:t>)
      const tMatch = rXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
      if (!tMatch) continue;
      const text = this.decodeXmlEntities(tMatch[1]);
      if (!text) continue;

      // Font Family (<w:rFonts w:ascii="Times New Roman"/>)
      let fontFamily = resolvedStyle.rPr?.fontFamily || 'Times New Roman';
      const fontMatch = rXml.match(/<w:rFonts[^>]+(?:w:ascii|w:hAnsi)="([^"]+)"/i);
      if (fontMatch) fontFamily = fontMatch[1];

      // Font Size (<w:sz w:val="24"/> => 12pt)
      let fontSize = resolvedStyle.rPr?.fontSize || '12pt';
      const szMatch = rXml.match(/<w:sz[^>]+w:val="(\d+)"/i);
      if (szMatch) {
        const halfPts = parseInt(szMatch[1], 10);
        fontSize = `${Math.round(halfPts / 2)}pt`;
      }

      // Formatting Marks
      let bold = resolvedStyle.rPr?.bold || false;
      if (/<w:b[ \/>]/i.test(rXml)) {
        bold = !/<w:b w:val="(?:0|false)"/i.test(rXml);
      }

      let italic = resolvedStyle.rPr?.italic || false;
      if (/<w:i[ \/>]/i.test(rXml)) {
        italic = !/<w:i w:val="(?:0|false)"/i.test(rXml);
      }

      const underline = /<w:u[ >]/i.test(rXml) && !/<w:u w:val="none"/i.test(rXml);
      const strike = /<w:strike[ \/>]/i.test(rXml) && !/<w:strike w:val="(?:0|false)"/i.test(rXml);
      const subscript = /<w:vertAlign[^>]+w:val="subscript"/i.test(rXml);
      const superscript = /<w:vertAlign[^>]+w:val="superscript"/i.test(rXml);

      // Color (<w:color w:val="FF0000"/>)
      let color = resolvedStyle.rPr?.color || null;
      const colMatch = rXml.match(/<w:color[^>]+w:val="([0-9A-Fa-f]{6})"/i);
      if (colMatch && colMatch[1] !== 'auto') {
        color = `#${colMatch[1]}`;
      }

      // Highlight (<w:highlight w:val="yellow"/>)
      let highlight = null;
      const hlMatch = rXml.match(/<w:highlight[^>]+w:val="([^"]+)"/i);
      if (hlMatch && hlMatch[1] !== 'none') {
        highlight = hlMatch[1];
      }

      runs.push(
        createTextRun({
          text,
          fontFamily,
          fontSize,
          bold,
          italic,
          underline,
          strike,
          subscript,
          superscript,
          color,
          highlight,
          lineHeight: lineSpacing,
        })
      );
    }

    if (runs.length === 0) {
      // Empty paragraph / spacer
      return createParagraphNode({
        alignment,
        lineSpacing,
        spaceBefore,
        spaceAfter,
        runs: [createTextRun({ text: '' })],
      });
    }

    if (headingLevel > 0) {
      return createHeadingNode({
        level: headingLevel,
        alignment,
        lineSpacing,
        spaceBefore,
        spaceAfter,
        runs,
      });
    }

    return createParagraphNode({
      alignment,
      lineSpacing,
      spaceBefore,
      spaceAfter,
      indentation,
      listType,
      listLevel,
      runs,
    });
  }

  /**
   * Mammoth HTML parser fallback
   */
  async parseWithMammothFallback(docxBuffer) {
    const nodes = [];
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const html = result.value || '';

    const pRegex = /<(p|h1|h2|h3|h4|h5|h6)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = pRegex.exec(html)) !== null) {
      const tag = match[1].toLowerCase();
      const content = match[2].replace(/<[^>]+>/g, '').trim();
      if (!content) continue;

      const runs = [createTextRun({ text: content })];
      if (tag.startsWith('h')) {
        const level = parseInt(tag.charAt(1), 10);
        nodes.push(createHeadingNode({ level, runs }));
      } else {
        nodes.push(createParagraphNode({ runs }));
      }
    }

    return nodes;
  }

  decodeXmlEntities(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

export default DocxParser;
