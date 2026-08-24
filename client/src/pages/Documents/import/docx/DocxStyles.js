// src/pages/Documents/import/docx/DocxStyles.js

/**
 * Extracts and resolves style inheritance from word/styles.xml
 * Computes default typography (docDefaults) and style hierarchy (basedOn)
 */
export class DocxStyles {
  constructor() {
    this.styles = new Map(); // styleId -> style properties
    this.docDefaults = {
      fontFamily: 'Times New Roman',
      fontSize: '12pt',
      color: null,
      lineSpacing: null,
      bold: false,
      italic: false,
    };
  }

  /**
   * Parse word/styles.xml content via DOMParser
   * @param {string} xmlText
   */
  parse(xmlText) {
    if (!xmlText) return;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // 1. Extract Doc Defaults (<w:docDefaults>)
      const docDefaultsElem = xmlDoc.getElementsByTagName('w:docDefaults')[0];
      if (docDefaultsElem) {
        const rPrDefault = docDefaultsElem.getElementsByTagName('w:rPrDefault')[0];
        if (rPrDefault) {
          const rPr = rPrDefault.getElementsByTagName('w:rPr')[0];
          if (rPr) {
            const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
            if (rFonts) {
              const fontVal = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi') || rFonts.getAttribute('w:asciiTheme');
              if (fontVal) this.docDefaults.fontFamily = this.normalizeFont(fontVal);
            }

            const sz = rPr.getElementsByTagName('w:sz')[0];
            if (sz) {
              const halfPts = parseInt(sz.getAttribute('w:val') || '24', 10);
              if (!isNaN(halfPts)) {
                this.docDefaults.fontSize = `${Math.round(halfPts / 2)}pt`;
              }
            }

            const colorElem = rPr.getElementsByTagName('w:color')[0];
            if (colorElem) {
              const colorVal = colorElem.getAttribute('w:val');
              if (colorVal && colorVal !== 'auto') {
                this.docDefaults.color = `#${colorVal}`;
              }
            }
          }
        }

        const pPrDefault = docDefaultsElem.getElementsByTagName('w:pPrDefault')[0];
        if (pPrDefault) {
          const pPr = pPrDefault.getElementsByTagName('w:pPr')[0];
          if (pPr) {
            const spacing = pPr.getElementsByTagName('w:spacing')[0];
            if (spacing) {
              const lineVal = parseInt(spacing.getAttribute('w:line') || '', 10);
              if (!isNaN(lineVal)) {
                this.docDefaults.lineSpacing = (lineVal / 240).toFixed(2);
              }
            }
          }
        }
      }

      // 2. Parse Named Styles (<w:style>)
      const styleElems = xmlDoc.getElementsByTagName('w:style');
      for (let i = 0; i < styleElems.length; i++) {
        const styleElem = styleElems[i];
        const styleId = styleElem.getAttribute('w:styleId');
        if (!styleId) continue;

        const type = styleElem.getAttribute('w:type') || 'paragraph';
        const nameElem = styleElem.getElementsByTagName('w:name')[0];
        const name = nameElem ? nameElem.getAttribute('w:val') : styleId;

        const basedOnElem = styleElem.getElementsByTagName('w:basedOn')[0];
        const basedOn = basedOnElem ? basedOnElem.getAttribute('w:val') : null;

        const styleObj = {
          id: styleId,
          name,
          type,
          basedOn,
          headingLevel: this.detectHeadingLevel(styleId, name),
          rPr: {},
          pPr: {},
        };

        // Paragraph properties in style
        const pPr = styleElem.getElementsByTagName('w:pPr')[0];
        if (pPr) {
          const jc = pPr.getElementsByTagName('w:jc')[0];
          if (jc) {
            const val = jc.getAttribute('w:val');
            styleObj.pPr.alignment = val === 'both' ? 'justify' : val;
          }

          const spacing = pPr.getElementsByTagName('w:spacing')[0];
          if (spacing) {
            const lineVal = parseInt(spacing.getAttribute('w:line') || '', 10);
            if (!isNaN(lineVal)) {
              styleObj.pPr.lineSpacing = (lineVal / 240).toFixed(2);
            }
            const befVal = parseInt(spacing.getAttribute('w:before') || '', 10);
            if (!isNaN(befVal)) styleObj.pPr.spaceBefore = `${Math.round(befVal / 20)}pt`;
            const aftVal = parseInt(spacing.getAttribute('w:after') || '', 10);
            if (!isNaN(aftVal)) styleObj.pPr.spaceAfter = `${Math.round(aftVal / 20)}pt`;
          }
        }

        // Run properties in style
        const rPr = styleElem.getElementsByTagName('w:rPr')[0];
        if (rPr) {
          const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
          if (rFonts) {
            const fontVal = rFonts.getAttribute('w:ascii') || rFonts.getAttribute('w:hAnsi') || rFonts.getAttribute('w:asciiTheme');
            if (fontVal) styleObj.rPr.fontFamily = this.normalizeFont(fontVal);
          }

          const sz = rPr.getElementsByTagName('w:sz')[0];
          if (sz) {
            const halfPts = parseInt(sz.getAttribute('w:val') || '', 10);
            if (!isNaN(halfPts)) {
              styleObj.rPr.fontSize = `${Math.round(halfPts / 2)}pt`;
            }
          }

          const b = rPr.getElementsByTagName('w:b')[0];
          if (b) {
            const val = b.getAttribute('w:val');
            styleObj.rPr.bold = val !== '0' && val !== 'false';
          }

          const it = rPr.getElementsByTagName('w:i')[0];
          if (it) {
            const val = it.getAttribute('w:val');
            styleObj.rPr.italic = val !== '0' && val !== 'false';
          }

          const u = rPr.getElementsByTagName('w:u')[0];
          if (u) {
            const val = u.getAttribute('w:val');
            styleObj.rPr.underline = val !== 'none';
          }

          const color = rPr.getElementsByTagName('w:color')[0];
          if (color) {
            const val = color.getAttribute('w:val');
            if (val && val !== 'auto') styleObj.rPr.color = `#${val}`;
          }
        }

        this.styles.set(styleId, styleObj);
      }
    } catch (err) {
      console.warn('[DocxStyles] XML styles parse warning:', err.message);
    }
  }

  /**
   * Determine heading level (1-6) from style ID or name
   */
  detectHeadingLevel(styleId = '', name = '') {
    const combined = `${styleId} ${name}`.toLowerCase();
    if (/heading\s*1|^h1$|title/i.test(combined)) return 1;
    if (/heading\s*2|^h2$|subtitle/i.test(combined)) return 2;
    if (/heading\s*3|^h3$/i.test(combined)) return 3;
    if (/heading\s*4|^h4$/i.test(combined)) return 4;
    if (/heading\s*5|^h5$/i.test(combined)) return 5;
    if (/heading\s*6|^h6$/i.test(combined)) return 6;
    return 0;
  }

  /**
   * Normalize font names (removing theme keywords or fallback aliases)
   */
  normalizeFont(fontName) {
    if (!fontName) return 'Times New Roman';
    const clean = fontName.replace(/['"]/g, '').trim();
    if (/calibri/i.test(clean)) return 'Calibri';
    if (/times/i.test(clean)) return 'Times New Roman';
    if (/arial/i.test(clean)) return 'Arial';
    if (/georgia/i.test(clean)) return 'Georgia';
    if (/cambria/i.test(clean)) return 'Cambria';
    if (/garamond/i.test(clean)) return 'Garamond';
    if (/aptos/i.test(clean)) return 'Aptos';
    if (/inter/i.test(clean)) return 'Inter';
    if (/roboto/i.test(clean)) return 'Roboto';
    return clean;
  }

  /**
   * Resolve complete inherited properties for a style ID
   */
  resolveStyle(styleId) {
    if (!styleId || !this.styles.has(styleId)) {
      return {
        headingLevel: 0,
        rPr: { ...this.docDefaults },
        pPr: {},
      };
    }

    const chain = [];
    let cur = this.styles.get(styleId);
    while (cur && chain.length < 10) {
      chain.unshift(cur);
      cur = cur.basedOn ? this.styles.get(cur.basedOn) : null;
    }

    const merged = {
      headingLevel: 0,
      rPr: { ...this.docDefaults },
      pPr: {},
    };

    chain.forEach((s) => {
      if (s.headingLevel > 0) merged.headingLevel = s.headingLevel;
      if (s.rPr) Object.assign(merged.rPr, s.rPr);
      if (s.pPr) Object.assign(merged.pPr, s.pPr);
    });

    return merged;
  }
}

export default DocxStyles;
