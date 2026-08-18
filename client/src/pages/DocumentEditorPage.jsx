import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DocumentEditor } from '../components/editor/DocumentEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { EditorMenuBar } from '../components/editor/EditorMenuBar';
import { CommentsPanel } from '../components/editor/CommentsPanel';
import { ShareDialog } from '../components/editor/ShareDialog';
import { Button } from '../components/ui/Button';
import { Users, Share2, MessageSquare, ChevronLeft, Save } from 'lucide-react';

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [editor, setEditor] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [showComments, setShowComments] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [title, setTitle] = useState('Untitled Document');

  // In a real implementation, you would fetch document metadata from Firestore here

  if (!userProfile) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6 lg:-m-8 bg-[#f8f9fa] dark:bg-slate-950 overflow-hidden">
      {/* Top Header Row (Google Docs style) */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} className="px-2 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-10 h-10 rounded text-blue-600 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            {/* Minimal Doc Icon */}
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          
          <div className="flex flex-col min-w-0">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:bg-gray-100 dark:focus:bg-slate-800 rounded px-1 -ml-1 truncate max-w-[200px] sm:max-w-xs"
            />
            <EditorMenuBar editor={editor} />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden sm:flex items-center text-xs text-gray-500 mr-2">
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'error' ? (
              <span className="text-red-500">Error saving</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400"><Save className="w-3.5 h-3.5" /> Saved</span>
            )}
          </div>
          
          {/* Active Collaborators */}
          <div className="hidden md:flex items-center -space-x-2">
            {collaborators.map((user, i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.charAt(0)}
              </div>
            ))}
          </div>

          <Button 
            variant={showComments ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className={showComments ? '' : 'text-gray-600'}
            title="Toggle comments"
          >
            <MessageSquare className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Comments</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => setShowShareModal(true)} className="rounded-full px-4 sm:px-6 shadow-sm">
            <Share2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline font-medium tracking-wide">Share</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 p-1 flex justify-center z-10 shrink-0">
        <EditorToolbar editor={editor} />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-slate-950 flex justify-center pb-20 custom-scrollbar">
          {/* Page Container */}
          <div className="mt-8 mb-12">
            <DocumentEditor 
              documentId={documentId} 
              userProfile={userProfile} 
              onEditorReady={setEditor}
              onCollaboratorsChange={setCollaborators}
              onSaveStatusChange={setSaveStatus}
            />
          </div>
        </div>

        {/* Right Sidebar - Comments */}
        {showComments && (
          <div className="w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 overflow-y-auto flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-10">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <CommentsPanel documentId={documentId} editor={editor} />
            </div>
          </div>
        )}
      </div>

      {showShareModal && (
        <ShareDialog 
          documentId={documentId} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
};
