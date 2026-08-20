// src/pages/Documents/services/documentPreviewService.js
import { extractPreviewStructure } from '../utils/documentFormatters';

export const documentPreviewService = {
  /**
   * Generates a lightweight preview model from document data.
   */
  getPreviewModel: (document) => {
    if (!document) {
      return {
        title: 'Untitled Document',
        items: [{ type: 'p', text: 'Empty document' }],
      };
    }

    // 1. Direct preview image if present
    if (document.previewUrl) {
      return {
        type: 'image',
        url: document.previewUrl,
        title: document.title || document.fileName || 'Document',
      };
    }

    // 2. Format from HTML content or plain text
    const content = document.contentHtml || document.plainText || '';
    const title = document.title || document.fileName || 'Untitled Document';
    const structured = extractPreviewStructure(content, title);

    return {
      type: 'structured',
      title,
      items: structured.items || [],
      sourceType: document.sourceType || 'native',
    };
  },
};
