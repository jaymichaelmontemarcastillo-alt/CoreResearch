import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Extension, Mark, mergeAttributes } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
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
import { AutoPagination, paginationPluginKey } from './extensions/AutoPagination';

// Custom CommentMark Extension for Google Docs style anchored manuscript comments
export const CommentMark = Mark.create({
  name: 'comment',
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return {
            'data-comment-id': attributes.commentId,
            class: 'coreresearch-comment-highlight',
          };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'coreresearch-comment-highlight' }), 0];
  },
});

export const activeCommentsPluginKey = new PluginKey('activeCommentsPlugin');

function buildCommentDecorations(doc, comments = []) {
  if (!doc || !comments || comments.length === 0) {
    return DecorationSet.empty;
  }

  const activeComments = comments.filter(
    (c) => !c.resolved && c.selectedText && c.selectedText.trim().length > 0
  );

  if (activeComments.length === 0) {
    return DecorationSet.empty;
  }

  const decorations = [];
  const fullDocText = doc.textBetween(0, doc.content.size, ' ');

  activeComments.forEach((comment) => {
    const textToFind = comment.selectedText.trim();
    if (!textToFind) return;

    let foundRange = null;

    // 1. Search text nodes
    doc.descendants((node, pos) => {
      if (foundRange !== null) return false;
      if (node.isText && node.text) {
        const idx = node.text.indexOf(textToFind);
        if (idx !== -1) {
          foundRange = { from: pos + idx, to: pos + idx + textToFind.length };
          return false;
        }
      }
      return true;
    });

    // 2. Fallback: Search cross-node text
    if (!foundRange) {
      const matchIdx = fullDocText.indexOf(textToFind);
      if (matchIdx !== -1) {
        let currentOffset = 0;
        let startPos = null;
        let endPos = null;
        doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const nodeEnd = currentOffset + node.text.length;
            if (startPos === null && matchIdx >= currentOffset && matchIdx < nodeEnd) {
              startPos = pos + (matchIdx - currentOffset);
            }
            const matchEnd = matchIdx + textToFind.length;
            if (endPos === null && matchEnd > currentOffset && matchEnd <= nodeEnd) {
              endPos = pos + (matchEnd - currentOffset);
            }
            currentOffset = nodeEnd + 1;
          }
          return startPos === null || endPos === null;
        });

        if (startPos !== null && endPos !== null && startPos < endPos) {
          foundRange = { from: startPos, to: endPos };
        }
      }
    }

    if (foundRange && foundRange.from < foundRange.to && foundRange.to <= doc.content.size) {
      decorations.push(
        Decoration.inline(foundRange.from, foundRange.to, {
          class: 'coreresearch-comment-highlight',
          'data-comment-id': comment.id,
          style: 'cursor: pointer;',
        })
      );
    }
  });

  try {
    return DecorationSet.create(doc, decorations);
  } catch (e) {
    console.warn('[ActiveCommentsPlugin] DecorationSet creation warning:', e);
    return DecorationSet.empty;
  }
}

export const createActiveCommentsExtension = (getComments) => {
  return Extension.create({
    name: 'activeComments',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: activeCommentsPluginKey,
          state: {
            init(_, { doc }) {
              return buildCommentDecorations(doc, getComments());
            },
            apply(tr, oldDecos, oldState, newState) {
              if (tr.docChanged || tr.getMeta(activeCommentsPluginKey)) {
                return buildCommentDecorations(newState.doc, getComments());
              }
              return oldDecos.map(tr.mapping, tr.doc);
            },
          },
          props: {
            decorations(state) {
              return this.getState(state);
            },
          },
        }),
      ];
    },
  });
};

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

// Custom ParagraphIndent Extension (textIndent & marginLeft)
export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',
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
          textIndent: {
            default: null,
            parseHTML: (element) => element.style.textIndent || null,
            renderHTML: (attributes) => {
              if (!attributes.textIndent) return {};
              return {
                style: `text-indent: ${attributes.textIndent}`,
              };
            },
          },
          marginLeft: {
            default: null,
            parseHTML: (element) => element.style.marginLeft || null,
            renderHTML: (attributes) => {
              if (!attributes.marginLeft) return {};
              return {
                style: `margin-left: ${attributes.marginLeft}`,
              };
            },
          },
        },
      },
    ];
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return this.editor.commands.command(({ tr, state, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty) return false;

          if ($from.parentOffset === 0 && ($from.parent.type.name === 'paragraph' || $from.parent.type.name === 'heading')) {
            if (dispatch) {
              tr.setNodeMarkup($from.before(), null, { ...$from.parent.attrs, textIndent: '0.5in' });
            }
            return true;
          }

          if (dispatch) {
            tr.insertText('\u00a0\u00a0\u00a0\u00a0');
          }
          return true;
        });
      },
      'Shift-Tab': () => {
        return this.editor.commands.command(({ tr, state, dispatch }) => {
          const { $from, empty } = state.selection;
          if (!empty) return false;

          if ($from.parent.type.name === 'paragraph' || $from.parent.type.name === 'heading') {
            const currentIndent = $from.parent.attrs.textIndent;
            if (currentIndent) {
              if (dispatch) {
                tr.setNodeMarkup($from.before(), null, { ...$from.parent.attrs, textIndent: null });
              }
              return true;
            }
          }
          return false;
        });
      },
    };
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
  title = '',
  comments = [],
  isReadOnly = false,
  onEditorReady,
  onContentChange,
  onCommentSelect,
  previewingVersion,
}) => {
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const [pageCount, setPageCount] = React.useState(1);

  const effectiveUser = useMemo(() => ({
    name: userProfile?.fullName || userProfile?.first_name || 'Researcher',
    id: userProfile?.uid || 'user-1',
    color: getUserColor(userProfile?.uid || 'user-1'),
  }), [userProfile]);

  const activeCommentsExt = useMemo(() => {
    return createActiveCommentsExtension(() => commentsRef.current);
  }, []);

  const extensions = useMemo(() => {
    let rawHeight = 1056;
    if (pageSettings?.size === 'a4') rawHeight = 1123;
    else if (pageSettings?.size === 'legal') rawHeight = 1344;
    
    if (pageSettings?.orientation === 'landscape') {
      rawHeight = pageSettings?.size === 'a4' ? 794 : 816;
    }

    const parseMargin = (val) => {
      if (!val) return 96;
      if (val.includes('in')) return parseFloat(val) * 96;
      if (val.includes('px')) return parseFloat(val);
      if (val.includes('cm')) return parseFloat(val) * 37.8;
      return 96;
    };

    const contentHeight = rawHeight - parseMargin(pageSettings?.marginTop) - parseMargin(pageSettings?.marginBottom);

    const list = [
      StarterKit.configure({
        history: previewingVersion ? true : false, // Managed by Yjs collaboration normally, but enable locally for preview mode
      }),
      AutoPagination.configure({
        contentHeight: contentHeight > 200 ? contentHeight : 864,
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      ParagraphIndent,
      Color,
      Highlight.configure({ multicolor: true }),
      activeCommentsExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CustomImage.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      CustomTableCell,
    ];

    if (ydoc && !previewingVersion) {
      list.push(
        Collaboration.configure({
          document: ydoc,
        })
      );
    }

    if (provider && provider.awareness && provider.doc && !previewingVersion) {
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
  }, [ydoc, provider, effectiveUser, activeCommentsExt, previewingVersion]);

  const editor = useEditor({
    extensions,
    editable: !isReadOnly,
    onUpdate: ({ editor: currentEditor }) => {
      if (onContentChange) {
        onContentChange(currentEditor);
      }
    },
    onTransaction: ({ editor: currentEditor }) => {
      const state = paginationPluginKey.getState(currentEditor.state);
      if (state && state.pageCount !== undefined) {
        setPageCount((prev) => (prev !== state.pageCount ? state.pageCount : prev));
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none bg-white text-gray-900 shadow-xl transition-all duration-200 border border-gray-200/80 dark:border-slate-800 ring-1 ring-black/5',
      },
    },
  }, [documentId, extensions]);

  // Update decorations when comments change
  useEffect(() => {
    commentsRef.current = comments;
    if (editor && !editor.isDestroyed && editor.view) {
      try {
        const { state, dispatch } = editor.view;
        const tr = state.tr.setMeta(activeCommentsPluginKey, { comments });
        dispatch(tr);
      } catch (e) {
        // ignore
      }
    }
  }, [editor, comments]);

  // Detect click on commented text highlight to focus comment in sidebar
  useEffect(() => {
    if (!editor || !editor.view?.dom) return;

    const handleEditorClick = (e) => {
      const highlightElem = e.target.closest('[data-comment-id]');
      if (highlightElem) {
        const commentId = highlightElem.getAttribute('data-comment-id');
        if (commentId && onCommentSelect) {
          onCommentSelect(commentId);
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('click', handleEditorClick);
    return () => {
      dom.removeEventListener('click', handleEditorClick);
    };
  }, [editor, onCommentSelect]);

  const initializedContentRef = useRef(false);

  useEffect(() => {
    if (!editor) return;

    if (onEditorReady) {
      onEditorReady(editor);
    }

    try {
      if (initialContent && !initializedContentRef.current) {
        editor.commands.setContent(initialContent, false);
        initializedContentRef.current = true;
      } else if (ydoc) {
        const fragment = ydoc.getXmlFragment('default');
        const isFragmentEmpty = fragment.length === 0;

        if (initialContent && (isFragmentEmpty || editor.isEmpty)) {
          editor.commands.setContent(initialContent, false);
          initializedContentRef.current = true;
        } else if (isFragmentEmpty && editor.isEmpty && sourceType === 'native' && !initialContent && !initializedContentRef.current) {
          const heading = title && title !== 'Untitled Document' ? title : '';
          if (heading) {
            editor.commands.setContent(`<h1>${heading}</h1><p></p>`, false);
          } else {
            editor.commands.setContent(`<p></p>`, false);
          }
          initializedContentRef.current = true;
        }
      }

      // Clean up any legacy baked comment marks from document content
      if (editor.state?.schema?.marks?.comment) {
        const { tr } = editor.state;
        let hasCommentMarks = false;
        editor.state.doc.descendants((node, pos) => {
          if (node.isText && node.marks) {
            node.marks.forEach((mark) => {
              if (mark.type.name === 'comment') {
                hasCommentMarks = true;
                tr.removeMark(pos, pos + node.nodeSize, mark.type);
              }
            });
          }
        });
        if (hasCommentMarks) {
          editor.view.dispatch(tr);
        }
      }
    } catch (e) {
      console.warn('[DocumentEditor] initialContent load warning:', e);
    }
  }, [editor, ydoc, initialContent, sourceType]);

  // Handle previewing a specific version
  useEffect(() => {
    if (editor && previewingVersion) {
      // Temporarily set content to the version snapshot
      editor.commands.setContent(previewingVersion.content, false);
    }
  }, [editor, previewingVersion]);

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

    const gapHeight = 48; // Must match CSS hr/page-break height
    const totalMinHeight = minHeight * pageCount + gapHeight * (pageCount - 1);

    return {
      width: `${width}px`,
      minHeight: `${totalMinHeight}px`,
      padding,
    };
  }, [pageSettings, pageCount]);

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
          text-align: left;
        }

        .ProseMirror:focus {
          outline: none;
        }

        /* Google Docs style Comment Highlight & Hover */
        .ProseMirror .coreresearch-comment-highlight {
          background-color: rgba(254, 240, 138, 0.75);
          border-bottom: 2px solid #eab308;
          border-radius: 2px;
          padding: 1px 0;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        :is(.dark) .ProseMirror .coreresearch-comment-highlight {
          background-color: rgba(113, 63, 18, 0.45);
          border-bottom: 2px solid #ca8a04;
        }

        .ProseMirror .coreresearch-comment-highlight:hover {
          background-color: rgba(253, 224, 71, 0.95);
        }

        /* Active Comment Highlight Glow when navigated to from sidebar */
        .ProseMirror .coreresearch-comment-active {
          background-color: rgba(251, 191, 36, 0.95) !important;
          outline: 2px solid #f59e0b;
          outline-offset: 1px;
          border-radius: 2px;
          animation: commentGlow 2.5s ease-out;
        }

        @keyframes commentGlow {
          0% {
            background-color: rgba(251, 191, 36, 1);
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.85);
          }
          40% {
            background-color: rgba(253, 230, 138, 0.95);
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
          }
          100% {
            background-color: rgba(254, 240, 138, 0.75);
            box-shadow: none;
          }
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
