// src/pages/Manuscripts.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import {
  FolderGit2,
  UploadCloud,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  File,
  MessageSquare,
  Users,
  Edit3,
  Plus,
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  FileDown,
  Eye,
  Check,
  Send,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  exportToDocx,
  exportToPdf,
  extractTextFromFile,
} from "../utils/manuscriptExporter";

export const Manuscripts = () => {
  const { role, userProfile } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState("editor"); // "editor", "upload", "history", "comments"
  const [advisories, setAdvisories] = useState([]);
  const [selectedAdvisory, setSelectedAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [toast, setToast] = useState("");

  // Project & Document state
  const [projectId, setProjectId] = useState("proj-501");
  const [projectTitle, setProjectTitle] = useState(
    "Smart IoT Moisture & Nutrient Sensing System for Urban Farming"
  );
  const [contentHtml, setContentHtml] = useState("");
  const [versions, setVersions] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeCollaborators, setActiveCollaborators] = useState([
    { name: "Alex Rivera (You)", role: "Group Leader", status: "Editing", color: "bg-blue-500" },
    { name: "Maria Santos", role: "Lead Developer", status: "Online", color: "bg-emerald-500" },
  ]);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionTag, setVersionTag] = useState("v1.2");
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // Commenting modal / floating selection state
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedTextSnippet, setSelectedTextSnippet] = useState("");
  const [selectedSection, setSelectedSection] = useState("General");
  const [newCommentText, setNewCommentText] = useState("");
  const [replyTextMap, setReplyTextMap] = useState({});

  // Editor ref & word metrics
  const editorRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  // Stats calculation
  const wordCount = contentHtml
    ? contentHtml.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = contentHtml ? contentHtml.replace(/<[^>]*>/g, "").length : 0;
  const pageEstimate = Math.max(1, Math.ceil(wordCount / 350));

  // --- BroadcastChannel for real-time groupmate collaboration ---
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel(`manuscript_channel_${projectId}`);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          if (event.data && event.data.type === "MANUSCRIPT_UPDATE") {
            if (event.data.sender !== userProfile?.uid) {
              setContentHtml(event.data.contentHtml);
              setLastSavedTime(new Date().toLocaleTimeString());
            }
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }
  }, [projectId, userProfile?.uid]);

  // --- Fetch Initial Data ---
  const fetchAdvisories = async () => {
    try {
      const res = await api.get("/manuscripts/advisories/all");
      if (res.data && res.data.data) {
        setAdvisories(res.data.data);
      }
    } catch (err) {
      console.error("[Manuscripts] fetchAdvisories error:", err);
    }
  };

  const fetchDraftAndData = useCallback(async (targetProjectId) => {
    setLoading(true);
    try {
      // 1. Fetch Draft HTML
      const draftRes = await api.get(`/manuscripts/draft/${targetProjectId}`);
      if (draftRes.data && draftRes.data.data) {
        setContentHtml(draftRes.data.data.contentHtml || "");
        if (draftRes.data.data.projectTitle) {
          setProjectTitle(draftRes.data.data.projectTitle);
        }
        setLastSavedTime(
          draftRes.data.data.updatedAt
            ? new Date(draftRes.data.data.updatedAt).toLocaleTimeString()
            : "Just now"
        );
      }

      // 2. Fetch Version History
      const versionsRes = await api.get(`/manuscripts/${targetProjectId}`);
      if (versionsRes.data && versionsRes.data.data) {
        setVersions(versionsRes.data.data);
      }

      // 3. Fetch Comments / Feedback
      const commentsRes = await api.get(`/manuscripts/comments/${targetProjectId}`);
      if (commentsRes.data && commentsRes.data.data) {
        setComments(commentsRes.data.data);
      }
    } catch (err) {
      console.error("[Manuscripts] fetchDraftAndData error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "adviser") {
      fetchAdvisories();
    } else {
      fetchDraftAndData("proj-501");
    }
  }, [role, fetchDraftAndData]);

  // Select an advisory group (for Adviser)
  const handleSelectAdvisoryGroup = (advisory) => {
    setSelectedAdvisory(advisory);
    setProjectId(advisory.id);
    setProjectTitle(advisory.title);
    fetchDraftAndData(advisory.id);
  };

  // --- Auto-Save Live Draft ---
  const saveDraftToBackend = async (newHtml) => {
    setSavingDraft(true);
    try {
      await api.put(`/manuscripts/draft/${projectId}`, {
        contentHtml: newHtml,
        projectTitle,
      });

      setLastSavedTime(new Date().toLocaleTimeString());

      // Broadcast update to groupmates listening
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "MANUSCRIPT_UPDATE",
          contentHtml: newHtml,
          sender: userProfile?.uid,
        });
      }
    } catch (err) {
      console.error("[Manuscripts] saveDraft error:", err);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleEditorInput = (e) => {
    const newHtml = e.target.innerHTML;
    setContentHtml(newHtml);

    // Debounce auto-save by 800ms
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraftToBackend(newHtml);
    }, 800);
  };

  // Format command helper for WYSIWYG editor
  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
      saveDraftToBackend(editorRef.current.innerHTML);
    }
  };

  // Text selection handler for Adviser or Student line comments
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      setSelectedTextSnippet(text);
      
      // Auto-detect section header from selection parent
      let anchor = selection.anchorNode;
      let headerText = "General Manuscript Text";
      while (anchor && anchor !== editorRef.current) {
        if (
          anchor.nodeType === 1 &&
          ["H1", "H2", "H3", "H4"].includes(anchor.tagName)
        ) {
          headerText = anchor.textContent;
          break;
        }
        anchor = anchor.parentNode;
      }
      setSelectedSection(headerText);
    }
  };

  // Open Comment Modal with selected text
  const handleOpenCommentModal = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text) {
      setSelectedTextSnippet(text);
    } else {
      setSelectedTextSnippet("Entire Page / General Document Section");
    }
    setNewCommentText("");
    setCommentModalOpen(true);
  };

  // Submit comment to backend
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await api.post(`/manuscripts/comments/${projectId}`, {
        text: newCommentText,
        selectedText: selectedTextSnippet,
        section: selectedSection,
        page: pageEstimate,
      });

      if (res.data && res.data.data) {
        setComments((prev) => [res.data.data, ...prev]);
        setToast("Feedback / comment added successfully!");
        setCommentModalOpen(false);
        setNewCommentText("");
        setActiveTab("comments");
      }
    } catch (err) {
      alert(`Error saving comment: ${err.message}`);
    }
  };

  // Resolve comment
  const handleToggleResolveComment = async (commentId, currentResolved) => {
    try {
      await api.patch(`/manuscripts/comments/${projectId}/${commentId}`, {
        resolved: !currentResolved,
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved: !currentResolved } : c))
      );
      setToast(
        !currentResolved ? "Comment marked as resolved." : "Comment reopened."
      );
    } catch (err) {
      alert(`Error updating comment: ${err.message}`);
    }
  };

  // Reply to comment
  const handleSendReply = async (commentId) => {
    const replyText = replyTextMap[commentId];
    if (!replyText || !replyText.trim()) return;

    try {
      const res = await api.patch(
        `/manuscripts/comments/${projectId}/${commentId}`,
        {
          replyText: replyText.trim(),
        }
      );

      if (res.data && res.data.data) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? res.data.data : c))
        );
        setReplyTextMap((prev) => ({ ...prev, [commentId]: "" }));
        setToast("Reply posted successfully.");
      }
    } catch (err) {
      alert(`Error sending reply: ${err.message}`);
    }
  };

  // Submit new version snapshot upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!fileName) return alert("Please enter or select a manuscript file name.");

    setUploading(true);
    try {
      await api.post("/manuscripts", {
        projectId,
        projectTitle,
        versionTag,
        fileName,
        fileSize: 5242880, // ~5.2 MB
        notes,
      });

      setToast(`Manuscript version ${versionTag} submitted successfully!`);
      setUploadModalOpen(false);
      setFileName("");
      setNotes("");
      await fetchDraftAndData(projectId);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Update Manuscript overall status (Adviser & Admin)
  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.patch(`/manuscripts/${projectId}/status`, { status: newStatus });
      setToast(`Manuscript status updated to ${newStatus.toUpperCase()}`);
      await fetchDraftAndData(projectId);
    } catch (err) {
      alert(`Status update error: ${err.message}`);
    }
  };

  // Import file text into editor
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const htmlText = await extractTextFromFile(file);
      setContentHtml(htmlText);
      saveDraftToBackend(htmlText);
      setToast(`Imported content from ${file.name} into live draft.`);
      setActiveTab("editor");
    } catch (err) {
      alert(`Import error: ${err.message}`);
    }
  };

  const statusBadges = {
    under_review: { label: "Under Review", variant: "amber", icon: Clock },
    revisions_requested: { label: "Revisions Requested", variant: "blue", icon: AlertTriangle },
    approved: { label: "Approved for Defense", variant: "emerald", icon: CheckCircle2 },
    in_progress: { label: "In Progress", variant: "purple", icon: Edit3 },
  };

  // =========================================================================
  // VIEW 1: ADVISER VIEW ("MY ADVISORY") - LIST OF ADVISORY GROUPS
  // =========================================================================
  if (role === "adviser" && !selectedAdvisory) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="My Advisory"
          description="Review student research groups under your advisory, evaluate live manuscript drafts, and leave line/section feedback."
        />

        {toast && (
          <Toast message={toast} variant="success" onClose={() => setToast("")} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advisories.map((group) => {
            const StatusIcon = statusBadges[group.status]?.icon || Clock;

            return (
              <Card key={group.id} className="p-6 flex flex-col justify-between hover:border-blue-500/50 transition-all duration-200 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="blue" className="font-mono text-xs">
                      {group.groupName}
                    </Badge>
                    <Badge
                      variant={statusBadges[group.status]?.variant || "amber"}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusBadges[group.status]?.label || group.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2">
                      {group.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                      Department: {group.department}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-b border-gray-100 dark:border-slate-800 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      Student Researchers:
                    </span>
                    <div className="space-y-1.5">
                      {group.members.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300"
                        >
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Latest: <strong>{group.latestVersion}</strong></span>
                    <span>Updated {new Date(group.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-5"
                  onClick={() => handleSelectAdvisoryGroup(group)}
                >
                  <Eye className="w-4 h-4 mr-2" /> Review Advisory Manuscript
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MANUSCRIPT WORKSPACE (STUDENT & ADVISER IN-DEPTH REVIEW MODE)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {role === "adviser" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAdvisory(null)}
              className="mr-2"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Advisories
            </Button>
          )}

          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                {projectTitle}
              </h1>
              {selectedAdvisory && (
                <Badge variant="blue" className="font-mono text-xs">
                  {selectedAdvisory.groupName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span>Role: <strong className="capitalize text-gray-700 dark:text-gray-300">{role}</strong></span>
              <span>•</span>
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {savingDraft ? "Saving..." : `Auto-saved at ${lastSavedTime || "just now"}`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {role === "student" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Upload New Version
            </Button>
          )}

          {(role === "adviser" || role === "admin") && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Status:</span>
              <select
                value={selectedAdvisory?.status || "under_review"}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
              >
                <option value="under_review">Under Review</option>
                <option value="revisions_requested">Revisions Requested</option>
                <option value="approved">Approve for Defense</option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCommentModal}
            className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
          >
            <MessageSquare className="w-4 h-4 mr-1.5" /> Add Feedback
          </Button>
        </div>
      </div>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800">
        <div className="flex space-x-1 sm:space-x-4">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "editor"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <Edit3 className="w-4 h-4" /> Live Manuscript Editor (MS Word / Docs)
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Upload & Import File
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <FolderGit2 className="w-4 h-4" /> Version History ({versions.length})
          </button>

          <button
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === "comments"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Adviser Feedback ({comments.length})
          </button>
        </div>

        {/* Live Collaborator Presence Indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
            Co-Authors:
          </span>
          <div className="flex -space-x-1.5 overflow-hidden">
            {activeCollaborators.map((c, i) => (
              <div
                key={i}
                title={`${c.name} (${c.status})`}
                className={`w-6 h-6 rounded-full ${c.color} text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900 cursor-pointer`}
              >
                {c.name[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: LIVE MANUSCRIPT EDITOR (GOOGLE DOCS / MS WORD STYLE) */}
      {activeTab === "editor" && (
        <div className="space-y-4">
          {/* MS Word / Google Docs Toolbar */}
          <Card className="p-2 flex flex-wrap items-center gap-1.5 bg-gray-50 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
            {/* Font Style Dropdown */}
            <select
              onChange={(e) => executeCommand("formatBlock", e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              <option value="P">Normal Text</option>
              <option value="H1">Heading 1 (Title)</option>
              <option value="H2">Heading 2 (Chapter)</option>
              <option value="H3">Heading 3 (Section)</option>
              <option value="BLOCKQUOTE">Quote Block</option>
            </select>

            {/* Font Family Dropdown */}
            <select
              onChange={(e) => executeCommand("fontName", e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block"
            >
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
            </select>

            <div className="h-4 w-[1px] bg-gray-300 dark:bg-slate-700 mx-1" />

            {/* Basic Formatting Buttons */}
            <button
              onClick={() => executeCommand("bold")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("italic")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("underline")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("strikeThrough")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-gray-300 dark:bg-slate-700 mx-1" />

            {/* Alignments */}
            <button
              onClick={() => executeCommand("justifyLeft")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("justifyCenter")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("justifyRight")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("justifyFull")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Justify Text"
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-gray-300 dark:bg-slate-700 mx-1" />

            {/* Lists & Insert */}
            <button
              onClick={() => executeCommand("insertUnorderedList")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => executeCommand("insertOrderedList")}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-gray-300"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-gray-300 dark:bg-slate-700 mx-1" />

            {/* Export Options */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToDocx(contentHtml, `${projectTitle}_Draft.docx`, projectTitle)}
                title="Download formatted DOCX file"
                className="text-xs"
              >
                <FileDown className="w-3.5 h-3.5 mr-1 text-blue-600" /> Export .DOCX
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToPdf(contentHtml, `${projectTitle}_Draft.pdf`, projectTitle)}
                title="Download formatted PDF file"
                className="text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-red-600" /> Export .PDF
              </Button>
            </div>
          </Card>

          {/* Paginated Paper Editor Canvas (Google Docs style page container) */}
          <div className="bg-gray-100 dark:bg-slate-950 p-6 sm:p-10 rounded-2xl border border-gray-200 dark:border-slate-800 flex justify-center min-h-[750px] shadow-inner overflow-x-auto">
            <div className="w-full max-w-[850px] bg-white text-gray-900 shadow-xl rounded-sm p-10 sm:p-16 min-h-[900px] border border-gray-200 dark:border-slate-300 relative transition-all">
              {/* Floating selection tooltip helper */}
              <div className="mb-4 pb-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-400 select-none">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Document View • Times New Roman 12pt
                </span>
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Highlight text to leave Adviser Feedback
                </span>
              </div>

              {/* Rich Editable Content Canvas */}
              <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleEditorInput}
                onMouseUp={handleTextSelection}
                onKeyUp={handleTextSelection}
                className="focus:outline-none min-h-[750px] prose prose-slate max-w-none text-justify leading-relaxed"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          </div>

          {/* Footer Metrics Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Estimated Pages: <strong className="text-gray-700 dark:text-gray-300">{pageEstimate}</strong></span>
              <span>Words: <strong className="text-gray-700 dark:text-gray-300">{wordCount}</strong></span>
              <span>Characters: <strong className="text-gray-700 dark:text-gray-300">{charCount}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-time Draft Synchronization Active</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD & IMPORT FILE */}
      {activeTab === "upload" && (
        <Card className="p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Upload or Import Manuscript Draft Files
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload existing .DOCX or .PDF files from your computer or import text directly into your active group manuscript editor canvas.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:border-blue-500 transition bg-gray-50/50 dark:bg-slate-900/50">
            <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Select or Drag & Drop Manuscript File (.docx, .pdf, .txt)
            </h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Maximum file size: 25 MB
            </p>

            <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md hover:bg-blue-700 transition">
              <File className="w-4 h-4 mr-2" /> Browse File to Import into Live Editor
              <input
                type="file"
                accept=".docx,.pdf,.txt,.html"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </Card>
      )}

      {/* TAB 3: VERSION HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {versions.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No Version History Yet"
                description="Students can upload formal version releases (v1.0, v1.1) to keep milestone backups."
              />
            </Card>
          ) : (
            versions.map((ms) => {
              const StatusIcon = statusBadges[ms.status]?.icon || Clock;
              const formattedSize = (ms.fileSize / (1024 * 1024)).toFixed(2);

              return (
                <Card key={ms.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <File className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="blue" className="font-mono">
                            {ms.versionNumber}
                          </Badge>
                          <Badge
                            variant={statusBadges[ms.status]?.variant || "amber"}
                            className="flex items-center gap-1"
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusBadges[ms.status]?.label || ms.status}
                          </Badge>
                        </div>

                        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                          {ms.fileName}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>
                            Uploaded by{" "}
                            <strong className="text-gray-700 dark:text-gray-300">
                              {ms.uploaderName}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>{formattedSize} MB</span>
                          <span>•</span>
                          <span>{new Date(ms.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={ms.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
                      </Button>
                    </a>
                  </div>

                  {ms.notes && (
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300">
                      <strong className="text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] block mb-0.5">
                        Release Notes:
                      </strong>
                      {ms.notes}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: ADVISER FEEDBACK & COMMENTS */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Adviser Comments & Text Feedback ({comments.length})
            </h2>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCommentModal}
            >
              <Plus className="w-4 h-4 mr-1" /> Add New Feedback
            </Button>
          </div>

          {comments.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={MessageSquare}
                title="No Feedback Left Yet"
                description="Advisers can highlight manuscript text or sections and leave line feedback."
              />
            </Card>
          ) : (
            comments.map((comm) => (
              <Card
                key={comm.id}
                className={`p-5 space-y-3 transition border-l-4 ${
                  comm.resolved
                    ? "border-l-emerald-500 bg-gray-50/50 dark:bg-slate-900/50"
                    : "border-l-amber-500"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {comm.authorName}
                      </span>
                      <Badge variant="amber" className="text-[10px] uppercase">
                        {comm.authorRole}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Section: {comm.section || "General Document"}
                    </p>
                  </div>

                  <Button
                    variant={comm.resolved ? "outline" : "primary"}
                    size="sm"
                    onClick={() =>
                      handleToggleResolveComment(comm.id, comm.resolved)
                    }
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {comm.resolved ? "Reopen" : "Mark Resolved"}
                  </Button>
                </div>

                {/* Highlighted text snippet */}
                {comm.selectedText && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 font-mono italic">
                    "{comm.selectedText}"
                  </div>
                )}

                {/* Comment text */}
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {comm.text}
                </p>

                {/* Reply list */}
                {comm.replies && comm.replies.length > 0 && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-slate-800 space-y-2 mt-2">
                    {comm.replies.map((reply) => (
                      <div key={reply.id} className="text-xs space-y-0.5">
                        <span className="font-bold text-gray-800 dark:text-gray-200 mr-2">
                          {reply.authorName}:
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {reply.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply box */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Write a reply to this feedback..."
                    value={replyTextMap[comm.id] || ""}
                    onChange={(e) =>
                      setReplyTextMap({
                        ...replyTextMap,
                        [comm.id]: e.target.value,
                      })
                    }
                    className="text-xs py-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendReply(comm.id)}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: ADD COMMENT / ADVISER FEEDBACK */}
      <Modal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        title="Add Adviser Feedback & Line Comment"
        icon={MessageSquare}
      >
        <form onSubmit={handleSubmitComment} className="space-y-4">
          {selectedTextSnippet && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Selected Text Highlight:
              </label>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 text-xs font-mono text-amber-900 dark:text-amber-300">
                "{selectedTextSnippet}"
              </div>
            </div>
          )}

          <Input
            label="Manuscript Section / Chapter"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            required
          />

          <Textarea
            label="Adviser Feedback / Correction Details"
            rows={4}
            placeholder="Type your recommendations, required literature citations, or structural corrections..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCommentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Feedback
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: UPLOAD MANUSCRIPT VERSION MODAL */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Formal Manuscript Version"
        icon={UploadCloud}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Version Tag
            </label>
            <div className="flex gap-2">
              {["v1.0", "v1.1", "v1.2", "v2.0"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersionTag(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
                    versionTag === v
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Manuscript File Name (.pdf / .docx)"
            type="text"
            placeholder="e.g. CoreResearch_Manuscript_v1.2.pdf"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
          />

          <Textarea
            label="Revision Release Notes"
            rows={3}
            placeholder="Describe key revisions made in this manuscript version..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              Submit Version
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
