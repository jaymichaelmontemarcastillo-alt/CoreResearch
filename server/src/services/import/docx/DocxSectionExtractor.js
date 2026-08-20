// server/src/services/import/docx/DocxSectionExtractor.js

/**
 * Extracts page dimensions, margins, and orientation from OpenXML <w:sectPr>
 */
export class DocxSectionExtractor {
  /**
   * Extract page geometry from XML string or AST element
   * @param {string} sectPrXml
   * @returns {{ size: 'letter'|'a4'|'legal', orientation: 'portrait'|'landscape', marginTop: string, marginBottom: string, marginLeft: string, marginRight: string }}
   */
  static extract(sectPrXml) {
    const defaultSettings = {
      size: 'letter',
      orientation: 'portrait',
      marginTop: '1in',
      marginBottom: '1in',
      marginLeft: '1in',
      marginRight: '1in',
    };

    if (!sectPrXml) return defaultSettings;

    // 1. Page Size (<w:pgSz w:w="12240" w:h="15840" w:orient="landscape"/>)
    const szMatch = sectPrXml.match(/<w:pgSz[^>]+w:w="(\d+)"[^>]+w:h="(\d+)"([^>]*)/i);
    if (szMatch) {
      const wTwips = parseInt(szMatch[1], 10);
      const hTwips = parseInt(szMatch[2], 10);
      const isLandscape = szMatch[3].includes('landscape') || wTwips > hTwips;

      defaultSettings.orientation = isLandscape ? 'landscape' : 'portrait';

      // 11906x16838 twips = A4, 12240x15840 = Letter, 12240x20160 = Legal
      if (Math.abs(wTwips - 11906) < 350 || Math.abs(hTwips - 16838) < 350) {
        defaultSettings.size = 'a4';
      } else if (hTwips > 18000 || wTwips > 18000) {
        defaultSettings.size = 'legal';
      } else {
        defaultSettings.size = 'letter';
      }
    }

    // 2. Margins (<w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440"/>)
    const marMatch = sectPrXml.match(/<w:pgMar[^>]+w:top="(\d+)"[^>]+w:right="(\d+)"[^>]+w:bottom="(\d+)"[^>]+w:left="(\d+)"/i);
    if (marMatch) {
      const topIn = (parseInt(marMatch[1], 10) / 1440).toFixed(2);
      const rightIn = (parseInt(marMatch[2], 10) / 1440).toFixed(2);
      const bottomIn = (parseInt(marMatch[3], 10) / 1440).toFixed(2);
      const leftIn = (parseInt(marMatch[4], 10) / 1440).toFixed(2);

      defaultSettings.marginTop = `${topIn}in`;
      defaultSettings.marginRight = `${rightIn}in`;
      defaultSettings.marginBottom = `${bottomIn}in`;
      defaultSettings.marginLeft = `${leftIn}in`;
    }

    return defaultSettings;
  }
}

export default DocxSectionExtractor;
