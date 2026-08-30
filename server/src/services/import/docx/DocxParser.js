import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

export class DocxParser {
  /**
   * Parse DOCX buffer into HTML and extracted assets
   * @param {Buffer} docxBuffer
   * @param {string} fileName
   * @returns {Promise<{ html: string, assets: Array, metadata: Object }>}
   */
  async parse(docxBuffer, fileName = 'Document.docx') {
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    let pageSettings = null;
    let paragraphFormats = []; // Per-paragraph formatting extracted from XML

    try {
      // Extract exact geometry and paragraph formatting from docx XML
      const zip = new AdmZip(docxBuffer);
      const documentXml = zip.readAsText('word/document.xml');
      if (documentXml) {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          isArray: (name) => {
            // Force arrays for elements that can repeat
            return ['w:p', 'w:r', 'w:tbl', 'w:tr', 'w:tc', 'w:sectPr'].includes(name);
          }
        });
        const parsed = parser.parse(documentXml);
        const body = parsed['w:document']?.['w:body'];

        // --- Page Geometry ---
        if (body) {
          // sectPr can be at body level or inside paragraphs for section breaks
          const sectPr = Array.isArray(body['w:sectPr'])
            ? body['w:sectPr'][0]
            : body['w:sectPr'];
          
          if (sectPr) {
            const pgSz = sectPr['w:pgSz'];
            const pgMar = sectPr['w:pgMar'];
            
            if (pgSz && pgMar) {
              // Convert twips to inches (1440 twips = 1 inch)
              const twipsToInches = (twips) => twips ? `${(parseInt(twips, 10) / 1440).toFixed(2)}in` : '1in';
              // Convert twips to mm (1 inch = 25.4mm, 1440 twips = 1 inch)
              const twipsToMm = (twips) => twips ? parseFloat((parseInt(twips, 10) / 1440 * 25.4).toFixed(2)) : 25.4;
              
              // Exact physical dimensions in twips
              const wTwips = parseInt(pgSz['@_w'] || 12240, 10);
              const hTwips = parseInt(pgSz['@_h'] || 15840, 10);
              const wInches = wTwips / 1440;
              const hInches = hTwips / 1440;
              
              let size = 'letter';
              if (Math.abs(wInches - 8.27) < 0.2 && Math.abs(hInches - 11.69) < 0.2) size = 'a4';
              else if (Math.abs(hInches - 11.69) < 0.2 && Math.abs(wInches - 8.27) < 0.2) size = 'a4';
              else if (Math.abs(wInches - 11.69) < 0.2 && Math.abs(hInches - 8.27) < 0.2) size = 'a4'; // landscape A4
              else if (Math.abs(wInches - 8.5) < 0.2 && Math.abs(hInches - 14) < 0.2) size = 'legal';
              
              pageSettings = {
                size,
                orientation: pgSz['@_orient'] === 'landscape' ? 'landscape' : 'portrait',
                marginTop: twipsToInches(pgMar['@_top']),
                marginBottom: twipsToInches(pgMar['@_bottom']),
                marginLeft: twipsToInches(pgMar['@_left']),
                marginRight: twipsToInches(pgMar['@_right']),
                // Exact physical dimensions for CSS physical units
                widthMm: twipsToMm(wTwips),
                heightMm: twipsToMm(hTwips),
              };
            }
          }

          // --- Paragraph-Level Formatting ---
          paragraphFormats = this._extractParagraphFormats(body, zip);
        }
      }
    } catch (err) {
      console.warn('[DocxParser] Failed to extract page geometry:', err.message);
    }

    const options = {
      transformDocument: mammoth.transforms.paragraph((element) => {
        if (element.alignment && element.alignment !== "left") {
          const baseName = element.styleName || "p";
          return {
            ...element,
            styleName: `${baseName}-align-${element.alignment}`,
            styleId: `${baseName}-align-${element.alignment}`
          };
        }
        return element;
      }),
      convertImage: mammoth.images.inline((element) => {
        return element.read("base64").then((imageBuffer) => {
          const mimeType = element.contentType;
          const ext = mimeType.split('/')[1] || 'png';
          const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          
          assets.push({
            id: assetId,
            fileName: assetId,
            mimeType,
            buffer: Buffer.from(imageBuffer, 'base64'),
          });

          // We return an image with a custom data-asset-id. Downstream, once the image
          // is uploaded to GridFS, we can replace the src with the GridFS URL.
          return {
            src: `data:${mimeType};base64,${imageBuffer}`,
            "data-asset-id": assetId
          };
        });
      }),
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 1-align-center'] => h1.align-center:fresh",
        "p[style-name='Heading 1-align-right'] => h1.align-right:fresh",
        "p[style-name='Heading 1-align-justify'] => h1.align-justify:fresh",
        
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 2-align-center'] => h2.align-center:fresh",
        "p[style-name='Heading 2-align-right'] => h2.align-right:fresh",
        "p[style-name='Heading 2-align-justify'] => h2.align-justify:fresh",
        
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 3-align-center'] => h3.align-center:fresh",
        "p[style-name='Heading 3-align-right'] => h3.align-right:fresh",
        "p[style-name='Heading 3-align-justify'] => h3.align-justify:fresh",
        
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        
        "p[style-name='Title'] => h1.title",
        "p[style-name='Subtitle'] => h2.subtitle",
        "p[style-name='Caption'] => p.caption",
        "p[style-name='caption'] => p.caption",
        
        "p[style-name='p-align-center'] => p.align-center:fresh",
        "p[style-name='p-align-right'] => p.align-right:fresh",
        "p[style-name='p-align-justify'] => p.align-justify:fresh",
        
        "br[type='page'] => hr.page-break",
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
      ]
    };

    const result = await mammoth.convertToHtml({ buffer: docxBuffer }, options);
    
    // Post-process: inject paragraph-level formatting into mammoth HTML
    let finalHtml = result.value || '<p></p>';
    if (paragraphFormats.length > 0) {
      finalHtml = this._injectParagraphFormatting(finalHtml, paragraphFormats);
    }

    return {
      html: finalHtml,
      assets,
      metadata: {
        title,
        sourceFormat: 'docx',
        warnings: result.messages,
        pageSettings
      }
    };
  }

  /**
   * Extract paragraph-level formatting from DOCX XML body
   * Returns an array of formatting objects, one per XML paragraph
   */
  _extractParagraphFormats(body, zip) {
    const formats = [];
    
    try {
      // Parse styles.xml for default and named style properties
      const defaultLineSpacing = null;
      const defaultSpaceBefore = null;
      const defaultSpaceAfter = null;
      
      // Collect all body-level elements to find paragraphs
      // In the parsed XML, w:p elements are top-level paragraphs
      // Tables (w:tbl) contain their own paragraphs
      const bodyChildren = this._getBodyChildren(body);
      
      for (const child of bodyChildren) {
        if (child.type === 'paragraph') {
          const fmt = this._extractSingleParagraphFormat(child.node);
          formats.push(fmt);
        } else if (child.type === 'table') {
          // Skip table paragraphs - they're handled separately by Tiptap table extensions
          // But we need a placeholder so indexes stay aligned
          formats.push({ type: 'table', skip: true });
        }
      }
    } catch (err) {
      console.warn('[DocxParser] Paragraph format extraction warning:', err.message);
    }
    
    return formats;
  }

  /**
   * Get ordered children of the body (paragraphs and tables)
   */
  _getBodyChildren(body) {
    const children = [];
    
    // fast-xml-parser groups by tag name; we need to reconstruct order
    // by looking at the raw keys. With isArray forcing, w:p and w:tbl are arrays.
    const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : (body['w:p'] ? [body['w:p']] : []);
    const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : (body['w:tbl'] ? [body['w:tbl']] : []);
    
    // Since fast-xml-parser doesn't preserve interleaved order between different tags,
    // we treat all paragraphs first then tables. This is imperfect but gives us paragraph
    // formatting for non-table paragraphs which is the main fidelity target.
    for (const p of paragraphs) {
      children.push({ type: 'paragraph', node: p });
    }
    // Tables are tracked separately; mammoth renders them inline
    for (const t of tables) {
      children.push({ type: 'table', node: t });
    }
    
    return children;
  }

  /**
   * Extract formatting from a single w:p element
   */
  _extractSingleParagraphFormat(pNode) {
    const fmt = {
      type: 'paragraph',
      skip: false,
      lineHeight: null,
      spaceBefore: null,
      spaceAfter: null,
      textIndent: null,
      marginLeft: null,
      marginRight: null,
    };
    
    if (!pNode) return fmt;
    
    const pPr = pNode['w:pPr'];
    if (!pPr) return fmt;
    
    // Line spacing: w:spacing w:line (twips/240 = line multiplier)
    const spacing = pPr['w:spacing'];
    if (spacing) {
      // w:line = line spacing in 240ths of a line (for proportional)
      // w:lineRule: auto (proportional), exact, atLeast
      const lineVal = parseInt(spacing['@_line'], 10);
      const lineRule = spacing['@_lineRule'] || 'auto';
      
      if (!isNaN(lineVal)) {
        if (lineRule === 'auto' || !lineRule) {
          // Proportional: 240 = single, 360 = 1.5, 480 = double
          fmt.lineHeight = (lineVal / 240).toFixed(2);
        } else {
          // Exact or atLeast: value is in twips, convert to pt
          fmt.lineHeight = `${(lineVal / 20).toFixed(1)}pt`;
        }
      }
      
      // w:before = space before in twips (20 twips = 1pt)
      const beforeVal = parseInt(spacing['@_before'], 10);
      if (!isNaN(beforeVal) && beforeVal > 0) {
        fmt.spaceBefore = `${(beforeVal / 20).toFixed(1)}pt`;
      }
      
      // w:after = space after in twips
      const afterVal = parseInt(spacing['@_after'], 10);
      if (!isNaN(afterVal)) {
        fmt.spaceAfter = `${(afterVal / 20).toFixed(1)}pt`;
      }
    }
    
    // Indentation: w:ind
    const ind = pPr['w:ind'];
    if (ind) {
      // w:firstLine = first line indent in twips
      const firstLine = parseInt(ind['@_firstLine'], 10);
      if (!isNaN(firstLine) && firstLine > 0) {
        fmt.textIndent = `${(firstLine / 1440).toFixed(2)}in`;
      }
      
      // w:hanging = hanging indent (negative first line)
      const hanging = parseInt(ind['@_hanging'], 10);
      if (!isNaN(hanging) && hanging > 0) {
        fmt.textIndent = `-${(hanging / 1440).toFixed(2)}in`;
      }
      
      // w:left = left indent in twips
      const leftVal = parseInt(ind['@_left'], 10);
      if (!isNaN(leftVal) && leftVal > 0) {
        fmt.marginLeft = `${(leftVal / 1440).toFixed(2)}in`;
      }
      
      // w:right = right indent in twips
      const rightVal = parseInt(ind['@_right'], 10);
      if (!isNaN(rightVal) && rightVal > 0) {
        fmt.marginRight = `${(rightVal / 1440).toFixed(2)}in`;
      }
    }
    
    return fmt;
  }

  /**
   * Post-process mammoth HTML to inject paragraph formatting from DOCX XML.
   * Matches paragraphs by sequential index (mammoth preserves paragraph order).
   */
  _injectParagraphFormatting(html, formats) {
    try {
      const $ = cheerio.load(html, null, false);
      
      // Get all top-level block elements that correspond to paragraphs
      // (p, h1-h6 — not tables, not hr)
      const blockElements = $('p, h1, h2, h3, h4, h5, h6').toArray();
      
      // Filter formats to only non-skipped paragraphs
      const paraFormats = formats.filter(f => f.type === 'paragraph' && !f.skip);
      
      const count = Math.min(blockElements.length, paraFormats.length);
      
      for (let i = 0; i < count; i++) {
        const el = $(blockElements[i]);
        const fmt = paraFormats[i];
        
        const styleParts = [];
        const existingStyle = el.attr('style') || '';
        
        if (fmt.lineHeight && !existingStyle.includes('line-height')) {
          styleParts.push(`line-height: ${fmt.lineHeight}`);
        }
        if (fmt.spaceBefore && !existingStyle.includes('margin-top')) {
          styleParts.push(`margin-top: ${fmt.spaceBefore}`);
        }
        if (fmt.spaceAfter !== null && !existingStyle.includes('margin-bottom')) {
          styleParts.push(`margin-bottom: ${fmt.spaceAfter}`);
        }
        if (fmt.textIndent && !existingStyle.includes('text-indent')) {
          styleParts.push(`text-indent: ${fmt.textIndent}`);
        }
        if (fmt.marginLeft && !existingStyle.includes('margin-left')) {
          styleParts.push(`margin-left: ${fmt.marginLeft}`);
        }
        if (fmt.marginRight && !existingStyle.includes('margin-right')) {
          styleParts.push(`margin-right: ${fmt.marginRight}`);
        }
        
        if (styleParts.length > 0) {
          const newStyle = existingStyle
            ? `${existingStyle}; ${styleParts.join('; ')}`
            : styleParts.join('; ');
          el.attr('style', newStyle);
        }
      }
      
      return $.html();
    } catch (err) {
      console.warn('[DocxParser] Paragraph formatting injection warning:', err.message);
      return html;
    }
  }
}

export default DocxParser;
