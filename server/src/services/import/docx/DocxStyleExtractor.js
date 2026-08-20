// server/src/services/import/docx/DocxStyleExtractor.js
import { XMLParser } from 'fast-xml-parser';

/**
 * Extracts and resolves style inheritance from word/styles.xml
 */
export class DocxStyleExtractor {
  constructor() {
    this.styles = new Map(); // styleId -> style properties
    this.docDefaults = {
      fontFamily: 'Times New Roman',
      fontSize: '12pt',
      color: null,
      lineSpacing: '1.5',
    };
  }

  /**
   * Parse word/styles.xml content
   * @param {string} xmlText
   */
  parse(xmlText) {
    if (!xmlText) return;

    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
      });

      const parsed = parser.parse(xmlText);
      const stylesRoot = parsed.styles;
      if (!stylesRoot) return;

      // 1. Doc Defaults
      if (stylesRoot.docDefaults) {
        const rPrDefault = stylesRoot.docDefaults.rPrDefault?.rPr;
        if (rPrDefault) {
          if (rPrDefault.rFonts?.['@_ascii'] || rPrDefault.rFonts?.['@_hAnsi']) {
            this.docDefaults.fontFamily = rPrDefault.rFonts['@_ascii'] || rPrDefault.rFonts['@_hAnsi'];
          }
          if (rPrDefault.sz?.['@_val']) {
            const halfPts = parseInt(rPrDefault.sz['@_val'], 10);
            if (!isNaN(halfPts)) {
              this.docDefaults.fontSize = `${Math.round(halfPts / 2)}pt`;
            }
          }
          if (rPrDefault.color?.['@_val'] && rPrDefault.color['@_val'] !== 'auto') {
            this.docDefaults.color = `#${rPrDefault.color['@_val']}`;
          }
        }
      }

      // 2. Named Styles
      const styleList = Array.isArray(stylesRoot.style)
        ? stylesRoot.style
        : stylesRoot.style ? [stylesRoot.style] : [];

      styleList.forEach((style) => {
        const styleId = style['@_styleId'];
        const type = style['@_type'] || 'paragraph';
        const name = style.name?.['@_val'] || styleId;
        const basedOn = style.basedOn?.['@_val'] || null;

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
        if (style.pPr) {
          if (style.pPr.jc?.['@_val']) {
            const jc = style.pPr.jc['@_val'];
            styleObj.pPr.alignment = jc === 'both' ? 'justify' : jc;
          }
          if (style.pPr.spacing) {
            const sp = style.pPr.spacing;
            if (sp['@_line']) {
              const lineVal = parseInt(sp['@_line'], 10);
              if (!isNaN(lineVal)) {
                styleObj.pPr.lineSpacing = (lineVal / 240).toFixed(2);
              }
            }
          }
        }

        // Run properties in style
        if (style.rPr) {
          const r = style.rPr;
          if (r.rFonts) {
            styleObj.rPr.fontFamily = r.rFonts['@_ascii'] || r.rFonts['@_hAnsi'] || null;
          }
          if (r.sz?.['@_val']) {
            const halfPts = parseInt(r.sz['@_val'], 10);
            if (!isNaN(halfPts)) {
              styleObj.rPr.fontSize = `${Math.round(halfPts / 2)}pt`;
            }
          }
          if (r.b !== undefined && r.b !== null) {
            styleObj.rPr.bold = r.b['@_val'] !== '0' && r.b['@_val'] !== 'false';
          }
          if (r.i !== undefined && r.i !== null) {
            styleObj.rPr.italic = r.i['@_val'] !== '0' && r.i['@_val'] !== 'false';
          }
          if (r.color?.['@_val'] && r.color['@_val'] !== 'auto') {
            styleObj.rPr.color = `#${r.color['@_val']}`;
          }
        }

        this.styles.set(styleId, styleObj);
      });
    } catch (err) {
      console.warn('[DocxStyleExtractor] XML styles parse warning:', err.message);
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
   * Resolve complete inherited properties for a style
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

export default DocxStyleExtractor;
