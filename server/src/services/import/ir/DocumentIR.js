// server/src/services/import/ir/DocumentIR.js

/**
 * Format-independent Document Intermediate Representation (IR)
 * Represents structured document content, formatting, tables, images, and page geometry.
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
  lineHeight = null,
  link = null,
}) => ({
  text: String(text ?? ''),
  fontFamily: fontFamily || null,
  fontSize: fontSize || null,
  bold: Boolean(bold),
  italic: Boolean(italic),
  underline: Boolean(underline),
  strike: Boolean(strike),
  subscript: Boolean(subscript),
  superscript: Boolean(superscript),
  color: color || null,
  highlight: highlight || null,
  lineHeight: lineHeight || null,
  link: link || null,
});

export const createParagraphNode = ({
  runs = [],
  alignment = 'left', // 'left' | 'center' | 'right' | 'justify'
  lineSpacing = null,
  spaceBefore = null,
  spaceAfter = null,
  indentation = null,
  listType = null, // 'bullet' | 'ordered' | null
  listLevel = 0,
}) => ({
  type: 'paragraph',
  alignment: ['center', 'right', 'justify'].includes(alignment) ? alignment : 'left',
  lineSpacing: lineSpacing || null,
  spaceBefore: spaceBefore || null,
  spaceAfter: spaceAfter || null,
  indentation: indentation || null,
  listType: listType || null,
  listLevel: Number(listLevel) || 0,
  runs: Array.isArray(runs) ? runs : [],
});

export const createHeadingNode = ({
  level = 1,
  runs = [],
  alignment = 'left',
  lineSpacing = null,
  spaceBefore = null,
  spaceAfter = null,
}) => ({
  type: 'heading',
  level: Math.min(6, Math.max(1, Number(level) || 1)),
  alignment: ['center', 'right', 'justify'].includes(alignment) ? alignment : 'left',
  lineSpacing: lineSpacing || null,
  spaceBefore: spaceBefore || null,
  spaceAfter: spaceAfter || null,
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
  backgroundColor = null,
  borderColor = null,
  verticalAlign = null,
}) => ({
  colSpan: Math.max(1, Number(colSpan) || 1),
  rowSpan: Math.max(1, Number(rowSpan) || 1),
  isHeader: Boolean(isHeader),
  backgroundColor: backgroundColor || null,
  borderColor: borderColor || null,
  verticalAlign: verticalAlign || null,
  content: Array.isArray(content) ? content : [],
});

export const createImageNode = ({
  assetId = '',
  src = '',
  alt = 'Document Image',
  width = null,
  height = null,
  alignment = 'center',
  caption = '',
}) => ({
  type: 'image',
  assetId: assetId || '',
  src: src || '',
  alt: alt || 'Document Image',
  width: width || null,
  height: height || null,
  alignment: ['left', 'right'].includes(alignment) ? alignment : 'center',
  caption: caption || '',
});

export const createPageBreakNode = () => ({
  type: 'pageBreak',
});

export const createListNode = ({
  ordered = false,
  items = [],
}) => ({
  type: 'list',
  ordered: Boolean(ordered),
  items: Array.isArray(items) ? items : [],
});

export const createDocumentIR = ({
  metadata = {},
  pageSettings = {},
  nodes = [],
  assets = [],
}) => ({
  metadata: {
    title: metadata.title || 'Untitled Document',
    sourceFormat: metadata.sourceFormat || 'docx',
    pageCount: Math.max(1, Number(metadata.pageCount) || 1),
    author: metadata.author || '',
    createdAt: metadata.createdAt || new Date().toISOString(),
  },
  pageSettings: {
    size: ['a4', 'legal', 'letter'].includes(pageSettings.size?.toLowerCase()) ? pageSettings.size.toLowerCase() : 'letter',
    orientation: pageSettings.orientation === 'landscape' ? 'landscape' : 'portrait',
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
  createListNode,
  createDocumentIR,
};
