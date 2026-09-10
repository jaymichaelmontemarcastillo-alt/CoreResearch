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
  HiArrowsPointingIn,
  HiArrowUpTray,
  HiChevronUp,
  HiChevronDown
} from 'react-icons/hi2';
import { documentStore } from '../services/documentStore';
import documentImportService from './Documents/services/documentImportService';

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams();
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [title, setTitle] = useState('Research Manuscript');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHeightMaximized, setIsHeightMaximized] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const titleSaveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

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

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMaximized(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut listener for Escape to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isHeightMaximized) setIsHeightMaximized(false);
        // Browser handles Escape for Native Fullscreen, so we don't need to manually exit it here.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHeightMaximized]);

  // Manage DOM for height maximization
  useEffect(() => {
    const systemHeader = document.querySelector('header');
    if (systemHeader) {
      if (isHeightMaximized) {
        systemHeader.style.display = 'none';
      } else {
        systemHeader.style.display = '';
      }
    }
    return () => {
      if (systemHeader) systemHeader.style.display = '';
    };
  }, [isHeightMaximized]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    try {
      await documentImportService.importDocument({
        file,
        userProfile,
        documentId: documentId,
        onProgress: (p) => console.log(`Import progress: ${p}%`)
      });
      // Reload the window to ensure ONLYOFFICE resets completely and loads the new file
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import document: " + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

    const searchParams = new URLSearchParams(location.search);
    const isPanelistMode = searchParams.get('mode') === 'panelist' || userProfile?.role === 'panelist';

    return (
      <div 
        ref={containerRef}
        className={`flex flex-col flex-1 w-auto bg-white dark:bg-slate-900 overflow-hidden transition-all relative ${
        isMaximized 
          ? 'w-screen h-screen m-0 p-0 rounded-none border-none' 
          : isHeightMaximized
            ? 'h-[calc(100vh-1.5rem)] m-3 rounded-2xl border border-gray-200/90 dark:border-[#222433] shadow-xl shadow-gray-200/50 dark:shadow-black/60'
            : 'h-[calc(100vh-4rem-1.5rem)] m-3 rounded-2xl border border-gray-200/90 dark:border-[#222433] shadow-xl shadow-gray-200/50 dark:shadow-black/60'
      }`}>
        
        {/* Hidden file input for import */}
        <input 
          type="file" 
          accept=".docx" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />

        {/* Top Header Row - always visible */}
        <div className="relative flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 z-20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(location.state?.from || (isPanelistMode ? '/panelists' : '/documents'))} className="px-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <HiChevronLeft className="w-5 h-5" />
              </Button>
              
              <div className="w-9 h-9 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </div>
              
              <div className="flex flex-col min-w-0">
                {isPanelistMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-xs">
                      {title || 'Research Manuscript'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Read-Only
                    </span>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Document Title"
                    className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 bg-transparent border border-transparent hover:border-gray-200 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-gray-50 dark:focus:bg-slate-800 rounded px-1.5 py-0.5 -ml-1.5 outline-none truncate max-w-[200px] sm:max-w-xs transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:flex items-center text-xs text-gray-500">
                <span className="flex items-center gap-1 text-gray-400">
                  <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Synced via ONLYOFFICE
                </span>
              </div>

              {/* Import Document Button - Hidden in Panelist Review Mode */}
              {!isPanelistMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Import local .docx file"
                >
                  <HiArrowUpTray className="w-4 h-4" />
                  <span className="hidden lg:inline">{isImporting ? 'Importing...' : 'Import'}</span>
                </Button>
              )}

              {/* Height Maximize (Up/Down Arrow) Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHeightMaximized(!isHeightMaximized)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg shadow-xs"
                title={isHeightMaximized ? "Restore system headers" : "Maximize height (hide system headers)"}
              >
                {isHeightMaximized ? <HiChevronDown className="w-4 h-4" /> : <HiChevronUp className="w-4 h-4" />}
              </Button>

              <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1"></div>

              {/* Maximize / Minimize Fullscreen Toggle Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleFullScreen}
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

        {/* Panelist Review Mode Banner */}
        {isPanelistMode && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-medium">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span><strong>Panelist Review Mode:</strong> You have view and comment privileges only. Direct editing of the manuscript is restricted.</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Comment Only
            </span>
          </div>
        )}

        {/* Main Document Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 w-full h-full p-0">
            <OnlyOfficeEditor documentId={documentId} mode={isPanelistMode ? 'panelist' : 'edit'} />
          </div>
        </div>
      </div>
    );
};

export default DocumentEditorPage;
