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
import { auth } from '../../services/firebase'; // Ensure Firebase auth is available

// A simple hash function for assigning colors based on user ID
const getUserColor = (userId) => {
  const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const DocumentEditor = ({ documentId, userProfile, onEditorReady, onCollaboratorsChange, onSaveStatusChange }) => {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!documentId || !userProfile) return;

    // We get the Firebase Auth token to authenticate the WebSocket connection
    const setupProvider = async () => {
      let token = '';
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        } else {
          // Development fallback
          token = `dev-token-${userProfile.uid}-${userProfile.role}`;
        }
      } catch (e) {
        console.warn('Failed to get auth token, using fallback', e);
        token = `dev-token-${userProfile.uid}-${userProfile.role}`;
      }

      const ydoc = new Y.Doc();
      
      // Determine WebSocket URL based on environment
      const wsUrl = import.meta.env.PROD 
        ? `wss://${window.location.host}/collaboration`
        : 'ws://localhost:5000/collaboration';

      const hocuspocusProvider = new HocuspocusProvider({
        url: wsUrl,
        name: documentId,
        document: ydoc,
        token: token,
        onStatus: (data) => {
          if (data.status === 'connected') {
            onSaveStatusChange('saved');
          } else {
            onSaveStatusChange('saving');
          }
        },
        onMessage: () => {
          // Whenever a message comes in or goes out, we can briefly show a "saving" state
          onSaveStatusChange('saving');
          setTimeout(() => onSaveStatusChange('saved'), 500);
        },
        onAwarenessUpdate: ({ states }) => {
          const users = states.map(state => state.user).filter(Boolean);
          // Deduplicate by user ID
          const uniqueUsers = [];
          const seen = new Set();
          users.forEach(u => {
            if (!seen.has(u.id)) {
              seen.add(u.id);
              uniqueUsers.push(u);
            }
          });
          onCollaboratorsChange(uniqueUsers);
        }
      });

      setProvider(hocuspocusProvider);
    };

    setupProvider();

    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [documentId, userProfile]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // History is handled by Yjs
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Only include collaboration extensions if the provider is ready
      ...(provider ? [
        Collaboration.configure({
          document: provider.document,
        }),
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
    content: '', // Initial content is provided by Yjs
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[1056px] w-[816px] bg-white shadow-lg mx-auto p-12 sm:p-20 ring-1 ring-gray-200 dark:ring-slate-800',
      },
    },
  }, [provider]); // Re-initialize editor when provider is ready

  useEffect(() => {
    if (editor) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor || !provider) {
    return <div className="flex items-center justify-center min-h-[800px] text-gray-500">Connecting to collaborative editor...</div>;
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
