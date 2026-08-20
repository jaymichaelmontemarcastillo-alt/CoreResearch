// src/components/editor/CommentsPanel.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { 
  MessageSquare, Check, Send, Reply, Trash2, RotateCcw, Quote, X, 
  ArrowRight, ChevronDown, ChevronUp, CornerDownRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { documentStore } from '../../services/documentStore';

// Helper to format ISO timestamp into MM/DD/YYYY • h:mm AM/PM format
const formatCommentDateTime = (isoString) => {
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

// Render text with styled @mentions highlighted as badges
const FormattedCommentContent = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(@[A-Za-z0-9_\s]+?(?=\s|[.,!?]|$))/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          return (
            <span
              key={index}
              className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[11px] mx-0.5"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

// Builds a recursive Tree structure from flat reply objects
const buildReplyTree = (replies = []) => {
  if (!replies || replies.length === 0) return [];

  // Sort by createdAt ascending
  const sorted = [...replies].sort((a, b) => 
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  const replyMap = new Map();
  sorted.forEach((r) => {
    replyMap.set(r.id, { ...r, children: [] });
  });

  const rootReplies = [];

  sorted.forEach((r) => {
    const node = replyMap.get(r.id);
    if (r.parentReplyId && replyMap.has(r.parentReplyId)) {
      // Child reply belongs directly under its specific parent reply
      replyMap.get(r.parentReplyId).children.push(node);
    } else {
      // Root reply to the main comment
      rootReplies.push(node);
    }
  });

  return rootReplies;
};

// Recursive Reply Tree Node Component with visual branch connectors
const ReplyTreeNode = ({
  reply,
  depth = 0,
  maxDepth = 4,
  comment,
  replyTarget,
  onSelectReplyTarget,
  expandedSubThreads,
  onToggleSubThread,
}) => {
  const isReplyingThis = replyTarget?.replyId === reply.id;
  const hasChildren = reply.children && reply.children.length > 0;
  const isSubThreadExpanded = expandedSubThreads[reply.id] !== false; // default expanded when branch opens

  return (
    <div className={`relative ${depth > 0 ? 'ml-3.5 sm:ml-4 mt-2' : 'mt-2'}`}>
      {/* Tree Line Connector for nested levels */}
      {depth > 0 && (
        <div className="absolute -left-3.5 sm:-left-4 top-0 bottom-0 w-3.5 sm:w-4 pointer-events-none">
          {/* Vertical line from parent */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-200/90 dark:bg-blue-800/60" />
          {/* Curved branch into child */}
          <div className="absolute left-0 top-3 w-3 sm:w-3.5 h-3 border-b-2 border-l-2 border-blue-200/90 dark:border-blue-800/60 rounded-bl-md" />
        </div>
      )}

      {/* Reply Card */}
      <div 
        className={`text-xs p-2.5 rounded-lg border transition-all ${
          isReplyingThis
            ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-gray-50/90 dark:bg-slate-900/60 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
        }`}
      >
        {/* Reply Header: Author → Recipient + Date/Time */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <div className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200 truncate">
            <span className="truncate">{reply.authorName || 'Collaborator'}</span>
            {reply.replyToUserName && (
              <>
                <ArrowRight className="w-2.5 h-2.5 text-gray-400 shrink-0 mx-0.5" />
                <span className="text-blue-600 dark:text-blue-400 font-medium truncate">
                  @{reply.replyToUserName}
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-gray-400 shrink-0 ml-2 whitespace-nowrap">
            {formatCommentDateTime(reply.createdAt)}
          </span>
        </div>

        {/* Reply Content */}
        <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-xs">
          <FormattedCommentContent text={reply.text} />
        </div>

        {/* Action Controls: Sub-thread collapse toggle & Nested Reply button */}
        {!comment.resolved && (
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100/80 dark:border-slate-800/80">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggleSubThread(reply.id)}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 py-0.5"
              >
                {isSubThreadExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Hide {reply.children.length === 1 ? '1 reply' : `${reply.children.length} replies`}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>{reply.children.length === 1 ? '1 reply' : `${reply.children.length} replies`}</span>
                  </>
                )}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => onSelectReplyTarget(reply)}
              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-0.5 px-1.5 rounded hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Reply className="w-2.5 h-2.5" /> Reply
            </button>
          </div>
        )}
      </div>

      {/* Recursive Render of Child Replies (Tree Branches) */}
      {hasChildren && isSubThreadExpanded && (
        <div className="relative">
          {reply.children.map((childReply) => (
            <ReplyTreeNode
              key={childReply.id}
              reply={childReply}
              depth={depth + 1}
              maxDepth={maxDepth}
              comment={comment}
              replyTarget={replyTarget}
              onSelectReplyTarget={onSelectReplyTarget}
              expandedSubThreads={expandedSubThreads}
              onToggleSubThread={onToggleSubThread}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentsPanel = ({ documentId, editor, onClose }) => {
  const { userProfile } = useAuth();
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedTextAnchor, setSelectedTextAnchor] = useState('');
  const [filter, setFilter] = useState('active'); // 'active' | 'resolved'
  const [replyTarget, setReplyTarget] = useState(null); // { commentId, replyId, authorId, authorName }
  const [loading, setLoading] = useState(true);

  // Social media style collapsible replies state { [commentId]: boolean }
  const [expandedThreads, setExpandedThreads] = useState({});
  const [expandedSubThreads, setExpandedSubThreads] = useState({});

  // Mention system state
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // string or null
  const [mentionIndex, setMentionIndex] = useState(0);
  const [trackedMentions, setTrackedMentions] = useState([]); // [{ userId, userName }]
  const textareaRef = useRef(null);
  const commentsContainerRef = useRef(null);

  const effectiveUserProfile = useMemo(() => ({
    uid: userProfile?.uid || 'user-default',
    fullName: userProfile?.fullName || userProfile?.first_name || 'Researcher',
    role: userProfile?.role || 'student',
    profile_image: userProfile?.profile_image || ''
  }), [userProfile]);

  // 1. Subscribe to real-time comments from Firestore
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);

    const unsubscribe = documentStore.subscribeComments(
      documentId,
      (fetchedComments) => {
        setComments(fetchedComments);
        setLoading(false);
      },
      (err) => {
        console.warn('Comments subscription warning:', err);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [documentId]);

  // 2. Fetch eligible users for @mention autocomplete from system/document
  useEffect(() => {
    if (!documentId) return;
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const users = await documentStore.getEligibleMentionUsers(documentId);
        if (isMounted) {
          setEligibleUsers(users);
        }
      } catch (err) {
        console.warn('Failed to load eligible mention users:', err);
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [documentId]);

  // 3. Capture highlighted text selection from editor
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      try {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text && text.trim().length > 0 && text.trim().length < 300) {
            setSelectedTextAnchor(text.trim());
          }
        }
      } catch (e) {
        // ignore
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // 4. Handle textarea change & detect @mentions
  const handleInputChange = (e) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(text);

    // Look backward from cursor for @query
    const textBeforeCursor = text.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9\s]*)$/);

    if (atMatch && !textBeforeCursor.match(/@[a-zA-Z0-9\s]+(\s{2,})/)) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  // Filter eligible users for mention dropdown
  const filteredUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return eligibleUsers.slice(0, 6);
    return eligibleUsers
      .filter((u) => 
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [eligibleUsers, mentionQuery]);

  // Insert selected mention into textarea
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
        { userId: user.id, userName: user.fullName }
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

  // Keyboard navigation for mention popup
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

    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Toggle thread expanded state
  const toggleThread = (commentId) => {
    setExpandedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleSubThread = (replyId) => {
    setExpandedSubThreads((prev) => ({
      ...prev,
      [replyId]: prev[replyId] === false ? true : false,
    }));
  };

  // Select a reply as the direct target
  const handleSelectReplyTarget = (comment, reply) => {
    setReplyTarget({
      commentId: comment.id,
      replyId: reply.id,
      authorId: reply.authorId,
      authorName: reply.authorName || 'Collaborator',
    });
    setExpandedThreads((prev) => ({
      ...prev,
      [comment.id]: true,
    }));
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Submit comment or reply
  const handleSend = async () => {
    if (!inputText.trim() || !documentId) return;

    const trimmedText = inputText.trim();

    // Collect all mentions from text
    const mentionsInText = trackedMentions.filter((m) =>
      trimmedText.includes(`@${m.userName}`)
    );

    try {
      if (replyTarget) {
        const parentCommentId = replyTarget.commentId;
        const parentReplyId = replyTarget.replyId || null;

        // Send Nested Reply (directly under the parent reply or root comment)
        await documentStore.addCommentReply(
          documentId,
          parentCommentId,
          {
            parentReplyId: parentReplyId,
            text: trimmedText,
            replyToUserId: replyTarget.authorId,
            replyToUserName: replyTarget.authorName,
            mentions: mentionsInText,
          },
          effectiveUserProfile
        );

        // Auto-expand thread and sub-thread
        setExpandedThreads((prev) => ({
          ...prev,
          [parentCommentId]: true,
        }));
        if (parentReplyId) {
          setExpandedSubThreads((prev) => ({
            ...prev,
            [parentReplyId]: true,
          }));
        }

        setReplyTarget(null);
      } else {
        // Send Root Comment
        await documentStore.addComment(
          documentId,
          {
            text: trimmedText,
            selectedText: selectedTextAnchor || '',
            section: 'Manuscript Section',
            mentions: mentionsInText,
          },
          effectiveUserProfile
        );
        setSelectedTextAnchor('');
      }

      setInputText('');
      setTrackedMentions([]);
      setMentionQuery(null);

      // Scroll to bottom of comments container
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (err) {
      console.error('Failed to post comment/reply:', err);
    }
  };

  // Toggle resolve status
  const handleResolve = async (commentId, currentResolved) => {
    try {
      await documentStore.updateComment(documentId, commentId, { resolved: !currentResolved });
    } catch (err) {
      console.error('Failed to update comment status:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment and its replies?')) return;
    try {
      await documentStore.deleteComment(documentId, commentId);
      if (replyTarget?.commentId === commentId) {
        setReplyTarget(null);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // 1. Sort Root Comments: Oldest on TOP, Newest at BOTTOM
  const sortedComments = useMemo(() => {
    const list = comments.filter((c) => (filter === 'active' ? !c.resolved : c.resolved));
    return list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [comments, filter]);

  const activeCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-text overflow-hidden">
      {/* 1. Header (Fixed at top) */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              Manuscript Feedback & Comments
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs Filter */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              filter === 'active'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm border border-blue-200/60 dark:border-blue-800'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('resolved')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              filter === 'resolved'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm border border-emerald-200/60 dark:border-emerald-800'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* 2. Middle Scrollable Comments Feed (Oldest to Newest) */}
      <div 
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading comments...</span>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 px-4">
            <MessageSquare className="w-8 h-8 mx-auto mb-2.5 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">
              {filter === 'active' ? 'No active comments' : 'No resolved comments'}
            </p>
            <p className="text-gray-400">
              {filter === 'active' 
                ? 'Highlight manuscript text or type in the composer below to leave academic feedback.' 
                : 'Resolved comments will appear here for archive.'}
            </p>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isReplyingComment = replyTarget?.commentId === comment.id && !replyTarget?.replyId;
            const repliesCount = comment.replies ? comment.replies.length : 0;
            const isThreadExpanded = Boolean(expandedThreads[comment.id]);

            // Construct Hierarchical Reply Tree
            const replyTree = comment.replies ? buildReplyTree(comment.replies) : [];

            return (
              /* Single Visual Card Container */
              <div
                key={comment.id}
                className={`bg-white dark:bg-slate-800/90 border rounded-xl p-3.5 shadow-sm transition-all ${
                  comment.resolved
                    ? 'border-gray-200 dark:border-slate-800 opacity-80'
                    : isReplyingComment
                    ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/10'
                    : 'border-gray-200/90 dark:border-slate-700/80 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Quoted manuscript anchor if attached */}
                {comment.selectedText && (
                  <div className="mb-2.5 bg-amber-50/80 dark:bg-amber-900/20 border-l-2 border-amber-500 px-2.5 py-1.5 rounded text-xs text-amber-900 dark:text-amber-200 italic line-clamp-3">
                    <Quote className="w-3 h-3 inline mr-1 text-amber-600 shrink-0" />
                    "{comment.selectedText}"
                  </div>
                )}

                {/* Comment Card Header: Author, Relationship, Date & Time */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="min-w-0">
                      {/* Author → Target Relationship */}
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
                        <span className="truncate">{comment.authorName || 'Researcher'}</span>
                        {comment.replyToUserName && (
                          <>
                            <ArrowRight className="w-3 h-3 text-gray-400 shrink-0 mx-0.5" />
                            <span className="text-gray-600 dark:text-gray-300 font-medium truncate">
                              {comment.replyToUserName}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        <span className="capitalize">{comment.authorRole || 'Member'}</span>
                        <span>•</span>
                        {/* Full Date & Time (MM/DD/YYYY • h:mm A) */}
                        <span>{formatCommentDateTime(comment.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Resolve / Re-open & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolve(comment.id, comment.resolved)}
                      className={`p-1 rounded-md text-xs transition-colors ${
                        comment.resolved
                          ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                      title={comment.resolved ? 'Re-open comment' : 'Resolve comment'}
                    >
                      {comment.resolved ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Comment Body */}
                <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2">
                  <FormattedCommentContent text={comment.text} />
                </div>

                {/* Hierarchical Tree of Replies */}
                {repliesCount > 0 && isThreadExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-700/60 pl-2.5 border-l-2 border-l-blue-200 dark:border-l-blue-900 animate-fade-in">
                    {replyTree.map((rootReply) => (
                      <ReplyTreeNode
                        key={rootReply.id}
                        reply={rootReply}
                        depth={0}
                        comment={comment}
                        replyTarget={replyTarget}
                        onSelectReplyTarget={(r) => handleSelectReplyTarget(comment, r)}
                        expandedSubThreads={expandedSubThreads}
                        onToggleSubThread={toggleSubThread}
                      />
                    ))}
                  </div>
                )}

                {/* Footer Controls: Replies Dropdown Toggle & Root Reply Button */}
                <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-gray-100 dark:border-slate-700/40">
                  {/* Left: Collapsible Replies Trigger Dropdown Button */}
                  <div>
                    {repliesCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleThread(comment.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1 px-1.5 -ml-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      >
                        {isThreadExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide {repliesCount === 1 ? '1 reply' : `${repliesCount} replies`}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>{repliesCount === 1 ? '1 reply' : `${repliesCount} replies`}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No replies yet</span>
                    )}
                  </div>

                  {/* Right: Root Comment Reply Trigger */}
                  {!comment.resolved && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTarget({
                          commentId: comment.id,
                          replyId: null,
                          authorId: comment.authorId,
                          authorName: comment.authorName || 'Researcher',
                        });
                        // Automatically expand thread so user sees context when replying
                        setExpandedThreads((prev) => ({
                          ...prev,
                          [comment.id]: true,
                        }));
                        setTimeout(() => textareaRef.current?.focus(), 50);
                      }}
                      className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors py-1 px-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Reply className="w-3 h-3" /> Reply
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Sticky Comment Composer */}
      <div className="shrink-0 p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 relative z-20">
        
        {/* Active Mention Autocomplete Dropdown Popup */}
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div className="absolute left-3 right-3 bottom-full mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 max-h-48 overflow-y-auto animate-fade-in text-xs">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
              Mention Member (@)
            </div>
            {filteredUsers.map((user, idx) => (
              <button
                key={user.id || user.uid}
                type="button"
                onClick={() => selectMention(user)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
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

        {/* Selected manuscript text quote badge preview */}
        {selectedTextAnchor && !replyTarget && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500 px-2.5 py-1.5 mb-2 rounded text-xs text-amber-900 dark:text-amber-300">
            <div className="flex items-center gap-1.5 truncate">
              <Quote className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate italic">"{selectedTextAnchor}"</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTextAnchor('')}
              className="text-amber-500 hover:text-amber-700 p-0.5"
              title="Clear quote"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Replying target badge preview */}
        {replyTarget && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 px-2.5 py-1.5 mb-2 rounded text-xs text-blue-900 dark:text-blue-300">
            <div className="flex items-center gap-1.5 truncate">
              <Reply className="w-3 h-3 text-blue-600 shrink-0" />
              <span>
                Replying to <strong className="font-semibold text-blue-700 dark:text-blue-300">@{replyTarget.authorName}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-blue-500 hover:text-blue-700 p-0.5"
              title="Cancel reply"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input Area with Circular Send Icon Button */}
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              replyTarget
                ? `Reply to @${replyTarget.authorName}... (Type @ to mention)`
                : selectedTextAnchor
                ? "Comment on selected text... (Type @ to mention)"
                : "Add a manuscript comment... (Type @ to mention)"
            }
            className="flex-1 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none resize-none min-h-[44px] max-h-32 custom-scrollbar"
          />

          {/* Compact Circular Send Icon Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            aria-label="Send comment"
            title="Send comment (Ctrl+Enter)"
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 text-white flex items-center justify-center shadow-sm transition-all shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-gray-400">
          <span>Type <kbd className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700">@</kbd> to mention</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700">Ctrl</kbd> + <kbd className="font-mono bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-gray-200 dark:border-slate-700">Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;
