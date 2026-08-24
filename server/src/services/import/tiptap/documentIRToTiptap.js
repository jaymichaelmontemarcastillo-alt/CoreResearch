// server/src/services/import/tiptap/documentIRToTiptap.js

/**
 * Converts Document IR into authoritative ProseMirror / Tiptap JSON compatible with CoreResearch DocumentEditor
 * Guarantees zero 'undefined' properties so Firestore never rejects the document.
 */
export class DocumentIRToTiptap {
  /**
   * @param {DocumentIR} ir
   * @param {Map<string, string>} assetUrlMap - Map of assetId -> resolved storage URL
   * @returns {{ tiptapJson: Object, contentHtml: string, plainText: string }}
   */
  convert(ir, assetUrlMap = new Map()) {
    const content = [];
    const textPieces = [];
    const htmlPieces = [];

    if (Array.isArray(ir.nodes)) {
      ir.nodes.forEach((node) => {
        const tiptapNode = this.convertNode(node, assetUrlMap, textPieces, htmlPieces);
        if (tiptapNode) {
          if (Array.isArray(tiptapNode)) {
            content.push(...tiptapNode);
          } else {
            content.push(tiptapNode);
          }
        }
      });
    }

    // Ensure at least one paragraph exists in the doc
    if (content.length === 0) {
      content.push({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [],
      });
    }

    // Strip any potential undefined values for safe Firestore persistence
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

  convertNode(node, assetUrlMap, textPieces, htmlPieces) {
    if (!node) return null;

    switch (node.type) {
      case 'heading': {
        const marksContent = this.convertRuns(node.runs);
        const textOnly = node.runs?.map((r) => r.text).join('') || '';
        textPieces.push(textOnly);

        const styleAttrs = [];
        if (node.alignment) styleAttrs.push(`text-align: ${node.alignment}`);
        if (node.lineSpacing) styleAttrs.push(`line-height: ${node.lineSpacing}`);
        if (node.spaceBefore) styleAttrs.push(`margin-top: ${node.spaceBefore}`);
        if (node.spaceAfter) styleAttrs.push(`margin-bottom: ${node.spaceAfter}`);

        const styleStr = styleAttrs.length > 0 ? ` style="${styleAttrs.join('; ')}"` : '';
        htmlPieces.push(`<h${node.level}${styleStr}>${this.escapeHtml(textOnly)}</h${node.level}>`);

        const headingNode = {
          type: 'heading',
          attrs: {
            level: node.level || 1,
            textAlign: node.alignment || 'left',
            lineHeight: node.lineSpacing || null,
            spaceBefore: node.spaceBefore || null,
            spaceAfter: node.spaceAfter || null,
          },
        };
        if (marksContent.length > 0) {
          headingNode.content = marksContent;
        }
        return headingNode;
      }

      case 'paragraph': {
        // If it's part of a list, wrap in list item
        if (node.listType) {
          return this.convertListNode(node, textPieces, htmlPieces);
        }

        const marksContent = this.convertRuns(node.runs);
        const textOnly = node.runs?.map((r) => r.text).join('') || '';
        if (textOnly) textPieces.push(textOnly);

        const styleAttrs = [];
        if (node.alignment) styleAttrs.push(`text-align: ${node.alignment}`);
        if (node.lineSpacing) styleAttrs.push(`line-height: ${node.lineSpacing}`);
        if (node.spaceBefore) styleAttrs.push(`margin-top: ${node.spaceBefore}`);
        if (node.spaceAfter) styleAttrs.push(`margin-bottom: ${node.spaceAfter}`);
        if (node.indentation?.firstLine) styleAttrs.push(`text-indent: ${node.indentation.firstLine}`);
        if (node.indentation?.left) styleAttrs.push(`margin-left: ${node.indentation.left}`);

        const styleStr = styleAttrs.length > 0 ? ` style="${styleAttrs.join('; ')}"` : '';
        htmlPieces.push(`<p${styleStr}>${this.escapeHtml(textOnly)}</p>`);

        const pNode = {
          type: 'paragraph',
          attrs: {
            textAlign: node.alignment || 'left',
            lineHeight: node.lineSpacing || null,
            spaceBefore: node.spaceBefore || null,
            spaceAfter: node.spaceAfter || null,
          },
        };
        if (marksContent.length > 0) {
          pNode.content = marksContent;
        }
        return pNode;
      }

      case 'list': {
        const listType = node.ordered ? 'orderedList' : 'bulletList';
        const items = (node.items || []).map((item) => {
          const itemNode = this.convertNode(item, assetUrlMap, textPieces, htmlPieces);
          return {
            type: 'listItem',
            content: Array.isArray(itemNode) ? itemNode : [itemNode || { type: 'paragraph', content: [] }],
          };
        });

        return {
          type: listType,
          content: items,
        };
      }

      case 'table': {
        const rows = [];
        htmlPieces.push('<table>');

        if (Array.isArray(node.rows)) {
          node.rows.forEach((row) => {
            const cells = [];
            htmlPieces.push('<tr>');

            if (Array.isArray(row.cells)) {
              row.cells.forEach((cell, cellIdx) => {
                const cellType = cell.isHeader ? 'tableHeader' : 'tableCell';
                const cellContent = [];

                if (Array.isArray(cell.content)) {
                  cell.content.forEach((cellNode) => {
                    const cTiptap = this.convertNode(cellNode, assetUrlMap, textPieces, []);
                    if (cTiptap) {
                      if (Array.isArray(cTiptap)) cellContent.push(...cTiptap);
                      else cellContent.push(cTiptap);
                    }
                  });
                }

                if (cellContent.length === 0) {
                  cellContent.push({ type: 'paragraph', content: [] });
                }

                const colWidth = Array.isArray(node.colWidths) && node.colWidths[cellIdx] ? [node.colWidths[cellIdx]] : null;

                htmlPieces.push(cell.isHeader ? '<th>' : '<td>');
                htmlPieces.push(cell.isHeader ? '</th>' : '</td>');

                cells.push({
                  type: cellType,
                  attrs: {
                    colspan: cell.colSpan || 1,
                    rowspan: cell.rowSpan || 1,
                    colwidth: colWidth,
                    backgroundColor: cell.backgroundColor || null,
                    borderColor: cell.borderColor || null,
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
        const resolvedSrc = assetUrlMap.get(node.assetId) || node.src || '';
        htmlPieces.push(`<img src="${resolvedSrc}" alt="${this.escapeHtml(node.alt || '')}" style="width: ${node.width ? `${node.width}px` : 'auto'};" />`);

        return {
          type: 'image',
          attrs: {
            src: resolvedSrc,
            alt: node.alt || 'Document Image',
            title: node.alt || '',
            width: node.width || null,
            height: node.height || null,
            alignment: node.alignment || 'center',
            caption: node.caption || '',
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

  convertListNode(pNode, textPieces, htmlPieces) {
    const listTag = pNode.listType === 'ordered' ? 'ol' : 'ul';
    const listSchemaType = pNode.listType === 'ordered' ? 'orderedList' : 'bulletList';
    const marksContent = this.convertRuns(pNode.runs);
    const textOnly = pNode.runs?.map((r) => r.text).join('') || '';
    if (textOnly) textPieces.push(textOnly);

    htmlPieces.push(`<${listTag}><li>${this.escapeHtml(textOnly)}</li></${listTag}>`);

    const paragraphInside = {
      type: 'paragraph',
      attrs: {
        textAlign: pNode.alignment || 'left',
        lineHeight: pNode.lineSpacing || null,
      },
    };
    if (marksContent.length > 0) {
      paragraphInside.content = marksContent;
    }

    return {
      type: listSchemaType,
      content: [
        {
          type: 'listItem',
          content: [paragraphInside],
        },
      ],
    };
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

      // TextStyle mark (FontFamily, FontSize, Color, LineHeight)
      const textStyleAttrs = {};
      if (run.fontFamily) textStyleAttrs.fontFamily = run.fontFamily;
      if (run.fontSize) textStyleAttrs.fontSize = run.fontSize;
      if (run.color) textStyleAttrs.color = run.color;
      if (run.lineHeight) textStyleAttrs.lineHeight = run.lineHeight;

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

export default DocumentIRToTiptap;
