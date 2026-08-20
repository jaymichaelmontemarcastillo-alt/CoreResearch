// src/pages/Documents/import/tiptap/documentIRToTiptap.js

/**
 * Client-Side DocumentIR to Tiptap ProseMirror Schema Converter
 * Guarantees zero 'undefined' properties so Firestore never rejects the document.
 */
export class ClientDocumentIRToTiptap {
  convert(ir) {
    const content = [];
    const textPieces = [];
    const htmlPieces = [];

    if (Array.isArray(ir.nodes)) {
      ir.nodes.forEach((node) => {
        const tiptapNode = this.convertNode(node, textPieces, htmlPieces);
        if (tiptapNode) {
          if (Array.isArray(tiptapNode)) {
            content.push(...tiptapNode);
          } else {
            content.push(tiptapNode);
          }
        }
      });
    }

    if (content.length === 0) {
      content.push({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [],
      });
    }

    const cleanDoc = JSON.parse(JSON.stringify({
      type: 'doc',
      content,
    }));

    const plainText = textPieces.join('\n\n').trim();
    const contentHtml = htmlPieces.join('\n');

    return {
      tiptapJson: cleanDoc,
      contentHtml,
      plainText,
    };
  }

  convertNode(node, textPieces, htmlPieces) {
    if (!node) return null;

    switch (node.type) {
      case 'heading': {
        const marksContent = this.convertRuns(node.runs);
        const textOnly = node.runs?.map((r) => r.text).join('') || '';
        textPieces.push(textOnly);
        htmlPieces.push(`<h${node.level}>${this.escapeHtml(textOnly)}</h${node.level}>`);

        const headingNode = {
          type: 'heading',
          attrs: {
            level: node.level || 1,
            textAlign: node.alignment || 'left',
          },
        };
        if (marksContent.length > 0) {
          headingNode.content = marksContent;
        }
        return headingNode;
      }

      case 'paragraph': {
        const marksContent = this.convertRuns(node.runs);
        const textOnly = node.runs?.map((r) => r.text).join('') || '';
        if (textOnly) textPieces.push(textOnly);
        htmlPieces.push(`<p style="text-align: ${node.alignment || 'left'}">${this.escapeHtml(textOnly)}</p>`);

        const pNode = {
          type: 'paragraph',
          attrs: {
            textAlign: node.alignment || 'left',
          },
        };
        if (marksContent.length > 0) {
          pNode.content = marksContent;
        }
        return pNode;
      }

      case 'table': {
        const rows = [];
        htmlPieces.push('<table>');

        if (Array.isArray(node.rows)) {
          node.rows.forEach((row) => {
            const cells = [];
            htmlPieces.push('<tr>');

            if (Array.isArray(row.cells)) {
              row.cells.forEach((cell) => {
                const cellType = cell.isHeader ? 'tableHeader' : 'tableCell';
                const cellContent = [];

                if (Array.isArray(cell.content)) {
                  cell.content.forEach((cellNode) => {
                    const cTiptap = this.convertNode(cellNode, textPieces, []);
                    if (cTiptap) {
                      if (Array.isArray(cTiptap)) cellContent.push(...cTiptap);
                      else cellContent.push(cTiptap);
                    }
                  });
                }

                if (cellContent.length === 0) {
                  cellContent.push({ type: 'paragraph', content: [] });
                }

                htmlPieces.push(cell.isHeader ? '<th>' : '<td>');
                htmlPieces.push(cell.isHeader ? '</th>' : '</td>');

                cells.push({
                  type: cellType,
                  attrs: {
                    colspan: cell.colSpan || 1,
                    rowspan: cell.rowSpan || 1,
                    colwidth: null,
                  },
                  content: cellContent,
                });
              });
            }

            htmlPieces.push('</tr>');
            rows.push({
              type: 'tableRow',
              content: cells,
            });
          });
        }

        htmlPieces.push('</table>');

        return {
          type: 'table',
          content: rows,
        };
      }

      case 'image': {
        htmlPieces.push(`<img src="${node.src || ''}" alt="${this.escapeHtml(node.alt || '')}" />`);
        return {
          type: 'image',
          attrs: {
            src: node.src || '',
            alt: node.alt || 'Document Image',
            title: node.alt || '',
          },
        };
      }

      case 'pageBreak': {
        htmlPieces.push('<hr class="page-break" />');
        return {
          type: 'horizontalRule',
        };
      }

      default:
        return null;
    }
  }

  convertRuns(runs) {
    if (!Array.isArray(runs)) return [];
    const textNodes = [];

    runs.forEach((run) => {
      if (!run || !run.text) return;

      const marks = [];

      if (run.bold) marks.push({ type: 'bold' });
      if (run.italic) marks.push({ type: 'italic' });
      if (run.underline) marks.push({ type: 'underline' });
      if (run.strike) marks.push({ type: 'strike' });
      if (run.subscript) marks.push({ type: 'subscript' });
      if (run.superscript) marks.push({ type: 'superscript' });

      const textStyleAttrs = {};
      if (run.fontFamily) textStyleAttrs.fontFamily = run.fontFamily;
      if (run.fontSize) textStyleAttrs.fontSize = run.fontSize;
      if (run.color) textStyleAttrs.color = run.color;

      if (Object.keys(textStyleAttrs).length > 0) {
        marks.push({
          type: 'textStyle',
          attrs: textStyleAttrs,
        });
      }

      if (run.highlight) {
        marks.push({
          type: 'highlight',
          attrs: { color: run.highlight },
        });
      }

      const textNode = {
        type: 'text',
        text: run.text,
      };

      if (marks.length > 0) {
        textNode.marks = marks;
      }

      textNodes.push(textNode);
    });

    return textNodes;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const clientDocumentIRToTiptap = new ClientDocumentIRToTiptap();
export default clientDocumentIRToTiptap;
