// server/src/services/import/tiptap/documentIRToTiptap.js
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { FontSize, LineSpacing, Indentation, HorizontalRule } from './customExtensions.js';
import sanitizeHtml from 'sanitize-html';
import * as cheerio from 'cheerio';

export const getTiptapExtensions = () => [
  StarterKit.configure({
    // Disable extensions bundled in StarterKit v3 that we register
    // explicitly below with custom configuration/attributes
    horizontalRule: false,
    link: false,
    underline: false,
  }),
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  Underline,
  Superscript,
  Subscript,
  Link.configure({
    openOnClick: false,
    autolink: true,
  }),
  TextStyle,
  FontFamily,
  Color,
  FontSize,
  LineSpacing,
  Indentation,
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];

export class DocumentIRToTiptap {
  /**
   * Converts DocumentIR nodes to an HTML representation
   * @param {Array} nodes
   * @param {Map<string, string>} assetUrlMap
   * @returns {string}
   */
  convertNodesToHtml(nodes = [], assetUrlMap = new Map()) {
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const serializeRuns = (runs = []) => {
      return runs.map(run => {
        let text = escapeHtml(run.text || '');
        if (!text) return '';
        if (run.bold) text = `<strong>${text}</strong>`;
        if (run.italic) text = `<em>${text}</em>`;
        if (run.underline) text = `<u>${text}</u>`;
        if (run.strike) text = `<s>${text}</s>`;
        if (run.superscript) text = `<sup>${text}</sup>`;
        if (run.subscript) text = `<sub>${text}</sub>`;

        const styles = [];
        if (run.fontFamily) styles.push(`font-family: ${run.fontFamily}`);
        if (run.fontSize) styles.push(`font-size: ${run.fontSize}`);
        if (run.color) styles.push(`color: ${run.color}`);

        if (styles.length > 0) {
          text = `<span style="${styles.join('; ')}">${text}</span>`;
        }
        return text;
      }).join('');
    };

    const htmlChunks = [];

    for (const node of nodes) {
      if (node.type === 'heading') {
        const level = node.level || 1;
        const align = node.alignment && node.alignment !== 'left' ? ` style="text-align: ${node.alignment}"` : '';
        htmlChunks.push(`<h${level}${align}>${serializeRuns(node.runs)}</h${level}>`);
      } else if (node.type === 'paragraph') {
        const align = node.alignment && node.alignment !== 'left' ? ` style="text-align: ${node.alignment}"` : '';
        const content = serializeRuns(node.runs);
        htmlChunks.push(`<p${align}>${content || '&nbsp;'}</p>`);
      } else if (node.type === 'pageBreak') {
        htmlChunks.push('<hr class="page-break" />');
      } else if (node.type === 'image') {
        const url = assetUrlMap.get(node.assetId) || node.src || '';
        htmlChunks.push(`<img src="${url}" alt="${escapeHtml(node.alt || '')}" />`);
      } else if (node.type === 'table') {
        let tableHtml = '<table><tbody>';
        for (const row of node.rows || []) {
          tableHtml += '<tr>';
          for (const cell of row.cells || []) {
            const tag = cell.isHeader ? 'th' : 'td';
            const spanAttrs = [];
            if (cell.colSpan > 1) spanAttrs.push(`colspan="${cell.colSpan}"`);
            if (cell.rowSpan > 1) spanAttrs.push(`rowspan="${cell.rowSpan}"`);
            const inner = this.convertNodesToHtml(cell.content || [], assetUrlMap);
            tableHtml += `<${tag} ${spanAttrs.join(' ')}>${inner || '&nbsp;'}</${tag}>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        htmlChunks.push(tableHtml);
      }
    }

    return htmlChunks.join('\n');
  }

  /**
   * Converts HTML string, DocumentIR nodes, and asset URLs to Tiptap JSON Schema
   * @param {Object|string} data - { html } or { nodes, pageSettings } or raw HTML string
   * @param {Map<string, string>} assetUrlMap - Map of assetId -> resolved storage URL
   * @returns {{ tiptapJson: Object, contentHtml: string, plainText: string, pageLayout: Object }}
   */
  convert(data, assetUrlMap = new Map()) {
    const pageLayout = { size: null, margin: null };
    let rawHtml = '';

    if (typeof data === 'string') {
      rawHtml = data;
    } else if (data?.html) {
      rawHtml = data.html;
    } else if (Array.isArray(data?.nodes)) {
      rawHtml = this.convertNodesToHtml(data.nodes, assetUrlMap);
      if (data?.pageSettings) {
        pageLayout.size = data.pageSettings.size || null;
        pageLayout.margin = data.pageSettings.marginTop || null;
      }
    } else {
      rawHtml = '<p></p>';
    }
    
    // 0. Extract page layout from LibreOffice @page CSS if present
    if (rawHtml) {
      const pageStyleMatch = rawHtml.match(/@page\s*{([^}]+)}/i);
      if (pageStyleMatch) {
        const pageProps = pageStyleMatch[1];
        const sizeMatch = pageProps.match(/size:\s*([^;]+)/i);
        const marginMatch = pageProps.match(/margin:\s*([^;]+)/i);
        if (sizeMatch) pageLayout.size = sizeMatch[1].trim();
        if (marginMatch) pageLayout.margin = marginMatch[1].trim();
      }
    }

    // 1. Replace data-asset-id with real URLs using Cheerio for robustness
    const $img = cheerio.load(rawHtml || '<p></p>', null, false);
    $img('img').each(function() {
      const assetId = $img(this).attr('data-asset-id');
      if (assetId && assetUrlMap.has(assetId)) {
        $img(this).attr('src', assetUrlMap.get(assetId));
        $img(this).removeAttr('data-asset-id');
      }
    });
    const processedHtml = $img.html() || '<p></p>';

    // 2. Sanitize HTML
    let cleanHtml;
    try {
      cleanHtml = sanitizeHtml(processedHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 's', 'u', 'a',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
          'ul', 'ol', 'li', 'blockquote', 'sup', 'sub', 'figcaption'
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ['href', 'title', 'target'],
          img: ['src', 'alt', 'width', 'height'],
          th: ['colspan', 'rowspan'],
          td: ['colspan', 'rowspan'],
          p: ['style', 'class'],
          span: ['style', 'class'],
          hr: ['class'],
          h1: ['style', 'class'],
          h2: ['style', 'class'],
          h3: ['style', 'class'],
          h4: ['style', 'class'],
          h5: ['style', 'class'],
          h6: ['style', 'class']
        },
        allowedSchemes: ['http', 'https', 'data'],
      });
    } catch (e) {
      throw new Error(`Sanitization failed: ${e.message}`);
    }

    // 3. Normalization (Req 8)
    try {
      const $ = cheerio.load(cleanHtml, null, false);
      
      // Remove empty paragraphs
      $('p').each(function() {
        const text = $(this).text().trim();
        const hasImg = $(this).find('img').length > 0;
        if (text === '' && !hasImg) {
          $(this).remove();
        }
      });
      
      // Handle LibreOffice Page Breaks (usually inline style page-break-before: always)
      $('*[style*="page-break-before"]').each(function() {
        const style = $(this).attr('style');
        if (style && (style.includes('page-break-before: always') || style.includes('page-break-before:always'))) {
           $(this).before('<hr class="page-break">');
           // Remove the style so it doesn't cause issues
           $(this).attr('style', style.replace(/page-break-before\s*:\s*always;?/i, ''));
        }
      });

      // Remove inline styles we don't support, keep text-align and formatting
      $('[style]').each(function() {
        const style = $(this).attr('style');
        if (style) {
          const supportedStyles = [];
          const styles = style.split(';').map(s => s.trim()).filter(Boolean);
          styles.forEach(s => {
            if (
              s.startsWith('text-align') ||
              s.startsWith('font-family') ||
              s.startsWith('font-size') ||
              s.startsWith('color') ||
              s.startsWith('line-height') ||
              s.startsWith('margin-bottom') ||
              s.startsWith('margin-left') ||
              s.startsWith('text-indent') ||
              s.startsWith('font-weight') ||
              s.startsWith('font-style') ||
              s.startsWith('text-decoration')
            ) {
              supportedStyles.push(s);
            }
          });
          
          if (supportedStyles.length > 0) {
            $(this).attr('style', supportedStyles.join('; '));
          } else {
            $(this).removeAttr('style');
          }
        }
      });
      
      // Convert Mammoth alignment classes to Tiptap text-align styles
      $('.align-center').css('text-align', 'center').removeClass('align-center');
      $('.align-right').css('text-align', 'right').removeClass('align-right');
      $('.align-justify').css('text-align', 'justify').removeClass('align-justify');

      cleanHtml = $.html();
    } catch (e) {
      console.warn('[DocumentIRToTiptap] Normalization warning:', e.message);
    }

    // 4. Generate Tiptap JSON
    let tiptapJson;
    try {
      tiptapJson = generateJSON(cleanHtml, getTiptapExtensions());
      
      // Ensure at least one paragraph exists if empty (Tiptap schema requirement)
      if (!tiptapJson.content || tiptapJson.content.length === 0) {
        tiptapJson.content = [{ type: 'paragraph' }];
      }
    } catch (e) {
      throw new Error(`Tiptap conversion failed: ${e.message}`);
    }
    
    // 5. Extract plain text
    const extractText = (node) => {
      let text = '';
      if (node.type === 'text') {
        text += node.text;
      } else if (node.type === 'image') {
        text += ' [Image] ';
      }
      if (node.content) {
        node.content.forEach((child) => {
          text += extractText(child);
        });
      }
      if (node.type === 'paragraph' || node.type?.startsWith('heading')) {
        text += '\n\n';
      }
      return text;
    };

    const plainText = extractText(tiptapJson).trim();

    return {
      tiptapJson,
      contentHtml: cleanHtml,
      plainText,
      pageLayout
    };
  }
}

export default DocumentIRToTiptap;
