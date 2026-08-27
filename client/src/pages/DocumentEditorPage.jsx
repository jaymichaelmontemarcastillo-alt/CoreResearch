// src/pages/DocumentEditorPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DocumentEditor } from '../components/editor/DocumentEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { EditorMenuBar } from '../components/editor/EditorMenuBar';
import { CommentsPanel } from '../components/editor/CommentsPanel';
import { VersionControlPanel } from '../components/editor/VersionControlPanel';
import { FloatingCommentPopover } from '../components/editor/FloatingCommentPopover';
import { ShareDialog } from '../components/editor/ShareDialog';
import { PageSettingsModal } from '../components/editor/PageSettingsModal';
import { Button } from '../components/ui/Button';
import { 
  HiChevronLeft, 
  HiChevronRight, 
  HiCloud, 
  HiCheckCircle, 
  HiExclamationCircle, 
  HiArrowsPointingOut, 
  HiArrowsPointingIn, 
  HiXMark,
  HiSquares2X2, 
  HiDocumentCheck, 
  HiFolder, 
  HiDocumentText, 
  HiBuildingLibrary, 
  HiCalendar, 
  HiAcademicCap,
  HiChatBubbleLeftRight,
  HiShare,
  HiClock
} from 'react-icons/hi2';

import { documentStore, DEFAULT_PAGE_SETTINGS } from '../services/documentStore';
import * as Y from 'yjs';

class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Editor component error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 my-8">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Editor Error</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            The document editor encountered an error. Click below to reload the editor instance.
          </p>
          {this.state.error && (
            <div className="bg-red-50 text-red-600 text-xs p-2 rounded max-w-lg overflow-auto mb-4 text-left font-mono">
              {this.state.error.message}
            </div>
          )}
          <Button 
            variant="primary" 
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Reload Editor
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams();
  const { userProfile, currentUser, role, currentFacultyMode } = useAuth();
  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;
  const isFaculty = effectiveRole === 'adviser' || effectiveRole === 'panelist';
  const navigate = useNavigate();
  const location = useLocation();
  
  const [editor, setEditor] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [activeRightPanel, setActiveRightPanel] = useState(null); // 'comments' | 'versionControl' | null
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPageSettingsModal, setShowPageSettingsModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [title, setTitle] = useState('Untitled Document');
  const [pageSettings, setPageSettings] = useState(DEFAULT_PAGE_SETTINGS);
  const [initialContent, setInitialContent] = useState(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [sourceType, setSourceType] = useState('native');
  const [comments, setComments] = useState([]);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [previewingVersion, setPreviewingVersion] = useState(null);
  const [pendingRestoreContent, setPendingRestoreContent] = useState(null);
  const [pendingRestoreVersionLabel, setPendingRestoreVersionLabel] = useState(null);
  
  // Fullscreen Maximize & Drawer Sidebar state
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMaximizedSidebarOpen, setIsMaximizedSidebarOpen] = useState(false);

  // Stable Yjs Document per documentId
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  // Collaborative Provider State
  const [providerState, setProviderState] = useState({
    provider: null,
    status: 'connecting', // 'connecting', 'connected', 'disconnected', 'cloud-sync'
    error: null
  });

  const effectiveUserProfile = userProfile || {
    uid: currentUser?.uid || 'guest-user',
    fullName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
    first_name: userProfile?.first_name || 'Researcher',
    role: userProfile?.role || 'student'
  };

  const autoSaveTimeoutRef = useRef(null);
  const titleSaveTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  const myUidRef = useRef(effectiveUserProfile.uid);
  const isTypingRef = useRef(false);
  const providerStatusRef = useRef(providerState.status);

  // Keep refs in sync with state
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    myUidRef.current = effectiveUserProfile.uid;
  }, [effectiveUserProfile.uid]);

  useEffect(() => {
    providerStatusRef.current = providerState.status;
  }, [providerState.status]);

  // Keyboard shortcut listener for Escape to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        if (isMaximizedSidebarOpen) {
          setIsMaximizedSidebarOpen(false);
        } else if (!showShareModal && !showPageSettingsModal) {
          setIsMaximized(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized, isMaximizedSidebarOpen, showShareModal, showPageSettingsModal]);

  // 1. Load authoritative document metadata, settings & content from Firestore with real-time sync
  useEffect(() => {
    if (!documentId) return;

    let isMounted = true;
    
    // Initial fetch
    const loadDocumentData = async () => {
      try {
        let docData = await documentStore.fetchDocument(documentId);

        // Auto-create document in Firestore if opening newly
        if (!docData) {
          docData = await documentStore.createDocument('Research Manuscript', effectiveUserProfile, {
            id: documentId,
          });
        }

        if (isMounted && docData) {
          setTitle(docData.title || 'Research Manuscript');
          setSourceType(docData.sourceType || 'native');
          if (docData.editorSettings?.page) {
            setPageSettings(docData.editorSettings.page);
          }
          let contentToLoad = docData.content || docData.contentHtml || null;
          // Resilient fallback to localStorage if Firestore content is null or empty
          if (!contentToLoad) {
            try {
              const cached = localStorage.getItem(`coreresearch_doc_content_${documentId}`);
              if (cached) {
                contentToLoad = JSON.parse(cached);
              }
            } catch (e) {}
          }
          if (contentToLoad) {
            setInitialContent(contentToLoad);
          }
          setDocumentLoaded(true);
        }
      } catch (err) {
        console.warn('Failed to load document from Firestore:', err);
        if (isMounted) {
          try {
            const cached = localStorage.getItem(`coreresearch_doc_content_${documentId}`);
            if (cached) {
              setInitialContent(JSON.parse(cached));
            }
          } catch (e) {}
          setDocumentLoaded(true);
        }
      }
    };

    loadDocumentData();

    // Subscribe to real-time updates from other group members (works seamlessly on Firebase Hosting!)
    const unsubscribe = documentStore.subscribeDocument(documentId, (docData) => {
      if (!isMounted || !docData) return;

      if (docData.title) setTitle(docData.title);
      if (docData.editorSettings?.page) {
        setPageSettings(docData.editorSettings.page);
      }

      // If Hocuspocus is active, ignore incoming document content updates from Firestore
      // to avoid dual-sync race conditions. Firestore is just a 1-way backup at this point.
      if (providerStatusRef.current === 'connected') {
        return;
      }

      // Check if update originated from another collaborator
      const isFromOtherUser = docData.updatedBy && docData.updatedBy !== myUidRef.current;
      if (isFromOtherUser && docData.content) {
        const activeEditor = editorRef.current;
        if (activeEditor && !activeEditor.isDestroyed && !isTypingRef.current) {
          try {
            const currentStr = JSON.stringify(activeEditor.getJSON());
            const remoteStr = JSON.stringify(docData.content);
            if (currentStr !== remoteStr) {
              activeEditor.commands.setContent(docData.content, false);
            }
          } catch (syncErr) {
            console.warn('[RealtimeSync] Remote update application notice:', syncErr);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [documentId]);

  // 1b. Subscribe to comments in real-time for document text highlighting & vice-versa sync
  useEffect(() => {
    if (!documentId) return;
    const unsubscribe = documentStore.subscribeComments(documentId, (fetched) => {
      setComments(fetched || []);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [documentId]);

  // 2. Setup stable Hocuspocus collaboration provider lifecycle
  useEffect(() => {
    if (!documentId || !ydoc) return;
    
    let isSubscribed = true;
    let hocuspocusProvider = null;
    
    const isProduction = import.meta.env.PROD;
    const wsUrl = import.meta.env.VITE_HOCUSPOCUS_URL || (isProduction 
      ? 'wss://coreresearch-api-lspu-40301844.onrender.com/collaboration' 
      : 'ws://localhost:5000/collaboration');
    setProviderState({ provider: null, status: 'connecting', error: null });

    const initProvider = async () => {
      let token = `dev-token-${effectiveUserProfile.uid}-${effectiveUserProfile.role}`;
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          if (idToken) token = idToken;
        } catch (e) {
          // fallback
        }
      }

      if (!isSubscribed) return;

      try {
        const { HocuspocusProvider } = await import('@hocuspocus/provider');

        if (!isSubscribed) return;

        hocuspocusProvider = new HocuspocusProvider({
          url: wsUrl,
          name: `document-${documentId}`,
          document: ydoc,
          token: token,
          broadcast: false,
          maxAttempts: 3,
          timeout: 4000,
          parameters: {
            userId: effectiveUserProfile.uid,
            role: effectiveUserProfile.role,
            documentId: documentId
          },
          onStatus: (data) => {
            if (!isSubscribed) return;
            if (data.status === 'connected') {
              setProviderState(prev => ({ ...prev, status: 'connected', error: null }));
            } else if (data.status === 'disconnected') {
              setProviderState(prev => ({ ...prev, status: 'cloud-sync' }));
            } else if (data.status === 'connecting') {
              setProviderState(prev => ({ ...prev, status: 'connecting' }));
            }
          },
          onClose: () => {
            if (isSubscribed) {
              setProviderState(prev => ({ ...prev, status: 'cloud-sync' }));
            }
          },
          onMessage: () => {
            if (!isSubscribed) return;
          },
          onAwarenessUpdate: ({ states }) => {
            if (!isSubscribed) return;
            const users = states.map(state => state.user).filter(Boolean);
            const uniqueUsers = [];
            const seen = new Set();
            users.forEach(u => {
              if (u && u.id && !seen.has(u.id)) {
                seen.add(u.id);
                uniqueUsers.push(u);
              }
            });
            setTimeout(() => {
              if (isSubscribed) {
                setCollaborators(uniqueUsers);
              }
            }, 0);
          }
        });

        hocuspocusProvider.doc = ydoc;
        if (hocuspocusProvider.awareness) {
          hocuspocusProvider.awareness.doc = ydoc;
        }

        if (isSubscribed) {
          setProviderState(prev => ({ ...prev, provider: hocuspocusProvider }));
        }
      } catch (err) {
        console.warn('Hocuspocus provider setup notice (falling back to cloud sync):', err);
        if (isSubscribed) {
          setProviderState(prev => ({ ...prev, status: 'cloud-sync', error: null }));
        }
      }
    };
    
    initProvider();

    return () => {
      isSubscribed = false;
      if (hocuspocusProvider) {
        try { hocuspocusProvider.destroy(); } catch (e) {}
      }
    };
  }, [documentId, ydoc, effectiveUserProfile.uid]);

  // 3. Handle Title Editing & Firestore sync
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

  // 4. Handle Editor Content Change & Firestore auto-save
  const handleContentChange = useCallback((editorOrJson) => {
    isTypingRef.current = true;
    setSaveStatus('saving');

    const activeEditor = editorOrJson?.getJSON ? editorOrJson : editor;
    const json = activeEditor?.getJSON ? activeEditor.getJSON() : (editorOrJson && typeof editorOrJson === 'object' ? editorOrJson : null);
    const html = activeEditor?.getHTML ? activeEditor.getHTML() : '';
    const plainText = activeEditor?.getText ? activeEditor.getText() : '';

    // Immediately cache in localStorage so reload never loses edits
    if (json) {
      try {
        localStorage.setItem(`coreresearch_doc_content_${documentId}`, JSON.stringify(json));
      } catch (e) {}
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await documentStore.saveDocumentContent(documentId, json, html, plainText, effectiveUserProfile);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save document:', err);
        setSaveStatus('error');
      } finally {
        isTypingRef.current = false;
      }
    }, 800);
  }, [documentId, editor, effectiveUserProfile]);

  // Flush unsaved content on hard refresh or window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const activeEditor = editorRef.current;
      if (activeEditor && !activeEditor.isDestroyed) {
        try {
          const json = activeEditor.getJSON();
          localStorage.setItem(`coreresearch_doc_content_${documentId}`, JSON.stringify(json));
          const html = activeEditor.getHTML();
          const plainText = activeEditor.getText();
          documentStore.saveDocumentContent(documentId, json, html, plainText, effectiveUserProfile);
        } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [documentId, effectiveUserProfile]);

  // 5. Handle Page Settings Save
  const handleSavePageSettings = async (newSettings) => {
    setPageSettings(newSettings);
    setShowPageSettingsModal(false);
    try {
      await documentStore.savePageSettings(documentId, newSettings);
    } catch (err) {
      console.error('Failed to save page settings:', err);
    }
  };

  const handleEditorReady = (editorInstance) => {
    setEditor(editorInstance);
  };

  // Create new document from file menu
  const handleNewDocument = async () => {
    try {
      const newDoc = await documentStore.createDocument('Untitled Document', effectiveUserProfile);
      if (newDoc?.id) {
        navigate(`/documents/${newDoc.id}`);
      }
    } catch (e) {
      console.error('Failed to create new doc:', e);
    }
  };

  // Resizable Comments panel logic
  const [commentsWidth, setCommentsWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('coreresearch_comments_width');
      return saved ? Math.max(280, Math.min(650, Number(saved))) : 360;
    } catch (e) {
      return 360;
    }
  });

  const [isResizingComments, setIsResizingComments] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(commentsWidth);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizingComments(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = commentsWidth;

    const onPointerMove = (moveEvent) => {
      const deltaX = resizeStartXRef.current - moveEvent.clientX;
      const minWidth = 280;
      const maxWidth = Math.min(650, Math.floor(window.innerWidth * 0.55));
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidthRef.current + deltaX));
      setCommentsWidth(nextWidth);
    };

    const onPointerUp = () => {
      setIsResizingComments(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Persist commentsWidth to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('coreresearch_comments_width', String(commentsWidth));
    } catch (e) {
      // ignore
    }
  }, [commentsWidth]);

  // Restore a previewed version
  const handleRestoreVersion = async () => {
    if (!previewingVersion || !editor) return;
    try {
      // Auto-backup current live state before restoring
      const currentDoc = await documentStore.fetchDocument(documentId);
      if (currentDoc && currentDoc.content) {
         await documentStore.saveVersion(documentId, currentDoc.content, effectiveUserProfile, `Auto-backup before restore`);
      }

      setPendingRestoreContent(previewingVersion.content);
      setPendingRestoreVersionLabel(previewingVersion.label || formatVersionDateTime(previewingVersion.createdAt));
      
      // Clear preview mode to re-enable live collaboration extensions
      setPreviewingVersion(null);
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  // Apply restore content once the editor has re-initialized out of preview mode
  useEffect(() => {
    if (editor && !previewingVersion && pendingRestoreContent) {
      const applyRestore = async () => {
        try {
          editor.commands.setContent(pendingRestoreContent, false);
          const contentJson = editor.getJSON();
          const contentHtml = editor.getHTML();
          const plainText = editor.getText();
          
          await documentStore.saveVersion(documentId, contentJson, effectiveUserProfile, `Restored from ${pendingRestoreVersionLabel}`);
          await documentStore.saveDocumentContent(documentId, contentJson, contentHtml, plainText, effectiveUserProfile);
          
        } catch (e) {
          console.error('Error applying restore:', e);
        } finally {
          setPendingRestoreContent(null);
          setPendingRestoreVersionLabel(null);
        }
      };
      
      // Delay slightly to let Yjs sync initial state before we override it
      const timer = setTimeout(applyRestore, 800);
      return () => clearTimeout(timer);
    }
  }, [editor, previewingVersion, pendingRestoreContent, documentId, effectiveUserProfile, pendingRestoreVersionLabel]);

  const formatVersionDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${month}/${day}/${year} • ${timeStr}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col flex-1 w-full bg-[#f8f9fa] dark:bg-slate-950 overflow-hidden transition-all ${
      isMaximized 
        ? 'fixed inset-0 z-[60] w-screen h-screen m-0 p-0' 
        : 'h-[calc(100vh-4rem)]'
    }`}>
      {/* Hovering Circle Arrow Button to Open Sidebar in Maximized Mode */}
      {isMaximized && (
        <button
          type="button"
          onClick={() => setIsMaximizedSidebarOpen(!isMaximizedSidebarOpen)}
          aria-label="Toggle navigation sidebar"
          title={isMaximizedSidebarOpen ? "Hide navigation" : "Show navigation"}
          className="fixed left-2 sm:left-3 top-1/2 -translate-y-1/2 z-[75] w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-slate-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 focus:outline-none"
        >
          {isMaximizedSidebarOpen ? (
            <HiChevronLeft className="w-5 h-5" />
          ) : (
            <HiChevronRight className="w-5 h-5 ml-0.5" />
          )}
        </button>
      )}

      {/* Floating Slide-out Sidebar Drawer when maximized */}
      {isMaximized && isMaximizedSidebarOpen && (
        <>
          <div 
            onClick={() => setIsMaximizedSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[80] transition-opacity animate-fade-in"
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-2xl z-[85] flex flex-col p-4 animate-slide-right">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  CR
                </div>
                <span className="font-bold text-sm text-gray-900 dark:text-white">CoreResearch</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                title="Close sidebar"
              >
                <HiXMark className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar text-xs py-2">
              <Link
                to="/dashboard"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiSquares2X2 className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/documents"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold transition-colors"
              >
                <HiDocumentText className="w-4 h-4" />
                <span>Documents</span>
              </Link>
              <Link
                to="/proposals"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiDocumentCheck className="w-4 h-4" />
                <span>Proposals</span>
              </Link>
              <Link
                to="/manuscripts"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiFolder className="w-4 h-4" />
                <span>Manuscripts</span>
              </Link>
              <Link
                to="/reviews"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiAcademicCap className="w-4 h-4" />
                <span>Reviews</span>
              </Link>
              <Link
                to="/schedules"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiCalendar className="w-4 h-4" />
                <span>Schedules</span>
              </Link>
              <Link
                to="/repository"
                onClick={() => setIsMaximizedSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <HiBuildingLibrary className="w-4 h-4" />
                <span>Repository</span>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Top Header Row (Google Docs style) */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-10 shrink-0 shadow-sm">
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
            {!isFaculty && (
              <EditorMenuBar 
                editor={editor} 
                title={title}
                onOpenPageSettings={() => setShowPageSettingsModal(true)}
                onNewDocument={handleNewDocument}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Collaboration Connection Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80">
            {providerState.status === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            ) : providerState.status === 'connecting' ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <HiCloud className="w-3.5 h-3.5 text-blue-500" />
                Cloud Saved
              </span>
            )}
          </div>

          {/* Firestore Save Status */}
          <div className="hidden md:flex items-center text-xs text-gray-500">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-blue-500">
                <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1 text-red-500">
                <HiExclamationCircle className="w-3.5 h-3.5" />
                Error saving
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <HiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Saved
              </span>
            )}
          </div>
          
          {/* Active Collaborators Presence */}
          <div className="hidden sm:flex items-center -space-x-1.5">
            {collaborators.map((user, i) => (
              <div 
                key={user.id || i} 
                className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
                style={{ backgroundColor: user.color || '#3b82f6' }}
                title={`${user.name || 'Collaborator'} (${user.role || 'Member'})`}
              >
                {(user.name || 'C').charAt(0).toUpperCase()}
              </div>
            ))}
          </div>


          {/* Share Dialog Button */}
          {!isFaculty && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowShareModal(true)} 
              className="rounded-full px-3 sm:px-5 shadow-sm"
            >
              <HiShare className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs font-semibold tracking-wide">Share</span>
            </Button>
          )}

          {/* Maximize / Minimize Fullscreen Toggle Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsMaximized(!isMaximized);
              setIsMaximizedSidebarOpen(false);
            }}
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

      {/* Editor Toolbar */}
      {!isFaculty && (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-1 flex justify-center z-10 shrink-0">
          <EditorToolbar 
            editor={editor} 
            documentId={documentId}
            onOpenPageSettings={() => setShowPageSettingsModal(true)}
          />
        </div>
      )}

      {/* Main Document Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-slate-950 flex flex-col items-center pb-20 custom-scrollbar mr-1">
          {previewingVersion && (
            <div className="w-full bg-blue-50 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-800 p-3 flex flex-col sm:flex-row items-center justify-center gap-3 shadow-sm z-10 shrink-0">
              <div className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Previewing version from <strong>{formatVersionDateTime(previewingVersion.createdAt)}</strong> by {previewingVersion.createdByName}
              </div>
              <div className="flex items-center gap-2">
                {!isFaculty && (
                  <button
                    onClick={handleRestoreVersion}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                  >
                    Restore This Version
                  </button>
                )}
                <button
                  onClick={() => setPreviewingVersion(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className={`my-6 ${previewingVersion ? 'opacity-80' : ''}`}>
            <EditorErrorBoundary key={documentId}>
              {documentLoaded ? (
                <DocumentEditor 
                  documentId={documentId} 
                  userProfile={effectiveUserProfile} 
                  ydoc={ydoc}
                  provider={providerState.provider}
                  pageSettings={pageSettings}
                  initialContent={initialContent}
                  sourceType={sourceType}
                  title={title}
                  comments={comments}
                  isReadOnly={isFaculty || previewingVersion !== null}
                  previewingVersion={previewingVersion}
                  onCommentSelect={(commentId) => {
                    setHighlightedCommentId(commentId);
                    if (activeRightPanel !== 'comments') {
                      setActiveRightPanel('comments');
                    }
                  }}
                  onEditorReady={handleEditorReady}
                  onContentChange={handleContentChange}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-500">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">Loading Manuscript Document...</div>
                  <div className="text-xs text-gray-400 mt-1">Restoring Firestore state and connecting real-time collaboration</div>
                </div>
              )}
            </EditorErrorBoundary>
          </div>
          
          {/* Google Docs-Style Floating Contextual Comment Action & Composer */}
          {editor && (
            <FloatingCommentPopover
              editor={editor}
              documentId={documentId}
              userProfile={effectiveUserProfile}
              onCommentAdded={() => {
                if (activeRightPanel !== 'comments') {
                  setActiveRightPanel('comments');
                }
              }}
            />
          )}
        </div>

        {/* Right Sidebar - Expanded Panels */}
        {activeRightPanel === 'comments' && (
          <div 
            className="relative shrink-0 h-full border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20 flex flex-col"
            style={{ width: `${commentsWidth}px` }}
          >
            {/* Draggable Resize Divider Handle */}
            <div
              onPointerDown={handleResizeStart}
              title="Drag horizontally to resize panel"
              className={`absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-30 flex items-center justify-center group ${
                isResizingComments ? 'bg-blue-500/20' : ''
              }`}
            >
              <div className={`w-1 h-10 rounded-full transition-colors ${
                isResizingComments 
                  ? 'bg-blue-600' 
                  : 'bg-transparent group-hover:bg-blue-500/60'
              }`} />
            </div>

            <CommentsPanel 
              documentId={documentId} 
              editor={editor} 
              highlightedCommentId={highlightedCommentId}
              onClearHighlight={() => setHighlightedCommentId(null)}
              onClose={() => setActiveRightPanel(null)}
            />
          </div>
        )}

        {activeRightPanel === 'versionControl' && (
          <div 
            className="relative shrink-0 h-full border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20 flex flex-col"
            style={{ width: `${commentsWidth}px` }}
          >
            {/* Draggable Resize Divider Handle */}
            <div
              onPointerDown={handleResizeStart}
              title="Drag horizontally to resize panel"
              className={`absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-30 flex items-center justify-center group ${
                isResizingComments ? 'bg-blue-500/20' : ''
              }`}
            >
              <div className={`w-1 h-10 rounded-full transition-colors ${
                isResizingComments 
                  ? 'bg-blue-600' 
                  : 'bg-transparent group-hover:bg-blue-500/60'
              }`} />
            </div>

            <VersionControlPanel 
              documentId={documentId}
              editor={editor}
              onClose={() => setActiveRightPanel(null)}
              onPreviewVersion={(version) => {
                if (previewingVersion?.id === version.id) {
                  setPreviewingVersion(null);
                } else {
                  setPreviewingVersion(version);
                }
              }}
              previewingVersionId={previewingVersion?.id}
            />
          </div>
        )}

        {/* Compact Right Action Rail */}
        <div className="shrink-0 w-14 border-l border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-4 gap-3 z-30 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]">
          <button 
            onClick={() => setActiveRightPanel(activeRightPanel === 'comments' ? null : 'comments')}
            className={`p-2.5 rounded-xl transition-all ${
              activeRightPanel === 'comments' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100'
            }`}
            title="Comments"
          >
            <HiChatBubbleLeftRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setActiveRightPanel(activeRightPanel === 'versionControl' ? null : 'versionControl')}
            className={`p-2.5 rounded-xl transition-all ${
              activeRightPanel === 'versionControl' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-100'
            }`}
            title="Version Control"
          >
            <HiClock className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      {showShareModal && (
        <ShareDialog 
          documentId={documentId} 
          onClose={() => setShowShareModal(false)} 
        />
      )}

      {/* Page Setup & Margins Modal */}
      <PageSettingsModal
        isOpen={showPageSettingsModal}
        onClose={() => setShowPageSettingsModal(false)}
        pageSettings={pageSettings}
        onSaveSettings={handleSavePageSettings}
      />
    </div>
  );
};
export default DocumentEditorPage;
