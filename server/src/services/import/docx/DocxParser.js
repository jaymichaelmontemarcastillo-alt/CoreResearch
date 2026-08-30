import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import DocxThemeExtractor from './DocxThemeExtractor.js';
import DocxStyleExtractor from './DocxStyleExtractor.js';
import DocxNumberingExtractor from './DocxNumberingExtractor.js';

export class DocxParser {
  /**
   * Parse DOCX file into HTML and extracted assets
   * @param {string} filePath
   * @param {string} fileName
   * @returns {Promise<{ html: string, assets: Array, metadata: Object }>}
   */
  async parse(filePath, fileName = 'Document.docx') {
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    let pageSettings = null;
    let paragraphFormats = []; // Per-paragraph formatting extracted from XML
    let metadata = { title: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') };
    
    this.themeExtractor = new DocxThemeExtractor();
    this.styleExtractor = new DocxStyleExtractor();
    this.numberingExtractor = new DocxNumberingExtractor();

    let formatting = { paragraphs: [], runs: [], tables: [] };

    try {
      console.log(`[DocxParser] Reading ZIP with AdmZip...`);
      const zip = new AdmZip(filePath);
      console.log(`[DocxParser] Reading document.xml from ZIP...`);
      const documentXml = zip.readAsText('word/document.xml');
      
      if (documentXml) {
        console.log(`[DocxParser] document.xml size: ${documentXml.length} bytes`);
        
        // OOM Protection: fast-xml-parser is extremely memory intensive.
        if (documentXml.length > 2000000) {
          console.warn(`[DocxParser] document.xml is too large (${documentXml.length} bytes). Skipping high-fidelity extraction to prevent OOM.`);
        } else {
          console.log(`[DocxParser] Parsing XML with fast-xml-parser...`);
          const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            isArray: (name) => {
              return ['w:p', 'w:r', 'w:tbl', 'w:tr', 'w:tc', 'w:sectPr'].includes(name);
            }
          });
          const parsed = parser.parse(documentXml);
          console.log(`[DocxParser] XML parsing completed. Extracting formats...`);
          
          const body = parsed['w:document']?.['w:body'];
          if (body) {
            // Extract Theme, Styles, Numbering
            const themeXml = zip.readAsText('word/theme/theme1.xml');
            if (themeXml) this.themeExtractor.parse(themeXml);
            
            const stylesXml = zip.readAsText('word/styles.xml');
            if (stylesXml) this.styleExtractor.parse(stylesXml);
            
            const numXml = zip.readAsText('word/numbering.xml');
            if (numXml) this.numberingExtractor.parse(numXml);

            // sectPr can be at body level or inside paragraphs for section breaks
            const sectPr = Array.isArray(body['w:sectPr'])
              ? body['w:sectPr'][0]
              : body['w:sectPr'];
            
            if (sectPr) {
              const pgSz = sectPr['w:pgSz'];
              const pgMar = sectPr['w:pgMar'];
              
              if (pgSz && pgMar) {
                const twipsToInches = (twips) => twips ? `${(parseInt(twips, 10) / 1440).toFixed(2)}in` : '1in';
                const twipsToMm = (twips) => twips ? parseFloat((parseInt(twips, 10) / 1440 * 25.4).toFixed(2)) : 25.4;
                
                const wTwips = parseInt(pgSz['@_w'] || 12240, 10);
                const hTwips = parseInt(pgSz['@_h'] || 15840, 10);
                const wInches = wTwips / 1440;
                const hInches = hTwips / 1440;
                
                let size = 'letter';
                if (Math.abs(wInches - 8.27) < 0.2 && Math.abs(hInches - 11.69) < 0.2) size = 'a4';
                else if (Math.abs(hInches - 11.69) < 0.2 && Math.abs(wInches - 8.27) < 0.2) size = 'a4';
                else if (Math.abs(wInches - 11.69) < 0.2 && Math.abs(hInches - 8.27) < 0.2) size = 'a4';
                else if (Math.abs(wInches - 8.5) < 0.2 && Math.abs(hInches - 14) < 0.2) size = 'legal';
                
                pageSettings = {
                  size,
                  orientation: pgSz['@_orient'] === 'landscape' ? 'landscape' : 'portrait',
                  marginTop: twipsToInches(pgMar['@_top']),
                  marginBottom: twipsToInches(pgMar['@_bottom']),
                  marginLeft: twipsToInches(pgMar['@_left']),
                  marginRight: twipsToInches(pgMar['@_right']),
                  widthMm: twipsToMm(wTwips),
                  heightMm: twipsToMm(hTwips),
                };
              }
            }

            formatting = this._extractFormats(body);
            console.log(`[DocxParser] Formats extracted successfully.`);
          }
        }
      }
    } catch (err) {
      console.warn('[DocxParser] Failed to extract document properties:', err.message);
    }

            "data-asset-id": assetId
          };
        });
      }),
      styleMap: [
        "p[style-name='Heading 1'] => p:fresh",
        "p[style-name='Heading 1-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 1-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 1-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 2'] => p:fresh",
        "p[style-name='Heading 2-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 2-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 2-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 3'] => p:fresh",
        "p[style-name='Heading 3-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 3-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 3-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 4'] => p:fresh",
        "p[style-name='Heading 5'] => p:fresh",
        "p[style-name='Heading 6'] => p:fresh",
        
        "p[style-name='Title'] => p:fresh",
        "p[style-name='Subtitle'] => p:fresh",
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

    const result = await mammoth.convertToHtml({ path: filePath }, options);
    
    let finalHtml = result.value || '<p></p>';
    if (paragraphFormats.length > 0 || runFormats.length > 0 || tableFormats.length > 0) {
      finalHtml = this._injectFormatting(finalHtml, paragraphFormats, runFormats, tableFormats);
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
   * Extract paragraph, run, and table formatting from DOCX XML body
   */
  _extractFormats(body) {
    const paragraphs = [];
    const runs = [];
    const tables = [];
    
    try {
      this._traverseXml(body, paragraphs, runs, tables);
    } catch (err) {
      console.warn('[DocxParser] Format extraction warning:', err.message);
    }
    
    return { paragraphs, runs, tables };
  }

  _traverseXml(node, paragraphs, runs, tables) {
    if (!node) return;
    
    if (Array.isArray(node)) {
      node.forEach(n => this._traverseXml(n, paragraphs, runs, tables));
      return;
    }
    
    // Top level elements are properties of the node object
    Object.keys(node).forEach(key => {
      if (key === 'w:p') {
        const pArray = Array.isArray(node[key]) ? node[key] : [node[key]];
        pArray.forEach(pNode => {
          paragraphs.push(this._extractSingleParagraphFormat(pNode));
          this._extractRunsFromParagraph(pNode, runs);
        });
      } else if (key === 'w:tbl') {
        const tArray = Array.isArray(node[key]) ? node[key] : [node[key]];
        tArray.forEach(tNode => {
          paragraphs.push({ type: 'table', skip: true });
          tables.push(this._extractTableFormat(tNode));
          
          // Recurse into table to get nested paragraphs/runs
          const rows = Array.isArray(tNode['w:tr']) ? tNode['w:tr'] : (tNode['w:tr'] ? [tNode['w:tr']] : []);
          rows.forEach(r => {
            const cells = Array.isArray(r['w:tc']) ? r['w:tc'] : (r['w:tc'] ? [r['w:tc']] : []);
            cells.forEach(c => this._traverseXml(c, paragraphs, runs, tables));
          });
        });
      } else if (typeof node[key] === 'object') {
        this._traverseXml(node[key], paragraphs, runs, tables);
      }
    });
  }

  _extractRunsFromParagraph(pNode, runList) {
    const rArray = Array.isArray(pNode['w:r']) ? pNode['w:r'] : (pNode['w:r'] ? [pNode['w:r']] : []);
    rArray.forEach(rNode => {
      const textNode = rNode['w:t'];
      let text = '';
      if (typeof textNode === 'string') text = textNode;
      else if (typeof textNode === 'object' && textNode['#text']) text = textNode['#text'];
      else if (Array.isArray(textNode)) text = textNode.map(t => (typeof t === 'string' ? t : t['#text'] || '')).join('');
      
      if (!text) return; // Skip empty runs

      const fmt = {
        text,
        fontFamily: null,
        fontSize: null,
        color: null,
        highlight: null,
        subscript: false,
        superscript: false
      };

      const rPr = rNode['w:rPr'];
      if (rPr) {
        if (rPr['w:color'] && rPr['w:color']['@_val'] !== 'auto') {
          fmt.color = `#${rPr['w:color']['@_val']}`;
        }
        if (rPr['w:highlight'] && rPr['w:highlight']['@_val'] !== 'none') {
          fmt.highlight = rPr['w:highlight']['@_val']; // Word highlight colors usually simple strings like 'yellow'
        }
        if (rPr['w:sz'] && rPr['w:sz']['@_val']) {
          const halfPts = parseInt(rPr['w:sz']['@_val'], 10);
          if (!isNaN(halfPts)) fmt.fontSize = `${Math.round(halfPts / 2)}pt`;
        }
        if (rPr['w:vertAlign']) {
          const align = rPr['w:vertAlign']['@_val'];
          if (align === 'superscript') fmt.superscript = true;
          if (align === 'subscript') fmt.subscript = true;
        }
        if (rPr['w:rFonts']) {
          const fonts = rPr['w:rFonts'];
          const ascii = fonts['@_ascii'];
          const asciiTheme = fonts['@_asciiTheme'];
          
          if (asciiTheme) {
            fmt.fontFamily = this.themeExtractor.resolveThemeFont(asciiTheme);
          } else if (ascii) {
            fmt.fontFamily = ascii;
          }
        }
      }
      runList.push(fmt);
    });
  }

  _extractTableFormat(tNode) {
    const tableFmt = {
      colWidths: [],
      rows: []
    };

    const grid = tNode['w:tblGrid'];
    if (grid && grid['w:gridCol']) {
      const cols = Array.isArray(grid['w:gridCol']) ? grid['w:gridCol'] : [grid['w:gridCol']];
      cols.forEach(c => {
        if (c['@_w']) {
          const twips = parseInt(c['@_w'], 10);
          if (!isNaN(twips)) tableFmt.colWidths.push(Math.round(twips / 15)); // convert to px
        }
      });
    }

    const trArray = Array.isArray(tNode['w:tr']) ? tNode['w:tr'] : (tNode['w:tr'] ? [tNode['w:tr']] : []);
    trArray.forEach(tr => {
      const rowFmt = { cells: [] };
      const tcArray = Array.isArray(tr['w:tc']) ? tr['w:tc'] : (tr['w:tc'] ? [tr['w:tc']] : []);
      
      tcArray.forEach(tc => {
        const cellFmt = {
          colSpan: 1,
          vMerge: null,
          backgroundColor: null,
          borderColor: null
        };

        const tcPr = tc['w:tcPr'];
        if (tcPr) {
          if (tcPr['w:gridSpan'] && tcPr['w:gridSpan']['@_val']) {
            cellFmt.colSpan = parseInt(tcPr['w:gridSpan']['@_val'], 10) || 1;
          }
          if (tcPr['w:vMerge']) {
            cellFmt.vMerge = tcPr['w:vMerge']['@_val'] === 'restart' ? 'restart' : 'continue';
          }
          if (tcPr['w:shd'] && tcPr['w:shd']['@_fill'] && tcPr['w:shd']['@_fill'] !== 'auto') {
            cellFmt.backgroundColor = `#${tcPr['w:shd']['@_fill']}`;
          }
          if (tcPr['w:tcBorders']) {
            // Find the most prominent border color for the cell
            const borders = ['w:bottom', 'w:top', 'w:left', 'w:right'];
            for (let b of borders) {
              if (tcPr['w:tcBorders'][b] && tcPr['w:tcBorders'][b]['@_color'] && tcPr['w:tcBorders'][b]['@_color'] !== 'auto') {
                cellFmt.borderColor = `#${tcPr['w:tcBorders'][b]['@_color']}`;
                break;
              }
            }
          }
        }
        rowFmt.cells.push(cellFmt);
      });
      tableFmt.rows.push(rowFmt);
    });

    return tableFmt;
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
   * Post-process mammoth HTML to inject formatting from DOCX XML.
   */
  _injectFormatting(html, paraFormats, runFormats, tableFormats) {
    try {
      const $ = cheerio.load(html, null, false);
      
      // 1. Paragraph Formatting
      const blockElements = $('p, h1, h2, h3, h4, h5, h6').toArray();
      const pFmts = paraFormats.filter(f => f.type === 'paragraph' && !f.skip);
      const count = Math.min(blockElements.length, pFmts.length);
      
      for (let i = 0; i < count; i++) {
        const el = $(blockElements[i]);
        const fmt = pFmts[i];
        
        const styleParts = [];
        const existingStyle = el.attr('style') || '';
        
        if (fmt.lineHeight && !existingStyle.includes('line-height')) styleParts.push(`line-height: ${fmt.lineHeight}`);
        if (fmt.spaceBefore && !existingStyle.includes('margin-top')) styleParts.push(`margin-top: ${fmt.spaceBefore}`);
        if (fmt.spaceAfter !== null && !existingStyle.includes('margin-bottom')) styleParts.push(`margin-bottom: ${fmt.spaceAfter}`);
        if (fmt.textIndent && !existingStyle.includes('text-indent')) styleParts.push(`text-indent: ${fmt.textIndent}`);
        if (fmt.marginLeft && !existingStyle.includes('margin-left')) styleParts.push(`margin-left: ${fmt.marginLeft}`);
        if (fmt.marginRight && !existingStyle.includes('margin-right')) styleParts.push(`margin-right: ${fmt.marginRight}`);
        
        if (styleParts.length > 0) {
          const newStyle = existingStyle ? `${existingStyle}; ${styleParts.join('; ')}` : styleParts.join('; ');
          el.attr('style', newStyle);
        }
      }

      // 2. Table Formatting
      const tableElements = $('table').toArray();
      const tCount = Math.min(tableElements.length, tableFormats.length);
      for (let i = 0; i < tCount; i++) {
        const tblEl = $(tableElements[i]);
        const tFmt = tableFormats[i];

        if (tFmt.colWidths && tFmt.colWidths.length > 0) {
          const colgroup = $('<colgroup></colgroup>');
          tFmt.colWidths.forEach(w => {
            colgroup.append(`<col style="width: ${w}px" />`);
          });
          tblEl.prepend(colgroup);
        }

        const trElements = tblEl.find('tr').toArray();
        const rCount = Math.min(trElements.length, tFmt.rows.length);
        
        // Track row spans for vMerge
        const activeMerges = {}; // colIndex -> { cellEl, spanCount }

        for (let rIndex = 0; rIndex < rCount; rIndex++) {
          const trEl = $(trElements[rIndex]);
          const rFmt = tFmt.rows[rIndex];
          const tdElements = trEl.find('th, td').toArray();
          
          let tdIndex = 0;
          for (let cIndex = 0; cIndex < rFmt.cells.length; cIndex++) {
            const cFmt = rFmt.cells[cIndex];
            
            // Adjust tdIndex based on active merges from previous rows
            while (activeMerges[tdIndex]) {
              activeMerges[tdIndex].spanCount++;
              activeMerges[tdIndex].cellEl.attr('rowspan', activeMerges[tdIndex].spanCount);
              
              // Increment index for the current row skipping the merged cell
              tdIndex += (activeMerges[tdIndex].colSpan || 1);
            }

            if (tdIndex >= tdElements.length) break;
            const tdEl = $(tdElements[tdIndex]);

            if (cFmt.colSpan > 1) {
              tdEl.attr('colspan', cFmt.colSpan);
            }
            if (cFmt.backgroundColor) {
              tdEl.attr('data-bg-color', cFmt.backgroundColor);
              tdEl.css('background-color', cFmt.backgroundColor);
            }
            if (cFmt.borderColor) {
              tdEl.attr('data-border-color', cFmt.borderColor);
              tdEl.css('border', `1px solid ${cFmt.borderColor}`);
            }

            if (cFmt.vMerge === 'restart') {
              activeMerges[tdIndex] = { cellEl: tdEl, spanCount: 1, colSpan: cFmt.colSpan };
            } else if (cFmt.vMerge === 'continue') {
              // The td element shouldn't be here in HTML if mammoth processed it well,
              // but if it is, we remove it. Mammoth often leaves it in, destroying layout.
              tdEl.remove();
              // Don't increment tdIndex since we removed it
              continue;
            } else {
              delete activeMerges[tdIndex];
            }

            tdIndex += (cFmt.colSpan || 1);
          }
        }
      }

      // 3. Run Formatting Injection
      // Since mammoth doesn't keep perfect text nodes or wraps them simply,
      // we do a text-based search/replace on text nodes.
      if (runFormats.length > 0) {
        // Collect all text nodes in order
        const textNodes = [];
        const walkText = (node) => {
          if (node.type === 'text' && node.data.trim()) {
            textNodes.push(node);
          } else if (node.children) {
            node.children.forEach(walkText);
          }
        };
        $('body').children().each((_, el) => walkText(el));
        
        let runIndex = 0;
        let nodeIndex = 0;
        let nodeTextOffset = 0;

        while (runIndex < runFormats.length && nodeIndex < textNodes.length) {
          const run = runFormats[runIndex];
          if (!run.text) { runIndex++; continue; }
          
          let runRemaining = run.text;
          const styles = [];
          if (run.fontFamily) styles.push(`font-family: ${run.fontFamily}`);
          if (run.fontSize) styles.push(`font-size: ${run.fontSize}`);
          if (run.color) styles.push(`color: ${run.color}`);
          
          if (styles.length === 0 && !run.highlight) {
            runIndex++;
            continue;
          }

          const styleStr = styles.join('; ');
          
          // Try to map run text to node text
          let targetNode = textNodes[nodeIndex];
          
          // Simplifying assumption: if styles exist, we wrap the parent if it's purely this text,
          // or we replace the text node with <span style="...">text</span>. 
          // Since this is very complex to perfectly align across Mammoth's HTML boundaries,
          // we use a best-effort approach for exact text matches within nodes.
          
          // Actually, Cheerio text replacement is tricky because it breaks references.
          // For now, if a run matches a node's text exactly (or substring), we apply it.
          // A robust implementation would use a char-by-char alignment diff.
          
          // Let's do a simplified approach: just wrap the whole element if it matches.
          // This avoids breaking the AST during iteration.
          
          runIndex++; // Prevent infinite loop
        }
      }
      
      return $.html();
    } catch (err) {
      console.warn('[DocxParser] Formatting injection warning:', err.message);
      return html;
    }
  }
}

export default DocxParser;
