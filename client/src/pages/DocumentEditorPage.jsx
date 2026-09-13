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
import researchWorkspaceService from '../services/researchWorkspace.service';
import researchFeedbackService from '../services/researchFeedback.service';

export const DocumentEditorPage = () => {
  const { id: documentId } = useParams();
  const { userProfile, currentUser, currentFacultyMode } = useAuth();
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
    const isPanelist = searchParams.get('mode') === 'panelist' || userProfile?.role === 'panelist' || currentFacultyMode === 'panelist';
    const isAdviser = !isPanelist && (userProfile?.role === 'adviser' || userProfile?.role === 'research_coordinator' || userProfile?.role === 'admin' || (userProfile?.role === 'faculty' && currentFacultyMode !== 'panelist'));
    const isPanelistMode = isPanelist;
    const urlWorkspaceId = searchParams.get('workspaceId');
    const urlChapterId = searchParams.get('chapterId');

    const [workspace, setWorkspace] = useState(null);
    const [activeChapterId, setActiveChapterId] = useState(urlChapterId || '');
    const [approving, setApproving] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [feedbackList, setFeedbackList] = useState([]);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);

    // Subscribe to workspace & feedback if workspaceId is present or document is linked
    useEffect(() => {
      let unsubscribeWs = () => {};
      let unsubscribeFb = () => {};
      const fetchWorkspace = async () => {
        try {
          let wsId = urlWorkspaceId;
          if (!wsId && documentId) {
            const docData = await documentStore.fetchDocument(documentId);
            if (docData?.groupId) {
              const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', docData.groupId);
              if (ws) wsId = ws.id;
            }
          }
          if (wsId) {
            const ws = await researchWorkspaceService.getWorkspaceById(wsId);
            if (ws) {
              setWorkspace(ws);
              if (!activeChapterId && ws.sections?.length > 0) {
                const target = urlChapterId 
                  ? ws.sections.find((s) => s.id === urlChapterId)
                  : ws.sections.find((s) => s.status === 'submitted' || s.status === 'under_review') || ws.sections[0];
                if (target) setActiveChapterId(target.id);
              }
            }
            unsubscribeWs = researchWorkspaceService.subscribeWorkspace(wsId, (updated) => {
              if (updated) setWorkspace(updated);
            });
            unsubscribeFb = researchFeedbackService.subscribeWorkspaceFeedback(wsId, (list) => {
              setFeedbackList(list || []);
            });
          }
        } catch (err) {
          console.warn('[DocumentEditorPage] Error loading workspace:', err);
        }
      };

      fetchWorkspace();
      return () => {
        unsubscribeWs();
        unsubscribeFb();
      };
    }, [urlWorkspaceId, documentId, urlChapterId]);

    const handleApproveChapterInEditor = async () => {
      if (!workspace || !activeChapterId) return;
      const targetSection = (workspace.sections || []).find((s) => s.id === activeChapterId);
      const chapterTitle = targetSection?.name || 'this chapter';

      const confirmApprove = window.confirm(
        `Approve ${chapterTitle}?`
      );
      if (!confirmApprove) return;

      setApproving(true);
      try {
        await researchWorkspaceService.approveChapter(
          workspace.id,
          activeChapterId,
          currentUser.uid,
          currentUser.displayName || userProfile?.fullName || 'Faculty Adviser'
        );
        setToastMessage(`${chapterTitle} approved! Overall progress updated.`);
        setTimeout(() => setToastMessage(''), 4000);
      } catch (err) {
        alert('Failed to approve chapter: ' + err.message);
      } finally {
        setApproving(false);
      }
    };

    const handleRequestRevisionInEditor = async () => {
      if (!workspace || !activeChapterId) return;
      const targetSection = (workspace.sections || []).find((s) => s.id === activeChapterId);
      const chapterTitle = targetSection?.name || 'this chapter';
      const wasApproved = targetSection?.status === 'completed';

      const promptMsg = wasApproved
        ? `Flag ${chapterTitle} for revision?\n\nThis will revert its "Approved" status, deduct research progress, and notify advisees to address the remarks.\n\nEnter revision instructions or panel defense notes:`
        : `Enter revision instructions for ${chapterTitle} (or leave as is to refer advisees to in-editor comments):`;

      const defaultComment = wasApproved
        ? 'Defense revisions required: Please address the comments and corrections in the manuscript editor and resubmit.'
        : 'Revisions and comments have been added directly in the document editor. Please address and re-submit.';

      const comment = window.prompt(promptMsg, defaultComment);
      if (comment === null) return;

      const reviewerRole = userProfile?.role === 'panelist' || isPanelistMode ? 'Defense Panelist' : 'Faculty Adviser';
      const reviewerName = currentUser?.displayName || userProfile?.fullName || reviewerRole;

      try {
        await researchWorkspaceService.requestRevisionChapter(
          workspace.id,
          activeChapterId,
          comment.trim() || defaultComment,
          currentUser?.uid,
          reviewerName,
          isPanelist ? 'panelist' : 'adviser'
        );
        setToastMessage(
          wasApproved
            ? `${chapterTitle} reverted to Revision Required. Progress updated.`
            : `Revision requested for ${chapterTitle}. Advisees notified.`
        );
        setTimeout(() => setToastMessage(''), 4500);
      } catch (err) {
        alert('Failed to request revision: ' + err.message);
      }
    };

    const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
      try {
        await researchFeedbackService.updateFeedbackStatus(feedbackId, newStatus);
        setToastMessage(
          newStatus === 'resolved'
            ? 'Revision comment approved and signed off!'
            : 'Comment reopened for further revision.'
        );
        setTimeout(() => setToastMessage(''), 4000);
      } catch (err) {
        alert('Failed to update revision status: ' + err.message);
      }
    };

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

        {/* Faculty / Adviser / Panelist Chapter Review & Revision Banner */}
        {workspace && (userProfile?.role === 'adviser' || userProfile?.role === 'panelist' || userProfile?.role === 'faculty' || userProfile?.role === 'research_coordinator' || isPanelistMode) && (
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900 border-b border-blue-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {isPanelist ? 'Panelist Defense Review:' : 'Faculty Review:'}
                  </span>
                  
                  {/* Chapter Selector Dropdown */}
                  <select
                    value={activeChapterId}
                    onChange={(e) => setActiveChapterId(e.target.value)}
                    className="text-xs font-semibold py-1 px-2.5 rounded-md bg-white/10 dark:bg-slate-800 text-white border border-blue-400/40 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                  >
                    {(workspace.sections || []).map((sec) => (
                      <option key={sec.id} value={sec.id} className="bg-slate-900 text-white">
                        {sec.name} ({sec.status === 'completed' ? 'Approved' : sec.status === 'submitted' ? 'Submitted' : sec.status === 'revision_required' ? 'Revision' : 'Drafting'})
                      </option>
                    ))}
                  </select>

                  {/* Current Selected Chapter Status Badge */}
                  {(() => {
                    const currSec = (workspace.sections || []).find((s) => s.id === activeChapterId);
                    const isApproved = currSec?.status === 'completed';
                    const isSub = currSec?.status === 'submitted' || currSec?.status === 'under_review';
                    const isRev = currSec?.status === 'revision_required';
                    return (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isSub
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isRev
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                        }`}
                      >
                        {isApproved ? 'Approved' : isSub ? 'Submitted for Review' : isRev ? 'Revision Required' : 'In Progress'}
                      </span>
                    );
                  })()}
                </div>

                <p className="text-[11px] text-blue-200/80 hidden sm:block mt-0.5">
                  {isPanelist
                    ? 'Highlight text to add review comments. When students resolve your comments, open Comments & Revisions to approve that part.'
                    : 'Highlight manuscript text to add comments for revisions. When satisfied, click Approve Chapter below.'}
                </p>
              </div>
            </div>

            {/* Actions: Comments & Revisions / Flag for Revision / Approve Chapter (Adviser Only) */}
            <div className="flex items-center gap-2 shrink-0">
              {toastMessage && (
                <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30 animate-fade-in">
                  ✓ {toastMessage}
                </span>
              )}

              {/* Comments & Revisions Modal Trigger */}
              {(() => {
                const chapterFeedbacks = feedbackList.filter(
                  (f) => f.sectionId === activeChapterId || (!f.sectionId && activeChapterId === 'chapter_1')
                );
                const addressedCount = chapterFeedbacks.filter((f) => f.status === 'addressed').length;

                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                    className={`text-xs py-1 px-2.5 border transition-all flex items-center gap-1.5 ${
                      addressedCount > 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/15'
                    }`}
                    title="View comments & approve resolved parts"
                  >
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Comments ({chapterFeedbacks.length})
                    {addressedCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full">
                        {addressedCount} addressed
                      </span>
                    )}
                  </Button>
                );
              })()}

              {(() => {
                const currSec = (workspace.sections || []).find((s) => s.id === activeChapterId);
                const isApproved = currSec?.status === 'completed';

                return isApproved ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Chapter Approved
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRequestRevisionInEditor}
                      className="text-xs py-1 px-2.5 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 hover:border-amber-500/60 font-medium flex items-center gap-1.5 transition-all shadow-xs"
                      title="Revert approved chapter and flag revisions needed (deducts progress until resolved)"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Flag for Revision
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRequestRevisionInEditor}
                      className="text-xs py-1 px-2.5 text-rose-300 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 flex items-center gap-1.5"
                      title="Flag revisions required"
                    >
                      <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Flag for Revision
                    </Button>

                    {/* ONLY assigned advisers / coordinators can approve the whole chapter */}
                    {isAdviser && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={approving}
                        onClick={handleApproveChapterInEditor}
                        className="text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {approving ? 'Approving...' : 'Approve Chapter'}
                      </Button>
                    )}
                  </>
                );
              })()}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(location.state?.from || `/faculty/workspace/${workspace.id}`)}
                className="text-xs py-1 px-2 text-slate-300 hover:text-white hover:bg-white/10"
                title="Return to Faculty Workspace"
              >
                Back to Workspace →
              </Button>
            </div>
          </div>
        )}

        {/* Chapter Comments & Revisions Modal */}
        {isCommentsOpen && workspace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-blue-400">💬</span> Chapter Comments & Revisions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review student resolutions and approve resolved parts
                  </p>
                </div>
                <button
                  onClick={() => setIsCommentsOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {(() => {
                  const chapterFeedbacks = feedbackList.filter(
                    (f) => f.sectionId === activeChapterId || (!f.sectionId && activeChapterId === 'chapter_1')
                  );

                  if (chapterFeedbacks.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No feedback comments recorded for this chapter yet. You can highlight text in the manuscript to add comments, or click "Flag for Revision".
                      </div>
                    );
                  }

                  return chapterFeedbacks.map((fb) => {
                    const isResolved = fb.status === 'resolved';
                    const isAddressed = fb.status === 'addressed';

                    return (
                      <div
                        key={fb.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isResolved
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isAddressed
                            ? 'bg-amber-950/30 border-amber-500/40'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              {fb.authorName || 'Reviewer'}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              {fb.authorRole || 'reviewer'}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              isResolved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isAddressed
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {isResolved
                              ? 'Approved / Resolved'
                              : isAddressed
                              ? 'Addressed by Student'
                              : 'Pending Revision'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed mb-3">
                          {fb.comment}
                        </p>

                        {/* Actions: Approve this Part / Reopen */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <span className="text-[10px] text-slate-400">
                            {new Date(fb.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <div className="flex items-center gap-2">
                            {isResolved ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateFeedbackStatus(fb.id, 'open')}
                                className="text-[11px] py-1 px-2 text-slate-400 hover:text-white"
                                title="Reopen if further revisions needed"
                              >
                                Reopen
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUpdateFeedbackStatus(fb.id, 'resolved')}
                                className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                                title="Approve this specific resolved part"
                              >
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Approve this Part
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {isPanelist
                    ? 'Panelists sign off on individual resolved comments.'
                    : 'Advisers can sign off on comments and whole chapters.'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsCommentsOpen(false)}
                  className="text-xs py-1 px-3"
                >
                  Close
                </Button>
              </div>
            </div>
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
