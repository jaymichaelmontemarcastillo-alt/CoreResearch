import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { HocuspocusProvider } from '@hocuspocus/provider';
import { auth } from '../../services/firebase';
import { documentStore } from '../../services/documentStore';

// A simple hash function for assigning colors based on user ID
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
  onEditorReady, 
  onCollaboratorsChange, 
  onSaveStatusChange 
}) => {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!documentId) return;

    let hocuspocusProvider = null;
    let isSubscribed = true;

    const setupProvider = async () => {
      let token = `dev-token-${userProfile?.uid || 'guest'}-${userProfile?.role || 'student'}`;
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        }
      } catch (e) {
        // Fallback
      }

      const wsUrl = import.meta.env.PROD 
        ? `wss://${window.location.host}/collaboration`
        : 'ws://localhost:5000/collaboration';

      try {
        hocuspocusProvider = new HocuspocusProvider({
          url: wsUrl,
          name: documentId,
          document: ydoc,
          token: token,
          quiet: true,
          onStatus: (data) => {
            if (!isSubscribed) return;
            setTimeout(() => {
              if (onSaveStatusChange) {
                onSaveStatusChange(data.status === 'connected' ? 'saved' : 'saving');
              }
            }, 0);
          },
          onMessage: () => {
            if (!isSubscribed) return;
            setTimeout(() => {
              if (onSaveStatusChange) onSaveStatusChange('saving');
              setTimeout(() => {
                if (onSaveStatusChange) onSaveStatusChange('saved');
              }, 500);
            }, 0);
          },
          onAwarenessUpdate: ({ states }) => {
            if (!isSubscribed) return;
            const users = states.map(state => state.user).filter(Boolean);
            const uniqueUsers = [];
            const seen = new Set();
            users.forEach(u => {
              if (!seen.has(u.id)) {
                seen.add(u.id);
                uniqueUsers.push(u);
              }
            });
            setTimeout(() => {
              if (onCollaboratorsChange) onCollaboratorsChange(uniqueUsers);
            }, 0);
          }
        });

        hocuspocusProvider.doc = ydoc;
        if (hocuspocusProvider.awareness) {
          hocuspocusProvider.awareness.doc = ydoc;
        }

        if (isSubscribed) {
          setProvider(hocuspocusProvider);
        }
      } catch (err) {
        console.warn('Hocuspocus provider connection warning:', err);
      }
    };

    setupProvider();

    return () => {
      isSubscribed = false;
      if (hocuspocusProvider) {
        try {
          hocuspocusProvider.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [documentId, userProfile?.uid, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({
        document: ydoc,
      }),
      ...(provider && provider.awareness && provider.doc ? [
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: userProfile?.fullName || userProfile?.first_name || 'Anonymous',
            id: userProfile?.uid || 'unknown-user',
            color: getUserColor(userProfile?.uid || 'unknown-user'),
          },
        }),
      ] : [])
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[1056px] w-[816px] bg-white shadow-lg mx-auto p-12 sm:p-20 ring-1 ring-gray-200 dark:ring-slate-800 text-gray-900 dark:text-gray-900',
      },
    },
  }, [documentId, ydoc, provider]);

  useEffect(() => {
    if (!editor) return;

    if (onEditorReady) {
      onEditorReady(editor);
    }

    // Seed initial template content if Yjs document is empty
    try {
      const fragment = ydoc.getXmlFragment('default');
      if (fragment.length === 0 && editor.isEmpty) {
        const docInfo = documentStore.getDocument(documentId);
        const defaultTitle = docInfo?.title || 'Untitled Document';

        editor.commands.setContent(`
          <h1>${defaultTitle}</h1>
          <p>Welcome to the collaborative research document editor. Start editing your manuscript here...</p>
          <h2>1. Research Background & Context</h2>
          <p>Write your problem statement, literature review, and research methodology in this real-time document workspace.</p>
        `);
      }
    } catch (e) {
      // ignore
    }
  }, [editor, documentId, ydoc]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[800px] text-gray-500">
        Initializing document editor...
      </div>
    );
  }

  return (
    <div className="document-editor-container">
      {/* Editor Styles for Cursors and Document Bounds */}
      <style>{`
        .collaboration-cursor__caret {
          border-left: 2px solid #0d0d0d;
          border-right: 2px solid #0d0d0d;
          margin-left: -2px;
          margin-right: -2px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0;
          color: #fff;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 2px 6px;
          position: absolute;
          top: -1.5em;
          user-select: none;
          white-space: nowrap;
        }

        /* Tiptap Tables */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 1px solid #ced4da;
          padding: 6px 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: #f1f3f5;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }
      `}</style>
      
      <EditorContent editor={editor} />
    </div>
  );
};
