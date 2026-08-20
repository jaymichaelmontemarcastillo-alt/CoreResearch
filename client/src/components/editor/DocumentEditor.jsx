import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import * as Y from 'yjs';
import { DEFAULT_PAGE_SETTINGS } from '../../services/documentStore';

// Custom Tiptap 2 Font Family Extension using TextStyle mark
export const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return {
                style: `font-family: ${attributes.fontFamily}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily) => ({ chain }) => {
        return chain().setMark('textStyle', { fontFamily }).run();
      },
      unsetFontFamily: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom Tiptap 2 Font Size Extension using TextStyle mark
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom LineHeight Extension for Paragraph & Heading blocks
export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },
});

// Custom ParagraphSpacing Extension (spaceBefore & spaceAfter)
export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          spaceBefore: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.spaceBefore) return {};
              return {
                style: `margin-top: ${attributes.spaceBefore}`,
              };
            },
          },
          spaceAfter: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.spaceAfter) return {};
              return {
                style: `margin-bottom: ${attributes.spaceAfter}`,
              };
            },
          },
        },
      },
    ];
  },
});

// Custom TableCell with background shading & border color support
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {};
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element) => element.style.borderColor || null,
        renderHTML: (attributes) => {
          if (!attributes.borderColor) return {};
          return {
            style: `border-color: ${attributes.borderColor}`,
          };
        },
      },
    };
  },
});

// Custom Image with explicit width/height & alignment
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; max-width: 100%; height: auto;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height') || null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes) => {
          return {
            'data-alignment': attributes.alignment || 'center',
            class: `image-align-${attributes.alignment || 'center'}`,
          };
        },
      },
      caption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-caption') || '',
        renderHTML: (attributes) => {
          if (!attributes.caption) return {};
          return { 'data-caption': attributes.caption };
        },
      },
    };
  },
});

// A simple hash function for assigning distinct collaborator colors
const getUserColor = (userId) => {
  const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
  let hash = 0;
  const str = String(userId || 'user');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const DocumentEditor = ({ 
  documentId, 
  userProfile, 
  ydoc,
  provider,
  pageSettings = DEFAULT_PAGE_SETTINGS,
  initialContent = null,
  sourceType = 'native',
  onEditorReady,
  onContentChange,
}) => {
  const effectiveUser = useMemo(() => ({
    name: userProfile?.fullName || userProfile?.first_name || 'Researcher',
    id: userProfile?.uid || 'user-1',
    color: getUserColor(userProfile?.uid || 'user-1'),
  }), [userProfile]);

  const extensions = useMemo(() => {
    const list = [
      StarterKit.configure({
        history: false, // Managed by Yjs collaboration
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CustomImage.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
    ];

    if (ydoc) {
      list.push(
        Collaboration.configure({
          document: ydoc,
        })
      );
    }

    if (provider && provider.awareness && provider.doc) {
      try {
        list.push(
          CollaborationCursor.configure({
            provider: provider,
            user: effectiveUser,
          })
        );
      } catch (err) {
        console.warn('CollaborationCursor initialization warning:', err);
      }
    }

    return list;
  }, [ydoc, provider, effectiveUser]);

  const editor = useEditor({
    extensions,
    onUpdate: ({ editor: currentEditor }) => {
      if (onContentChange) {
        onContentChange(currentEditor);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none bg-white text-gray-900 shadow-xl transition-all duration-200 border border-gray-200/80 dark:border-slate-800 ring-1 ring-black/5',
      },
    },
  }, [documentId, extensions]);

  useEffect(() => {
    if (!editor) return;

    if (onEditorReady) {
      onEditorReady(editor);
    }

    try {
      if (ydoc) {
        const fragment = ydoc.getXmlFragment('default');
        const isFragmentEmpty = fragment.length === 0;

        if (initialContent && (isFragmentEmpty || editor.isEmpty)) {
          editor.commands.setContent(initialContent);
        } else if (isFragmentEmpty && editor.isEmpty && sourceType === 'native' && !initialContent) {
          editor.commands.setContent(`
            <h1>Research Manuscript Title</h1>
            <p>Welcome to the CoreResearch collaborative manuscript editor. Start drafting your research proposal or manuscript chapters here...</p>
            <h2>1. Introduction & Background</h2>
            <p>State your research rationale, problem formulation, and objectives.</p>
            <h2>2. Methodology</h2>
            <p>Describe your system architecture, data collection procedures, and evaluation metrics.</p>
          `);
        }
      }
    } catch (e) {
      console.warn('[DocumentEditor] initialContent load warning:', e);
    }
  }, [editor, ydoc, initialContent, sourceType]);

  // Compute paper dimension styles based on pageSettings
  const pageStyle = useMemo(() => {
    const isLandscape = pageSettings?.orientation === 'landscape';
    let width = 816; // Letter 8.5in in px (96 DPI)
    let minHeight = 1056; // Letter 11in in px

    if (pageSettings?.size === 'a4') {
      width = 794; // 8.27in
      minHeight = 1123; // 11.69in
    } else if (pageSettings?.size === 'legal') {
      width = 816;
      minHeight = 1344; // 14in
    }

    if (isLandscape) {
      const temp = width;
      width = minHeight;
      minHeight = temp;
    }

    const padding = `${pageSettings?.marginTop || '1in'} ${pageSettings?.marginRight || '1in'} ${pageSettings?.marginBottom || '1in'} ${pageSettings?.marginLeft || '1in'}`;

    return {
      width: `${width}px`,
      minHeight: `${minHeight}px`,
      padding,
    };
  }, [pageSettings]);

  if (!editor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-sm font-medium">Initializing manuscript editor...</span>
      </div>
    );
  }

  return (
    <div className="document-editor-container flex justify-center py-6">
      {/* Editor CSS styles for ProseMirror, Carets, Selection, Tables, Page Breaks, and Image alignment */}
      <style>{`
        .ProseMirror {
          width: ${pageStyle.width};
          min-height: ${pageStyle.minHeight};
          padding: ${pageStyle.padding};
          box-sizing: border-box;
          margin: 0 auto;
          background: #ffffff;
          font-family: inherit;
        }

        .ProseMirror:focus {
          outline: none;
        }

        /* Real-time Collaboration Carets & Labels */
        .collaboration-cursor__caret {
          border-left: 2px solid #2563eb;
          border-right: 2px solid #2563eb;
          margin-left: -2px;
          margin-right: -2px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #ffffff;
          font-size: 11px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 2px 6px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          pointer-events: none;
        }

        /* Tiptap Tables Styling */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5em 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 2em;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: 600;
          text-align: left;
          background-color: #f8fafc;
          border-bottom: 2px solid #94a3b8;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(59, 130, 246, 0.15);
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: #3b82f6;
          pointer-events: none;
        }

        /* Real Physical Multi-Page Separation (Google Docs / MS Word Print Layout) */
        .ProseMirror hr,
        .ProseMirror .page-break {
          display: block;
          box-sizing: content-box;
          height: 48px;
          background-color: #f8f9fa !important;
          margin: ${pageSettings?.marginBottom || '1in'} -${pageSettings?.marginRight || '1in'} ${pageSettings?.marginTop || '1in'} -${pageSettings?.marginLeft || '1in'} !important;
          border: none !important;
          border-top: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.08),
            0 4px 6px -4px rgba(0, 0, 0, 0.05),
            inset 0 6px 10px -3px rgba(0, 0, 0, 0.07), 
            inset 0 -6px 10px -3px rgba(0, 0, 0, 0.07) !important;
          position: relative;
          cursor: default;
          user-select: none;
          z-index: 10;
        }

        .ProseMirror hr::after,
        .ProseMirror .page-break::after {
          content: "PAGE BREAK • NEXT PAGE";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #ffffff;
          color: #475569;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 4px 14px;
          border-radius: 9999px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
          pointer-events: none;
        }

        :is(.dark) .ProseMirror hr,
        :is(.dark) .ProseMirror .page-break {
          background-color: #020617 !important;
          border-top: 1px solid #334155 !important;
          border-bottom: 1px solid #334155 !important;
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.5),
            inset 0 6px 10px -3px rgba(0, 0, 0, 0.5), 
            inset 0 -6px 10px -3px rgba(0, 0, 0, 0.5) !important;
        }

        :is(.dark) .ProseMirror hr::after,
        :is(.dark) .ProseMirror .page-break::after {
          background: #0f172a;
          color: #94a3b8;
          border: 1px solid #334155;
        }

        /* Image alignment helpers */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 1rem 0;
          display: block;
        }
        .ProseMirror img.image-align-center {
          margin-left: auto;
          margin-right: auto;
        }
        .ProseMirror img.image-align-left {
          margin-right: auto;
        }
        .ProseMirror img.image-align-right {
          margin-left: auto;
        }

        /* Manuscript typography defaults */
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.25;
          margin-top: 1rem;
          margin-bottom: 0.75rem;
          color: #0f172a;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #1e293b;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.35;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #334155;
        }
        .ProseMirror p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.625;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
      `}</style>
      
      <EditorContent editor={editor} />
    </div>
  );
};

export default DocumentEditor;
