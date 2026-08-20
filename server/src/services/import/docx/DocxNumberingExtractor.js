// server/src/services/import/docx/DocxNumberingExtractor.js
import { XMLParser } from 'fast-xml-parser';

/**
 * Extracts list numbering definitions from word/numbering.xml
 */
export class DocxNumberingExtractor {
  constructor() {
    this.numMap = new Map(); // numId -> abstractNumId
    this.abstractNumMap = new Map(); // abstractNumId -> { levels: Map(ilvl -> { format, text }) }
  }

  /**
   * Parse word/numbering.xml content
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
      const root = parsed.numbering;
      if (!root) return;

      // 1. Abstract Numbering Definitions
      const abstractList = Array.isArray(root.abstractNum)
        ? root.abstractNum
        : root.abstractNum ? [root.abstractNum] : [];

      abstractList.forEach((abs) => {
        const absId = abs['@_abstractNumId'];
        const levels = new Map();

        const lvlList = Array.isArray(abs.lvl) ? abs.lvl : abs.lvl ? [abs.lvl] : [];
        lvlList.forEach((lvl) => {
          const ilvl = parseInt(lvl['@_ilvl'] || '0', 10);
          const numFmt = lvl.numFmt?.['@_val'] || 'decimal';
          const lvlText = lvl.lvlText?.['@_val'] || '%1.';
          const isBullet = numFmt === 'bullet' || numFmt === 'none';

          levels.set(ilvl, {
            isBullet,
            numFmt,
            lvlText,
          });
        });

        this.abstractNumMap.set(absId, { levels });
      });

      // 2. Num instances
      const numList = Array.isArray(root.num) ? root.num : root.num ? [root.num] : [];
      numList.forEach((num) => {
        const numId = num['@_numId'];
        const abstractNumId = num.abstractNumId?.['@_val'];
        if (numId && abstractNumId) {
          this.numMap.set(numId, abstractNumId);
        }
      });
    } catch (err) {
      console.warn('[DocxNumberingExtractor] Numbering XML parse warning:', err.message);
    }
  }

  /**
   * Resolve list information from numId and ilvl
   * @param {string} numId
   * @param {number|string} ilvl
   * @returns {{ listType: 'bullet'|'ordered'|null, listLevel: number }}
   */
  resolveListInfo(numId, ilvl = 0) {
    if (!numId || !this.numMap.has(numId)) {
      return { listType: null, listLevel: 0 };
    }

    const absId = this.numMap.get(numId);
    const abs = this.abstractNumMap.get(absId);
    const levelNum = parseInt(ilvl, 10) || 0;

    if (!abs || !abs.levels.has(levelNum)) {
      return { listType: 'bullet', listLevel: levelNum };
    }

    const lvlData = abs.levels.get(levelNum);
    return {
      listType: lvlData.isBullet ? 'bullet' : 'ordered',
      listLevel: levelNum,
    };
  }
}

export default DocxNumberingExtractor;
