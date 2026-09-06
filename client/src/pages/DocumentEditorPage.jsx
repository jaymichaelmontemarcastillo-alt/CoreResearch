import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OnlyOfficeEditor } from '../components/editor/OnlyOfficeEditor';
import { Button } from '../components/ui/Button';
import { 
  HiChevronLeft, 
  HiChevronRight, 
  HiCheckCircle, 
  HiArrowsPointingOut, 
  HiArrowsPointingIn
} from 'react-icons/hi2';
import { documentStore } from '../services/documentStore';

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams();
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [title, setTitle] = useState('Research Manuscript');
  const [isMaximized, setIsMaximized] = useState(false);
  const titleSaveTimeoutRef = useRef(null);

  // Load authoritative document metadata
  useEffect(() => {
    if (!documentId) return;

    let isMounted = true;
    const loadDocumentData = async () => {
      try {
        let docData = await documentStore.fetchDocument(documentId);
        if (isMounted && docData && docData.title) {
          setTitle(docData.title);
        }
      } catch (err) {
        console.warn('Failed to load document metadata:', err);
      }
    };

    loadDocumentData();

    // Subscribe to real-time metadata updates
    const unsubscribe = documentStore.subscribeDocument(documentId, (docData) => {
      if (!isMounted || !docData) return;
      if (docData.title) setTitle(docData.title);
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [documentId]);

  // Keyboard shortcut listener for Escape to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }
    titleSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await documentStore.updateDocumentTitle(documentId, newTitle);
      } catch (err) {
        console.warn('Title update error:', err);
      }
    }, 1000);
  };

  return (
    <div className={`flex flex-col flex-1 w-full bg-[#f8f9fa] dark:bg-slate-950 overflow-hidden transition-all ${
      isMaximized 
        ? 'fixed inset-0 z-[60] w-screen h-screen m-0 p-0' 
        : 'h-[calc(100vh-4rem)]'
    }`}>
      
      {/* Top Header Row */}
      <div className="relative flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(location.state?.from || '/documents')} className="px-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <HiChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-9 h-9 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          
          <div className="flex flex-col min-w-0">
            <input 
              type="text" 
              value={title}
              onChange={handleTitleChange}
              placeholder="Document Title"
              className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-gray-50 dark:focus:bg-slate-800 rounded px-1.5 py-0.5 -ml-1.5 outline-none truncate max-w-[200px] sm:max-w-xs transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:flex items-center text-xs text-gray-500">
            <span className="flex items-center gap-1 text-gray-400">
              <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Synced via ONLYOFFICE
            </span>
          </div>

          {/* Maximize / Minimize Fullscreen Toggle Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsMaximized(!isMaximized)}
            className={`rounded-full p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-xs ${
              isMaximized ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' : ''
            }`}
            title={isMaximized ? "Exit full screen (Minimize)" : "Maximize editor (Full screen)"}
          >
            {isMaximized ? (
              <HiArrowsPointingIn className="w-4 h-4" />
            ) : (
              <HiArrowsPointingOut className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Document Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 w-full h-full">
          <OnlyOfficeEditor documentId={documentId} />
        </div>
      </div>
    </div>
  );
};

export default DocumentEditorPage;
