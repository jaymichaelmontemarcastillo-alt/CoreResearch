// src/pages/Documents/import/pdf/PdfLayoutExtractor.js

/**
 * Normalizes raw PDF font names to standard typography
 */
export function normalizePdfFontFamily(rawName) {
  if (!rawName) return 'Times New Roman';
  const name = rawName.replace(/^[A-Z]{6}\+/, ''); // Strip subset prefix like ABCDEF+

  if (/times|roman|nimbusrom|liberationserif/i.test(name)) return 'Times New Roman';
  if (/arial|helvetica|nimbussans|liberationsans/i.test(name)) return 'Arial';
  if (/calibri/i.test(name)) return 'Calibri';
  if (/georgia/i.test(name)) return 'Georgia';
  if (/courier|mono|nimbusmono/i.test(name)) return 'Courier New';
  if (/cambria/i.test(name)) return 'Cambria';
  if (/garamond/i.test(name)) return 'Garamond';
  if (/roboto/i.test(name)) return 'Roboto';
  if (/verdana/i.test(name)) return 'Verdana';
  if (/tahoma/i.test(name)) return 'Tahoma';

  return 'Times New Roman';
}

export class PdfLayoutExtractor {
  /**
   * Sort items by reading order, detecting 2-column or single-column layout
   */
  static sortReadingOrder(items, pageWidth) {
    if (!items || items.length === 0) return [];

    const midX = pageWidth / 2;
    let leftCount = 0;
    let rightCount = 0;

    items.forEach((item) => {
      if (item.maxX <= midX + 30) leftCount++;
      else if (item.x >= midX - 30) rightCount++;
    });

    const isTwoColumn = leftCount > items.length * 0.35 && rightCount > items.length * 0.35;

    if (isTwoColumn) {
      const fullWidthItems = [];
      const leftColItems = [];
      const rightColItems = [];

      items.forEach((item) => {
        if (item.width > pageWidth * 0.65 || (item.x < midX - 40 && item.maxX > midX + 40)) {
          fullWidthItems.push(item);
        } else if (item.maxX <= midX + 15) {
          leftColItems.push(item);
        } else {
          rightColItems.push(item);
        }
      });

      const sortByY = (a, b) => b.y - a.y || a.x - b.x;
      fullWidthItems.sort(sortByY);
      leftColItems.sort(sortByY);
      rightColItems.sort(sortByY);

      return [...fullWidthItems, ...leftColItems, ...rightColItems];
    }

    return [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  }

  /**
   * Group sorted items into horizontal lines with vertical tolerance
   */
  static groupIntoLines(sortedItems) {
    const lineMap = new Map();

    sortedItems.forEach((item) => {
      let foundKey = null;
      for (const key of lineMap.keys()) {
        if (Math.abs(key - item.y) <= 4) {
          foundKey = key;
          break;
        }
      }

      const bucketKey = foundKey !== null ? foundKey : item.y;
      if (!lineMap.has(bucketKey)) {
        lineMap.set(bucketKey, []);
      }
      lineMap.get(bucketKey).push(item);
    });

    const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
    return sortedYKeys.map((yKey) => lineMap.get(yKey).sort((a, b) => a.x - b.x));
  }
}

export default PdfLayoutExtractor;
