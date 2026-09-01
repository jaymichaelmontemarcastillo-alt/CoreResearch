// server/src/services/import/pdf/PdfLayoutAnalyzer.js

/**
 * Detects column boundaries and reading order in coordinate-based PDF pages
 */
export class PdfLayoutAnalyzer {
  /**
   * Determine whether a page is 2-column or single column based on X coordinate clusters
   * @param {Array<Object>} items - Array of { x, width, maxX, y, text }
   * @param {number} pageWidth - Page width in pt
   * @returns {{ isMultiColumn: boolean, columnCutoff: number }}
   */
  static analyzeColumnLayout(items, pageWidth) {
    if (!items || items.length < 15) {
      return { isMultiColumn: false, columnCutoff: pageWidth / 2 };
    }

    const midX = pageWidth / 2;
    const gutterWidth = 30; // Min gutter width between columns (approx 0.4 in)
    const leftBound = midX - (gutterWidth / 2);
    const rightBound = midX + (gutterWidth / 2);

    let leftColCount = 0;
    let rightColCount = 0;
    let crossCenterCount = 0;

    items.forEach((item) => {
      if (item.x < leftBound && item.maxX < rightBound) {
        leftColCount++;
      } else if (item.x > leftBound && item.maxX > rightBound) {
        rightColCount++;
      } else if (item.x < leftBound && item.maxX > rightBound) {
        crossCenterCount++;
      }
    });

    // If substantial items exist on both sides and few items cross the center gutter, it's 2-column
    const totalCount = items.length;
    const isMultiColumn =
      leftColCount > totalCount * 0.25 &&
      rightColCount > totalCount * 0.25 &&
      crossCenterCount < totalCount * 0.15;

    return {
      isMultiColumn,
      columnCutoff: midX,
    };
  }

  /**
   * Sort items by reading order (Column 1 top-to-bottom, then Column 2 top-to-bottom)
   * @param {Array<Object>} items
   * @param {number} pageWidth
   * @returns {Array<Object>} Sorted items
   */
  static sortReadingOrder(items, pageWidth) {
    const { isMultiColumn, columnCutoff } = this.analyzeColumnLayout(items, pageWidth);

    if (!isMultiColumn) {
      // Single column: sort Y descending (top to bottom), then X ascending (left to right)
      return [...items].sort((a, b) => {
        if (Math.abs(a.y - b.y) <= 3) return a.x - b.x;
        return b.y - a.y;
      });
    }

    // 2-Column Academic Paper: Separate full-width header items (Title, Abstract) from columns
    const fullWidthItems = [];
    const col1Items = [];
    const col2Items = [];

    items.forEach((item) => {
      if (item.maxX - item.x > pageWidth * 0.65) {
        fullWidthItems.push(item);
      } else if (item.x < columnCutoff) {
        col1Items.push(item);
      } else {
        col2Items.push(item);
      }
    });

    const sortByCoords = (list) =>
      [...list].sort((a, b) => {
        if (Math.abs(a.y - b.y) <= 3) return a.x - b.x;
        return b.y - a.y;
      });

    return [
      ...sortByCoords(fullWidthItems),
      ...sortByCoords(col1Items),
      ...sortByCoords(col2Items),
    ];
  }
}

export default PdfLayoutAnalyzer;
