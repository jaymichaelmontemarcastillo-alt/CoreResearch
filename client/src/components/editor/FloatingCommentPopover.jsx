// src/components/editor/FloatingCommentPopover.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Send, Quote, X, GripHorizontal } from 'lucide-react';
import { documentStore } from '../../services/documentStore';

export const FloatingCommentPopover = ({
  editor,
  documentId,
  userProfile,
  onCommentAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('button'); // 'button' | 'composer'
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null); // { from, to }
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mention autocomplete state
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [trackedMentions, setTrackedMentions] = useState([]);

  const popoverRef = useRef(null);
  const textareaRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const activeSelectionRef = useRef(null);
  const isCustomDraggedRef = useRef(false);

  const effectiveUser = useMemo(() => ({
    uid: userProfile?.uid || 'user-default',
    fullName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
    role: userProfile?.role || 'student',
    profile_image: userProfile?.profile_image || '',
  }), [userProfile]);

  // 1. Fetch eligible mention users for this document
  useEffect(() => {
    if (!documentId) return;
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const users = await documentStore.getEligibleMentionUsers(documentId);
        if (isMounted) setEligibleUsers(users);
      } catch (e) {
        console.warn('Failed to load eligible mention users for floating comment:', e);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [documentId]);

  // Calculate coordinates relative to viewport
  const updatePositionFromSelection = useCallback((customRange = null) => {
    if (!editor || editor.isDestroyed) return false;

    // If user has manually dragged the composer, preserve their custom screen position
    if (mode === 'composer' && isCustomDraggedRef.current) {
      return true;
    }

    try {
      const winSelection = window.getSelection();
      let clientRect = null;

      if (winSelection && winSelection.rangeCount > 0 && !winSelection.isCollapsed) {
        const domRange = winSelection.getRangeAt(0);
        clientRect = domRange.getBoundingClientRect();
      }

      // Fallback to ProseMirror coords if window selection is not accessible
      if (!clientRect || (clientRect.width === 0 && clientRect.height === 0)) {
        const sel = customRange || editor.state.selection;
        if (sel && sel.from !== sel.to) {
          const startCoords = editor.view.coordsAtPos(sel.from);
          const endCoords = editor.view.coordsAtPos(sel.to);
          if (startCoords && endCoords) {
            clientRect = {
              top: Math.min(startCoords.top, endCoords.top),
              bottom: Math.max(startCoords.bottom, endCoords.bottom),
              left: Math.min(startCoords.left, endCoords.left),
              right: Math.max(startCoords.right, endCoords.right),
              width: Math.abs(endCoords.right - startCoords.left),
              height: Math.abs(endCoords.bottom - startCoords.top),
            };
          }
        }
      }

      if (!clientRect || (clientRect.width === 0 && clientRect.height === 0)) {
        return false;
      }

      // Prevent rendering if selection is outside visible viewport
      if (clientRect.bottom < 50 || clientRect.top > window.innerHeight - 30) {
        return false;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (mode === 'button') {
        // Floating action button position: placed near the right side of the highlighted text
        const buttonWidth = 140;
        const buttonHeight = 36;

        let left = clientRect.right + 10;
        let top = clientRect.top + (clientRect.height / 2) - (buttonHeight / 2);

        // If not enough room on right side of selection, position right above or below
        if (left + buttonWidth > viewportWidth - 20) {
          left = Math.max(20, Math.min(clientRect.left, viewportWidth - buttonWidth - 20));
          if (clientRect.top - buttonHeight - 8 > 70) {
            top = clientRect.top - buttonHeight - 8;
          } else {
            top = clientRect.bottom + 8;
          }
        }

        // Clamp vertically
        top = Math.max(70, Math.min(viewportHeight - buttonHeight - 20, top));

        setPosition({ top, left, placement: 'right' });
        return true;
      } else {
        // Contextual Composer Card position
        const composerWidth = Math.min(360, viewportWidth - 32);
        const composerHeight = 240; // Estimated height

        let left = clientRect.left;
        let top = clientRect.bottom + 10;
        let placement = 'bottom';

        // Check if there is space below
        if (top + composerHeight > viewportHeight - 20) {
          // If space above, position above
          if (clientRect.top - composerHeight - 10 > 70) {
            top = clientRect.top - composerHeight - 10;
            placement = 'top';
          } else {
            top = Math.max(75, viewportHeight - composerHeight - 20);
          }
        }

        // Clamp horizontal boundaries
        if (left + composerWidth > viewportWidth - 20) {
          left = viewportWidth - composerWidth - 20;
        }
        left = Math.max(16, left);

        setPosition({ top, left, placement });
        return true;
      }
    } catch (err) {
      console.warn('FloatingComment position calculation notice:', err);
      return false;
    }
  }, [editor, mode]);

  // 2. Track editor selection changes
  const checkSelection = useCallback(() => {
    if (!editor || editor.isDestroyed || isMouseDownRef.current || isDragging || isSubmitting) return;

    try {
      const { from, to, empty } = editor.state.selection;

      if (empty || from === to) {
        // If composer is currently open, don't immediately dismiss unless user clicked outside
        if (mode !== 'composer') {
          setIsOpen(false);
          activeSelectionRef.current = null;
        }
        return;
      }

      const text = editor.state.doc.textBetween(from, to, ' ');
      if (!text || text.trim().length === 0) {
        if (mode !== 'composer') {
          setIsOpen(false);
          activeSelectionRef.current = null;
        }
        return;
      }

      const trimmedText = text.trim();
      setSelectedText(trimmedText);
      setSelectionRange({ from, to });
      activeSelectionRef.current = { from, to, text: trimmedText };

      // Update position and show button if not already in composer mode
      const updated = updatePositionFromSelection({ from, to });
      if (updated) {
        setIsOpen(true);
      }
    } catch (e) {
      // ignore
    }
  }, [editor, mode, isDragging, updatePositionFromSelection]);

  // Mouse event listeners to detect selection release & outside clicks
  useEffect(() => {
    if (!editor) return;

    const handleMouseDown = (e) => {
      // If clicking inside the popover/composer, ignore
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      isMouseDownRef.current = true;
    };

    const handleMouseUp = (e) => {
      isMouseDownRef.current = false;
      // Slight timeout to let ProseMirror / DOM finalize the range
      setTimeout(() => {
        // If clicking inside popover, ignore
        if (popoverRef.current && popoverRef.current.contains(e.target)) {
          return;
        }
        checkSelection();
      }, 30);
    };

    const handleSelectionUpdate = () => {
      if (!isMouseDownRef.current && !isDragging) {
        checkSelection();
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen && !isCustomDraggedRef.current) {
        updatePositionFromSelection(activeSelectionRef.current);
      }
    };

    // Close on outside click
    const handleDocumentClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      // If click was inside editor and selection is collapsed, close
      if (editor?.view?.dom && editor.view.dom.contains(e.target)) {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
          setIsOpen(false);
          setMode('button');
          setInputText('');
          setMentionQuery(null);
          isCustomDraggedRef.current = false;
        }
      } else {
        // Click was outside both editor and popover
        setIsOpen(false);
        setMode('button');
        setInputText('');
        setMentionQuery(null);
        isCustomDraggedRef.current = false;
      }
    };

    // Escape key to cancel
    const handleKeyDownGlobal = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setMode('button');
        setInputText('');
        setMentionQuery(null);
        isCustomDraggedRef.current = false;
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDownGlobal);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDownGlobal);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [editor, isOpen, isDragging, checkSelection, updatePositionFromSelection]);

  // When switching to composer mode, focus textarea and recalculate position
  useEffect(() => {
    if (mode === 'composer' && isOpen) {
      if (!isCustomDraggedRef.current) {
        updatePositionFromSelection(activeSelectionRef.current);
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 50);
    }
  }, [mode, isOpen, updatePositionFromSelection]);

  // 3. Draggable Header Handler for the Composer Card
  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = position.top;
    const startLeft = position.left;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setIsDragging(true);
        isCustomDraggedRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }

      const composerWidth = 350;
      const composerHeight = 240;

      const nextTop = Math.max(60, Math.min(window.innerHeight - composerHeight - 10, startTop + deltaY));
      const nextLeft = Math.max(10, Math.min(window.innerWidth - composerWidth - 10, startLeft + deltaX));

      setPosition({
        top: nextTop,
        left: nextLeft,
        placement: position.placement,
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 4. Handle textarea change & detect @mentions
  const handleInputChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(text);

    // Check for @mention trigger
    const textBeforeCursor = text.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9\s]*)$/);

    if (atMatch && !textBeforeCursor.match(/@[a-zA-Z0-9\s]+(\s{2,})/)) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  // Filter mentionable users
  const filteredUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return eligibleUsers.slice(0, 5);
    return eligibleUsers
      .filter((u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [eligibleUsers, mentionQuery]);

  // Insert mention into input
  const selectMention = (user) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const newTextBefore = textBeforeCursor.slice(0, atIndex) + `@${user.fullName} `;
      const newText = newTextBefore + textAfterCursor;
      setInputText(newText);
      setTrackedMentions((prev) => [
        ...prev.filter((m) => m.userId !== user.id),
        { userId: user.id, userName: user.fullName },
      ]);
      setMentionQuery(null);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = newTextBefore.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    }
  };

  // Keyboard navigation for textarea & mention list
  const handleKeyDown = (e) => {
    if (mentionQuery !== null && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(filteredUsers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  // Open Composer Mode
  const handleOpenComposer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMode('composer');
  };

  // Cancel / Dismiss
  const handleCancel = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsOpen(false);
    setMode('button');
    setInputText('');
    setSelectedText('');
    setSelectionRange(null);
    setTrackedMentions([]);
    setMentionQuery(null);
    activeSelectionRef.current = null;
    isCustomDraggedRef.current = false;
    setIsSubmitting(false);

    try {
      if (editor && !editor.isDestroyed) {
        const currentPos = editor.state.selection.to;
        editor.commands.setTextSelection(currentPos);
      }
      window.getSelection()?.removeAllRanges();
    } catch (err) {}
  };

  // Submit Comment to Firestore
  const handleSubmitComment = async () => {
    if (!inputText.trim() || !documentId || isSubmitting) return;

    const trimmedText = inputText.trim();
    const commentId = `comm_${Date.now()}`;
    const commentSelectedText = selectedText || '';
    const currentSelection = selectionRange;
    const mentionsInText = trackedMentions.filter((m) =>
      trimmedText.includes(`@${m.userName}`)
    );

    // Instantly close the floating card and reset state so it disappears immediately!
    setIsOpen(false);
    setMode('button');
    setInputText('');
    setSelectedText('');
    setSelectionRange(null);
    setTrackedMentions([]);
    setMentionQuery(null);
    activeSelectionRef.current = null;
    isCustomDraggedRef.current = false;
    setIsSubmitting(false);

    // Collapse selection in editor so selection is no longer active
    if (editor && !editor.isDestroyed) {
      try {
        const currentPos = currentSelection?.to || editor.state.selection.to;
        editor.commands.setTextSelection(currentPos);
      } catch (selErr) {
        // ignore
      }
    }

    // Clear DOM selection
    try {
      window.getSelection()?.removeAllRanges();
    } catch (e) {}

    try {
      await documentStore.addComment(
        documentId,
        {
          id: commentId,
          text: trimmedText,
          selectedText: commentSelectedText,
          section: 'Manuscript Section',
          mentions: mentionsInText,
        },
        effectiveUser
      );

      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err) {
      console.error('Failed to submit floating comment:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      }}
      className="select-none pointer-events-auto"
    >
      {mode === 'button' ? (
        /* 1. Google Docs–Style Floating "Add Comment" Pill Button */
        <button
          type="button"
          onClick={handleOpenComposer}
          aria-label="Add comment to selected text"
          title="Add comment"
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-slate-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 animate-fade-in"
        >
          <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-tight">Add comment</span>
        </button>
      ) : (
        /* 2. Draggable Google Docs–Style Contextual Comment Composer Card */
        <div 
          className={`w-80 sm:w-88 bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700/90 rounded-2xl p-3.5 shadow-2xl transition-shadow duration-150 animate-fade-in text-xs flex flex-col gap-2.5 ${
            isDragging ? 'shadow-blue-500/20 ring-2 ring-blue-500/30' : ''
          }`}
        >
          {/* Header (Drag Handle Area): User Avatar & Name + Close Button */}
          <div 
            onPointerDown={handleDragStart}
            className={`flex items-center justify-between p-1 -m-1 rounded-t-xl transition-colors select-none group ${
              isDragging 
                ? 'cursor-grabbing bg-blue-50/60 dark:bg-slate-800/80' 
                : 'cursor-grab hover:bg-gray-50 dark:hover:bg-slate-800/40'
            }`}
            title="Click and drag header to move comment box"
          >
            <div className="flex items-center gap-2 min-w-0 pointer-events-none">
              <div className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-400 transition-colors">
                <GripHorizontal className="w-3.5 h-3.5" />
              </div>
              
              {effectiveUser.profile_image ? (
                <img
                  src={effectiveUser.profile_image}
                  alt={effectiveUser.fullName}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {effectiveUser.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-gray-900 dark:text-white truncate">
                  {effectiveUser.fullName}
                </span>
                <span className="text-[10px] text-gray-400 capitalize -mt-0.5">
                  {effectiveUser.role || 'Member'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md transition-colors pointer-events-auto"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quoted Selected Text Preview */}
          {selectedText && (
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border-l-2 border-amber-500 px-2.5 py-1.5 rounded-r text-[11px] text-amber-900 dark:text-amber-200 italic line-clamp-2">
              <Quote className="w-2.5 h-2.5 inline mr-1 text-amber-600 shrink-0" />
              "{selectedText}"
            </div>
          )}

          {/* Mention Autocomplete Dropdown Popup */}
          {mentionQuery !== null && filteredUsers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 max-h-40 overflow-y-auto animate-fade-in text-xs">
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                Mention Member (@)
              </div>
              {filteredUsers.map((user, idx) => (
                <button
                  key={user.id || user.uid}
                  type="button"
                  onClick={() => selectMention(user)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                    idx === mentionIndex
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                      : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="truncate">{user.fullName}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 capitalize shrink-0 font-normal">
                    {user.role || 'Member'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Input Textarea Area */}
          <div className="relative bg-gray-50/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
            <textarea
              ref={textareaRef}
              rows={3}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Comment or add others with @"
              className="w-full bg-transparent text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none resize-none min-h-[50px] max-h-36 custom-scrollbar"
            />
          </div>

          {/* Footer Actions: Cancel and Submit Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-gray-400">
              <span><kbd className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700">Ctrl</kbd> + <kbd className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700">Enter</kbd></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={!inputText.trim() || isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Comment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingCommentPopover;
