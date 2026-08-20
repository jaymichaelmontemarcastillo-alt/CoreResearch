// src/pages/Documents/import/docx/DocxTables.js
import { createTableNode, createTableCell, createParagraphNode, createTextRun } from '../ir/DocumentIR';

/**
 * Extracts and normalizes structured tables, cell spans, and shading from OpenXML <w:tbl>
 */
export class DocxTables {
  /**
   * Parse a <w:tbl> DOM Element into an IR Table Node
   * @param {Element} tblElem - Table XML DOM Element
   * @param {Map<string, Object>} imageMap - Resolved images
   * @param {Function} parseParagraphFn - Callback to parse child paragraphs
   * @returns {Object|null} IR Table Node
   */
  static extractTable(tblElem, imageMap, parseParagraphFn) {
    if (!tblElem) return null;

    // 1. Extract Grid Columns (<w:tblGrid><w:gridCol w:w="2880"/></w:tblGrid>)
    const colWidths = [];
    const tblGrid = tblElem.getElementsByTagName('w:tblGrid')[0];
    if (tblGrid) {
      const gridCols = tblGrid.getElementsByTagName('w:gridCol');
      for (let g = 0; g < gridCols.length; g++) {
        const wTwips = parseInt(gridCols[g].getAttribute('w:w') || '0', 10);
        // 1 twip = 1/1440 in = 96/1440 px = 1/15 px
        if (wTwips > 0) {
          colWidths.push(Math.round(wTwips / 15));
        }
      }
    }

    // 2. Parse Rows (<w:tr>)
    const rows = [];
    const trElems = tblElem.getElementsByTagName('w:tr');

    for (let r = 0; r < trElems.length; r++) {
      const trElem = trElems[r];
      const cells = [];
      const tcElems = trElem.getElementsByTagName('w:tc');

      for (let c = 0; c < tcElems.length; c++) {
        const tcElem = tcElems[c];
        const tcPr = tcElem.getElementsByTagName('w:tcPr')[0];

        let colSpan = 1;
        let rowSpan = 1;
        let backgroundColor = null;
        let borderColor = null;
        let verticalAlign = 'top';

        if (tcPr) {
          // Column Span (<w:gridSpan w:val="2"/>)
          const gridSpan = tcPr.getElementsByTagName('w:gridSpan')[0];
          if (gridSpan) {
            colSpan = parseInt(gridSpan.getAttribute('w:val') || '1', 10);
          }

          // Shading / Background (<w:shd w:fill="F2F2F2"/>)
          const shd = tcPr.getElementsByTagName('w:shd')[0];
          if (shd) {
            const fill = shd.getAttribute('w:fill');
            if (fill && fill !== 'auto' && fill !== 'none') {
              backgroundColor = fill.startsWith('#') ? fill : `#${fill}`;
            }
          }

          // Borders (<w:tcBorders>)
          const borders = tcPr.getElementsByTagName('w:tcBorders')[0];
          if (borders) {
            const bottom = borders.getElementsByTagName('w:bottom')[0] || borders.getElementsByTagName('w:top')[0];
            if (bottom) {
              const color = bottom.getAttribute('w:color');
              if (color && color !== 'auto') {
                borderColor = color.startsWith('#') ? color : `#${color}`;
              }
            }
          }

          // Vertical Alignment (<w:vAlign w:val="center"/>)
          const vAlign = tcPr.getElementsByTagName('w:vAlign')[0];
          if (vAlign) {
            verticalAlign = vAlign.getAttribute('w:val') || 'top';
          }
        }

        // Cell child paragraphs
        const cellContent = [];
        const pElems = tcElem.getElementsByTagName('w:p');

        for (let p = 0; p < pElems.length; p++) {
          const parsedP = parseParagraphFn(pElems[p], imageMap);
          if (parsedP) {
            if (Array.isArray(parsedP)) cellContent.push(...parsedP);
            else cellContent.push(parsedP);
          }
        }

        if (cellContent.length === 0) {
          cellContent.push(createParagraphNode({ runs: [createTextRun({ text: '' })] }));
        }

        cells.push(
          createTableCell({
            isHeader: r === 0,
            colSpan,
            rowSpan,
            backgroundColor,
            borderColor,
            verticalAlign,
            content: cellContent,
          })
        );
      }

      if (cells.length > 0) {
        rows.push({ cells });
      }
    }

    if (rows.length === 0) return null;

    return createTableNode({
      colWidths,
      rows,
    });
  }
}

export default DocxTables;
