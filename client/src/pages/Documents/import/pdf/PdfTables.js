// src/pages/Documents/import/pdf/PdfTables.js
import { createTableNode, createTableCell, createParagraphNode, createTextRun } from '../ir/DocumentIR';

/**
 * Heuristic table detector and reconstructor from aligned PDF text coordinates
 */
export class PdfTables {
  /**
   * Check if a series of consecutive text lines form a table structure
   * @param {Array<Array<Object>>} lines - Array of lines containing text items
   * @returns {{ isTable: boolean, tableNode: Object|null, consumedLines: number }}
   */
  static detectAndReconstructTable(lines, startIndex = 0) {
    if (!lines || startIndex >= lines.length) {
      return { isTable: false, tableNode: null, consumedLines: 0 };
    }

    const candidateLines = [];
    let idx = startIndex;

    // Check consecutive lines with 2 or more columns
    while (idx < lines.length) {
      const lineItems = lines[idx];
      if (!lineItems || lineItems.length < 2) break;

      // Group items on this line that are separated by gaps
      const cols = this.groupLineItemsIntoColumns(lineItems);
      if (cols.length < 2) break;

      candidateLines.push(cols);
      idx++;
    }

    // A table requires at least 2 consecutive multi-column rows
    if (candidateLines.length < 2) {
      return { isTable: false, tableNode: null, consumedLines: 0 };
    }

    // Determine max column count
    const maxCols = Math.max(...candidateLines.map((c) => c.length));
    const rows = [];

    candidateLines.forEach((colGroup, rowIdx) => {
      const cells = [];

      colGroup.forEach((colItems) => {
        const text = colItems.map((i) => i.text).join(' ').trim();
        const runs = colItems.map((i) =>
          createTextRun({
            text: i.text,
            fontFamily: i.fontFamily,
            fontSize: `${i.fontSize}pt`,
            bold: Boolean(i.bold),
            italic: Boolean(i.italic),
          })
        );

        cells.push(
          createTableCell({
            isHeader: rowIdx === 0,
            content: [createParagraphNode({ runs })],
          })
        );
      });

      // Pad missing cells if row has fewer columns
      while (cells.length < maxCols) {
        cells.push(
          createTableCell({
            isHeader: rowIdx === 0,
            content: [createParagraphNode({ runs: [createTextRun({ text: '' })] })],
          })
        );
      }

      rows.push({ cells });
    });

    const tableNode = createTableNode({ rows });
    return {
      isTable: true,
      tableNode,
      consumedLines: candidateLines.length,
    };
  }

  /**
   * Group items on a single horizontal line into column buckets based on X gaps
   */
  static groupLineItemsIntoColumns(lineItems) {
    if (lineItems.length === 0) return [];

    const sorted = [...lineItems].sort((a, b) => a.x - b.x);
    const columns = [];
    let currentColumn = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = curr.x - prev.maxX;

      // If gap between text tokens is larger than 25px, treat as separate table column
      if (gap > 25) {
        columns.push(currentColumn);
        currentColumn = [curr];
      } else {
        currentColumn.push(curr);
      }
    }

    if (currentColumn.length > 0) {
      columns.push(currentColumn);
    }

    return columns;
  }
}

export default PdfTables;
