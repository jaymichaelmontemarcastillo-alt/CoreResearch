// src/pages/Documents/utils/documentFormatters.js

/**
 * Parses HTML or text to generate structured preview nodes for miniature paper rendering.
 * Extracts title, subtitle, headings, and paragraph blocks.
 */
export const extractPreviewStructure = (htmlOrText, docTitle = '') => {
  if (!htmlOrText && !docTitle) {
    return {
      title: 'Untitled Document',
      headings: [],
      paragraphs: ['Click to start writing your manuscript...'],
    };
  }

  // If HTML string is available, parse using DOMParser
  if (typeof htmlOrText === 'string' && (htmlOrText.includes('<') || htmlOrText.includes('>'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${htmlOrText}</div>`, 'text/html');
      
      const elements = Array.from(doc.body.firstChild?.children || []);
      const structured = [];

      for (const el of elements.slice(0, 12)) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent?.trim();
        if (!text) continue;

        if (tag === 'h1') {
          structured.push({ type: 'h1', text });
        } else if (tag === 'h2') {
          structured.push({ type: 'h2', text });
        } else if (tag === 'h3') {
          structured.push({ type: 'h3', text });
        } else if (tag === 'p') {
          structured.push({ type: 'p', text });
        } else if (tag === 'ul' || tag === 'ol') {
          const items = Array.from(el.children).map(li => li.textContent?.trim()).filter(Boolean);
          structured.push({ type: 'list', items: items.slice(0, 4) });
        } else if (tag === 'table') {
          structured.push({ type: 'table', rows: 3 });
        }
      }

      if (structured.length > 0) {
        return {
          title: docTitle || structured.find(s => s.type === 'h1')?.text || 'Untitled Document',
          items: structured,
        };
      }
    } catch (e) {
      console.warn('HTML preview parsing fallback:', e);
    }
  }

  // Plain text fallback
  const rawText = typeof htmlOrText === 'string' ? htmlOrText : '';
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const fallbackItems = lines.slice(0, 8).map((line, idx) => {
    if (idx === 0 && line.length < 80) return { type: 'h2', text: line };
    return { type: 'p', text: line };
  });

  return {
    title: docTitle || lines[0] || 'Untitled Document',
    items: fallbackItems.length > 0 ? fallbackItems : [{ type: 'p', text: 'Document content is ready for review.' }],
  };
};
