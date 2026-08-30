// server/src/services/import/docx/DocxThemeExtractor.js
import { XMLParser } from 'fast-xml-parser';

/**
 * Extracts theme font mappings from word/theme/theme1.xml
 * Resolves w:asciiTheme="minorHAnsi" → actual font name (e.g., "Aptos", "Calibri")
 */
export class DocxThemeExtractor {
  constructor() {
    this.majorFonts = {}; // { latin: 'Calibri Light', ea: '', cs: '' }
    this.minorFonts = {}; // { latin: 'Calibri', ea: '', cs: '' }
  }

  /**
   * Parse word/theme/theme1.xml content
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

      // Navigate: theme > themeElements > fontScheme > majorFont / minorFont
      const theme = parsed.theme;
      if (!theme) return;

      const themeElements = theme.themeElements;
      if (!themeElements) return;

      const fontScheme = themeElements.fontScheme;
      if (!fontScheme) return;

      // Major Font (used for headings)
      if (fontScheme.majorFont) {
        const maj = fontScheme.majorFont;
        this.majorFonts = {
          latin: maj.latin?.['@_typeface'] || '',
          ea: maj.ea?.['@_typeface'] || '',
          cs: maj.cs?.['@_typeface'] || '',
        };
      }

      // Minor Font (used for body text)
      if (fontScheme.minorFont) {
        const min = fontScheme.minorFont;
        this.minorFonts = {
          latin: min.latin?.['@_typeface'] || '',
          ea: min.ea?.['@_typeface'] || '',
          cs: min.cs?.['@_typeface'] || '',
        };
      }
    } catch (err) {
      console.warn('[DocxThemeExtractor] Theme XML parse warning:', err.message);
    }
  }

  /**
   * Resolve a theme font reference to an actual font name
   * @param {string} themeRef - e.g., 'minorHAnsi', 'majorHAnsi', 'minorEastAsia', 'majorBidi'
   * @returns {string|null} Resolved font name or null
   */
  resolveThemeFont(themeRef) {
    if (!themeRef) return null;

    const ref = themeRef.toLowerCase();

    // majorHAnsi / majorAscii → major latin font
    if (ref.includes('major') && (ref.includes('hansi') || ref.includes('ascii') || ref.includes('latin'))) {
      return this.majorFonts.latin || null;
    }

    // minorHAnsi / minorAscii → minor latin font
    if (ref.includes('minor') && (ref.includes('hansi') || ref.includes('ascii') || ref.includes('latin'))) {
      return this.minorFonts.latin || null;
    }

    // majorEastAsia
    if (ref.includes('major') && ref.includes('east')) {
      return this.majorFonts.ea || null;
    }

    // minorEastAsia
    if (ref.includes('minor') && ref.includes('east')) {
      return this.minorFonts.ea || null;
    }

    // majorBidi / cs
    if (ref.includes('major') && (ref.includes('bidi') || ref.includes('cs'))) {
      return this.majorFonts.cs || null;
    }

    // minorBidi / cs
    if (ref.includes('minor') && (ref.includes('bidi') || ref.includes('cs'))) {
      return this.minorFonts.cs || null;
    }

    return null;
  }
}

export default DocxThemeExtractor;
