// src/pages/Documents/import/ir/DocumentIR.js

/**
 * Format-independent Document Intermediate Representation (IR)
 * Client-side Canonical Model
 */

export const createTextRun = ({
  text = '',
  fontFamily = null,
  fontSize = null,
  bold = false,
  italic = false,
  underline = false,
  strike = false,
  subscript = false,
  superscript = false,
  color = null,
  highlight = null,
}) => ({
  text,
  fontFamily,
  fontSize,
  bold: Boolean(bold),
  italic: Boolean(italic),
  underline: Boolean(underline),
  strike: Boolean(strike),
  subscript: Boolean(subscript),
  superscript: Boolean(superscript),
  color,
  highlight,
});

export const createParagraphNode = ({
  runs = [],
  alignment = 'left',
  lineSpacing = null,
}) => ({
  type: 'paragraph',
  alignment,
  lineSpacing,
  runs: Array.isArray(runs) ? runs : [],
});

export const createHeadingNode = ({
  level = 1,
  runs = [],
  alignment = 'left',
}) => ({
  type: 'heading',
  level: Math.min(6, Math.max(1, Number(level) || 1)),
  alignment,
  runs: Array.isArray(runs) ? runs : [],
});

export const createTableNode = ({
  rows = [],
  colWidths = [],
}) => ({
  type: 'table',
  colWidths: Array.isArray(colWidths) ? colWidths : [],
  rows: Array.isArray(rows) ? rows : [],
});

export const createTableCell = ({
  content = [],
  colSpan = 1,
  rowSpan = 1,
  isHeader = false,
}) => ({
  colSpan: Number(colSpan) || 1,
  rowSpan: Number(rowSpan) || 1,
  isHeader: Boolean(isHeader),
  content: Array.isArray(content) ? content : [],
});

export const createImageNode = ({
  assetId,
  src,
  alt = 'Document Image',
  width = null,
}) => ({
  type: 'image',
  assetId,
  src,
  alt,
  width,
});

export const createPageBreakNode = () => ({
  type: 'pageBreak',
});

export const createDocumentIR = ({
  metadata = {},
  pageSettings = {},
  nodes = [],
  assets = [],
}) => ({
  metadata: {
    title: metadata.title || 'Untitled Document',
    sourceFormat: metadata.sourceFormat || 'pdf',
    pageCount: metadata.pageCount || 1,
  },
  pageSettings: {
    size: pageSettings.size || 'letter',
    orientation: pageSettings.orientation || 'portrait',
    marginTop: pageSettings.marginTop || '1in',
    marginBottom: pageSettings.marginBottom || '1in',
    marginLeft: pageSettings.marginLeft || '1in',
    marginRight: pageSettings.marginRight || '1in',
  },
  nodes: Array.isArray(nodes) ? nodes : [],
  assets: Array.isArray(assets) ? assets : [],
});

export default {
  createTextRun,
  createParagraphNode,
  createHeadingNode,
  createTableNode,
  createTableCell,
  createImageNode,
  createPageBreakNode,
  createDocumentIR,
};
