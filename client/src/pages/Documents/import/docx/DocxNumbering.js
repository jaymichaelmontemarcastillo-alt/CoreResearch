// src/pages/Documents/import/docx/DocxNumbering.js

/**
 * Extracts list numbering definitions from word/numbering.xml
 * Maps numId and ilvl (nesting level) to bullet or ordered list representations
 */
export class DocxNumbering {
  constructor() {
    this.numMap = new Map(); // numId -> abstractNumId
    this.abstractNumMap = new Map(); // abstractNumId -> { levels: Map(ilvl -> { isBullet, numFmt, lvlText }) }
  }

  /**
   * Parse word/numbering.xml content
   * @param {string} xmlText
   */
  parse(xmlText) {
    if (!xmlText) return;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // 1. Abstract Numbering Definitions (<w:abstractNum>)
      const abstractElems = xmlDoc.getElementsByTagName('w:abstractNum');
      for (let a = 0; a < abstractElems.length; a++) {
        const absElem = abstractElems[a];
        const absId = absElem.getAttribute('w:abstractNumId');
        if (!absId) continue;

        const levels = new Map();
        const lvlElems = absElem.getElementsByTagName('w:lvl');

        for (let l = 0; l < lvlElems.length; l++) {
          const lvlElem = lvlElems[l];
          const ilvl = parseInt(lvlElem.getAttribute('w:ilvl') || '0', 10);

          const numFmtElem = lvlElem.getElementsByTagName('w:numFmt')[0];
          const numFmt = numFmtElem ? numFmtElem.getAttribute('w:val') : 'decimal';

          const lvlTextElem = lvlElem.getElementsByTagName('w:lvlText')[0];
          const lvlText = lvlTextElem ? lvlTextElem.getAttribute('w:val') : '%1.';

          const isBullet = numFmt === 'bullet' || numFmt === 'none';

          levels.set(ilvl, {
            isBullet,
            numFmt,
            lvlText,
          });
        }

        this.abstractNumMap.set(absId, { levels });
      }

      // 2. Num instances (<w:num>)
      const numElems = xmlDoc.getElementsByTagName('w:num');
      for (let n = 0; n < numElems.length; n++) {
        const numElem = numElems[n];
        const numId = numElem.getAttribute('w:numId');
        const abstractNumIdElem = numElem.getElementsByTagName('w:abstractNumId')[0];
        const abstractNumId = abstractNumIdElem ? abstractNumIdElem.getAttribute('w:val') : null;

        if (numId && abstractNumId) {
          this.numMap.set(numId, abstractNumId);
        }
      }
    } catch (err) {
      console.warn('[DocxNumbering] Numbering XML parse warning:', err.message);
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

export default DocxNumbering;
