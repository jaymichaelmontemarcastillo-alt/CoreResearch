// server/src/services/import/docx/DocxTableExtractor.js
import { createTableNode, createTableCell, createParagraphNode, createTextRun } from '../ir/DocumentIR.js';

/**
 * Extracts and normalizes structured tables, cell spans, and shading from OpenXML <w:tbl>
 */
export class DocxTableExtractor {
  /**
   * Parse a <w:tbl> XML chunk into an IR Table Node
   * @param {string} tblXml
   * @param {Map<string, Object>} rIdMap
   * @param {Function} parseParagraphFn
   * @returns {Object|null} IR Table Node
   */
  static extractTable(tblXml, rIdMap, parseParagraphFn) {
    if (!tblXml || !tblXml.startsWith('<w:tbl')) return null;

    // 1. Extract Grid Columns (<w:gridCol w:w="2880"/> => width in twips)
    const colWidths = [];
    const gridMatch = tblXml.match(/<w:tblGrid[\s\S]*?<\/w:tblGrid>/i);
    if (gridMatch) {
      const colRegex = /<w:gridCol[^>]+w:w="(\d+)"/g;
      let colM;
      while ((colM = colRegex.exec(gridMatch[0])) !== null) {
        const twips = parseInt(colM[1], 10);
        // 1 twip = 1/1440 in = 96/1440 px = 1/15 px
        colWidths.push(Math.round(twips / 15));
      }
    }

    // 2. Parse Rows (<w:tr>)
    const rows = [];
    const trRegex = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
    let trMatch;
    let rowIndex = 0;

    while ((trMatch = trRegex.exec(tblXml)) !== null) {
      const trXml = trMatch[0];
      const cells = [];
      const tcRegex = /<w:tc[ >][\s\S]*?<\/w:tc>/g;
      let tcMatch;

      while ((tcMatch = tcRegex.exec(trXml)) !== null) {
        const tcXml = tcMatch[0];

        // Column Span (<w:gridSpan w:val="2"/>)
        let colSpan = 1;
        const spanMatch = tcXml.match(/<w:gridSpan[^>]+w:val="(\d+)"/i);
        if (spanMatch) colSpan = parseInt(spanMatch[1], 10);

        // Vertical Merge (<w:vMerge w:val="restart|continue"/>)
        let rowSpan = 1;
        const vMergeMatch = tcXml.match(/<w:vMerge(?:[^>]+w:val="([^"]+)")?/i);
        if (vMergeMatch) {
          // If val is missing or restart, start of vertical merge
          const val = vMergeMatch[1];
          if (val === 'continue') {
            // Continuation of previous row's cell
            rowSpan = 0; // Marker for merger resolution
          }
        }

        // Background Color (<w:shd w:fill="F2F2F2"/>)
        let backgroundColor = null;
        const shdMatch = tcXml.match(/<w:shd[^>]+w:fill="([0-9A-Fa-f]{6})"/i);
        if (shdMatch && shdMatch[1] !== 'auto') {
          backgroundColor = `#${shdMatch[1]}`;
        }

        // Vertical Alignment (<w:vAlign w:val="center|bottom|top"/>)
        let verticalAlign = 'top';
        const vAlignMatch = tcXml.match(/<w:vAlign[^>]+w:val="([^"]+)"/i);
        if (vAlignMatch) {
          verticalAlign = vAlignMatch[1];
        }

        // Borders (<w:tcBorders><w:bottom w:val="single" w:sz="4" w:color="000000"/></w:tcBorders>)
        let borderColor = null;
        const bdrMatch = tcXml.match(/<w:tcBorders[\s\S]*?w:color="([0-9A-Fa-f]{6})"/i);
        if (bdrMatch && bdrMatch[1] !== 'auto') {
          borderColor = `#${bdrMatch[1]}`;
        }

        // Cell child paragraphs
        const cellParagraphs = [];
        const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
        let pMatch;
        while ((pMatch = pRegex.exec(tcXml)) !== null) {
          const pNode = parseParagraphFn(pMatch[0], rIdMap);
          if (pNode) {
            if (Array.isArray(pNode)) cellParagraphs.push(...pNode);
            else cellParagraphs.push(pNode);
          }
        }

        if (cellParagraphs.length === 0) {
          cellParagraphs.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
        }

        const isHeader = rowIndex === 0;

        cells.push(
          createTableCell({
            colSpan,
            rowSpan: rowSpan === 0 ? 1 : rowSpan,
            isHeader,
            backgroundColor,
            borderColor,
            verticalAlign,
            content: cellParagraphs,
          })
        );
      }

      if (cells.length > 0) {
        rows.push({ cells });
        rowIndex++;
      }
    }

    if (rows.length === 0) return null;

    return createTableNode({
      colWidths,
      rows,
    });
  }
}

export default DocxTableExtractor;
