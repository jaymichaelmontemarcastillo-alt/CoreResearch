// src/pages/Documents/import/docx/DocxSections.js

/**
 * Extracts page dimensions, margins, and orientation from OpenXML <w:sectPr>
 */
export class DocxSections {
  /**
   * Extract page geometry from XML Element or string
   * @param {Element|string} sectPrInput
   * @returns {{ size: 'letter'|'a4'|'legal', orientation: 'portrait'|'landscape', marginTop: string, marginBottom: string, marginLeft: string, marginRight: string }}
   */
  static extract(sectPrInput) {
    const defaultSettings = {
      size: 'letter',
      orientation: 'portrait',
      marginTop: '1in',
      marginBottom: '1in',
      marginLeft: '1in',
      marginRight: '1in',
    };

    if (!sectPrInput) return defaultSettings;

    let pgSz = null;
    let pgMar = null;

    if (typeof sectPrInput === 'string') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<root>${sectPrInput}</root>`, 'text/xml');
      pgSz = doc.getElementsByTagName('w:pgSz')[0];
      pgMar = doc.getElementsByTagName('w:pgMar')[0];
    } else if (sectPrInput.getElementsByTagName) {
      pgSz = sectPrInput.getElementsByTagName('w:pgSz')[0];
      pgMar = sectPrInput.getElementsByTagName('w:pgMar')[0];
    }

    // 1. Page Size (<w:pgSz w:w="12240" w:h="15840" w:orient="landscape"/>)
    if (pgSz) {
      const wTwips = parseInt(pgSz.getAttribute('w:w') || '12240', 10);
      const hTwips = parseInt(pgSz.getAttribute('w:h') || '15840', 10);
      const orient = pgSz.getAttribute('w:orient') || '';
      const isLandscape = orient === 'landscape' || wTwips > hTwips;

      defaultSettings.orientation = isLandscape ? 'landscape' : 'portrait';

      // 11906x16838 twips = A4, 12240x15840 = Letter, 12240x20160 = Legal
      if (Math.abs(wTwips - 11906) < 400 || Math.abs(hTwips - 16838) < 400) {
        defaultSettings.size = 'a4';
      } else if (hTwips > 18000 || wTwips > 18000) {
        defaultSettings.size = 'legal';
      } else {
        defaultSettings.size = 'letter';
      }
    }

    // 2. Margins (<w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/>)
    if (pgMar) {
      const topTwips = parseInt(pgMar.getAttribute('w:top') || '1440', 10);
      const rightTwips = parseInt(pgMar.getAttribute('w:right') || '1440', 10);
      const bottomTwips = parseInt(pgMar.getAttribute('w:bottom') || '1440', 10);
      const leftTwips = parseInt(pgMar.getAttribute('w:left') || '1440', 10);

      // 1440 twips = 1 inch
      defaultSettings.marginTop = `${(topTwips / 1440).toFixed(2)}in`;
      defaultSettings.marginRight = `${(rightTwips / 1440).toFixed(2)}in`;
      defaultSettings.marginBottom = `${(bottomTwips / 1440).toFixed(2)}in`;
      defaultSettings.marginLeft = `${(leftTwips / 1440).toFixed(2)}in`;
    }

    return defaultSettings;
  }
}

export default DocxSections;
