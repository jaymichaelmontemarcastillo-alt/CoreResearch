// src/pages/SubmitProposal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import {
  FileText,
  ArrowLeft,
  Send,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Paperclip,
  X,
  FileIcon,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { groupService } from "../services/group.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import titleProposalService from "../services/titleProposal.service";
import { storageService } from "../services/storage.service";

// ─── Allowed file types ────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ".pdf,.doc,.docx,.ppt,.pptx";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const FILE_TYPE_LABELS = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Circular Progress Component
const CircularProgress = ({ progress }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        {/* Track */}
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
        {/* Progress indicator */}
        <circle
          className="text-primary transition-all duration-300 ease-out"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="48"
          cy="48"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export const SubmitProposal = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);
  const fileInputRef = useRef(null);

  const studentUid = currentUser?.uid || userProfile?.uid || "";
  const studentName =
    userProfile?.fullName ||
    `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
    currentUser?.email ||
    "Student";

  // ── State ────────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState(null);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [existingProposal, setExistingProposal] = useState(null);

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState([]); // File[] — not yet uploaded
  const [existingAttachments, setExistingAttachments] = useState([]); // already saved
  const [fileError, setFileError] = useState("");
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [groupProposals, setGroupProposals] = useState([]);

  // ── Load everything on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      setError("");
      try {
        // 1. Load the student's research group
        const g = await groupService.getGroupByStudentId(studentUid);
        setGroup(g);

        if (g) {
          const allCourses = await courseService.getAllCourses();
          const foundCourse = allCourses.find((c) => c.id === g.courseId);
          setCourse(foundCourse);

          if (foundCourse) {
            const sections = await sectionService.getSectionsByCourseId(foundCourse.id);
            const foundSection = sections.find((s) => s.id === g.sectionId);
            setSection(foundSection);
          }

          // Fetch all proposals for this group to check for duplicates
          const proposals = await titleProposalService.getProposalsByGroup(g.id);
          setGroupProposals(proposals || []);
        }

        // 2. If editing, load the existing proposal
        if (editId) {
          const proposal = await titleProposalService.getProposalById(editId);
          if (!proposal) {
            setError("Proposal not found.");
            return;
          }
          if (!titleProposalService.canStudentEdit(proposal.status)) {
            setError(
              "This proposal cannot be edited. Only drafts and proposals needing revision can be edited."
            );
            return;
          }
          setExistingProposal(proposal);
          setTitle(proposal.title || "");
          setExistingAttachments(proposal.attachments || []);
        }
      } catch (err) {
        setError(`Failed to load page: ${err.message}`);
      } finally {
        setPageLoading(false);
      }
    };

    if (studentUid) init();
  }, [editId, studentUid]);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const handleTitleChange = (val) => {
    setTitle(val);
    if (validationErrors.title) {
      setValidationErrors((prev) => ({ ...prev, title: "" }));
    }
  };

  const validateForm = (requireAll = true) => {
    const errors = {};
    if (!title.trim()) errors.title = "Research Title is required.";
    
    const hasFiles = pendingFiles.length > 0 || existingAttachments.length > 0;

    // For importing, if we are fully submitting (requireAll = true), they MUST have a document.
    if (requireAll && !hasFiles) {
      errors.files = "A proposal document must be attached to submit.";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── File handling ─────────────────────────────────────────────────────────────
  const handleFilePick = (e) => {
    setFileError("");
    if (validationErrors.files) {
       setValidationErrors((prev) => ({ ...prev, files: "" }));
    }

    const newFiles = Array.from(e.target.files || []);
    const valid = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        continue;
      }
      if (!Object.keys(FILE_TYPE_LABELS).includes(file.type)) {
        setFileError(`"${file.name}" is not a supported file type (PDF, DOC, DOCX, PPT, PPTX).`);
        continue;
      }

      // Prevent duplicate documents from the same group
      let isDuplicate = false;
      for (const p of groupProposals) {
        if (p.id === editId) continue; // ignore the proposal currently being edited
        if (p.attachments?.some(a => a.fileName === file.name)) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        setFileError(`A document named "${file.name}" has already been submitted by your group in another proposal.`);
        continue;
      }

      valid.push(file);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    // reset input so same file can be re-picked after removing
    e.target.value = "";
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload pending files and return combined attachment array
  const uploadAndGetAttachments = async (proposalId) => {
    if (pendingFiles.length === 0) return existingAttachments;
    
    setUploading(true);
    setOverallProgress(0);
    
    const uploaded = [];
    
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        
        // Progress base per file (e.g. if 2 files, 0-50% is first file, 50-100% is second file)
        const baseProgress = (i / pendingFiles.length) * 100;
        const progressSlice = 100 / pendingFiles.length;

        const result = await storageService.uploadFileWithProgress(
          file,
          `proposals/${proposalId}/documents`,
          (fileProgress) => {
            const currentOverall = baseProgress + (fileProgress / 100) * progressSlice;
            setOverallProgress(currentOverall);
          }
        );
        uploaded.push({
          fileName: file.name,
          downloadUrl: result.downloadUrl,
          fullPath: result.fullPath,
          fileSize: file.size,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }
    } finally {
      // Keep uploading true until the DB save finishes to prevent closing modal too early
      // but let the progress hit 100
      setOverallProgress(100);
    }
    
    return [...existingAttachments, ...uploaded];
  };

  const buildContentPayload = () => ({
    title: title.trim(),
    // Keep empty strings for legacy fields just in case they are required elsewhere
    rationale: "",
    objectives: "",
    scopeAndDelimitation: "",
    methodology: "",
  });

  const buildGroupContext = () => ({
    groupId: group?.id || "",
    groupName: group?.name || "",
    courseId: course?.id || "",
    courseName: course?.code || course?.name || "",
    sectionId: section?.id || "",
    sectionName: section?.name || "",
    submittedByUid: studentUid,
    submittedByName: studentName,
  });

  // ── Save Draft ────────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!validateForm(false)) return;
    if (!group) {
      setError("You must be in a research group before saving a proposal.");
      return;
    }
    setSavingDraft(true);
    setError("");
    try {
      const content = buildContentPayload();
      if (isEditMode && existingProposal) {
        const attachments = await uploadAndGetAttachments(editId);
        await titleProposalService.saveDraft(editId, { ...content, attachments });
      } else {
        const created = await titleProposalService.createProposal({
          ...content,
          ...buildGroupContext(),
          status: "draft",
        });
        const attachments = await uploadAndGetAttachments(created.id);
        if (attachments.length > 0) {
          await titleProposalService.updateProposal(created.id, { attachments });
        }
      }
      navigate("/proposals", {
        state: { successMessage: "Draft saved successfully." },
      });
    } catch (err) {
      setError(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
      setUploading(false);
    }
  };

  // ── Submit (or Resubmit) ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) {
      setError("Please complete all required fields and attach your document before submitting.");
      return;
    }
    if (!group) {
      setError("You must be in a research group before submitting a proposal.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const content = buildContentPayload();
      const isResubmit = isEditMode && existingProposal?.status === "needs_revision";

      if (isResubmit) {
        const attachments = await uploadAndGetAttachments(editId);
        await titleProposalService.resubmitProposal(
          editId,
          { ...content, attachments },
          studentUid,
          studentName
        );
      } else if (isEditMode && existingProposal?.status === "draft") {
        const attachments = await uploadAndGetAttachments(editId);
        await titleProposalService.updateProposal(editId, { ...content, attachments });
        await titleProposalService.submitProposal(editId, studentUid, studentName);
      } else {
        // New proposal: create draft → upload files → submit
        const created = await titleProposalService.createProposal({
          ...content,
          ...buildGroupContext(),
          status: "draft",
        });
        const attachments = await uploadAndGetAttachments(created.id);
        if (attachments.length > 0) {
          await titleProposalService.updateProposal(created.id, { attachments });
        }
        await titleProposalService.submitProposal(created.id, studentUid, studentName);
      }
      navigate("/proposals", {
        state: { successMessage: "Proposal submitted successfully." },
      });
    } catch (err) {
      setError(err.message || "Failed to submit proposal.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────────
  const isResubmitMode = isEditMode && existingProposal?.status === "needs_revision";
  const pageTitle = isResubmitMode
    ? "Revise & Resubmit Proposal"
    : isEditMode
    ? "Edit Draft Proposal"
    : "Import Title Proposal";
  const isBusy = submitting || savingDraft;

  if (pageLoading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading form...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Upload Progress Modal */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 flex flex-col items-center w-72 text-center border border-gray-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Uploading Document...
            </h3>
            <CircularProgress progress={overallProgress} />
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Please do not close this page.
            </p>
          </div>
        </div>
      )}

      <Link
        to="/proposals"
        className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Proposals
      </Link>

      {/* Coordinator Feedback Banner (revision mode) */}
      {isResubmitMode && existingProposal?.coordinatorFeedback && (
        <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">
                Coordinator Feedback
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed whitespace-pre-line">
                {existingProposal.coordinatorFeedback}
              </p>
              {existingProposal.coordinatorName && (
                <p className="text-xs text-blue-500 mt-2">
                  — {existingProposal.coordinatorName}
                  {existingProposal.reviewedAt && (
                    <> · {new Date(existingProposal.reviewedAt).toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-slate-800 pb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Upload className="w-6 h-6 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {isResubmitMode
              ? "Address the coordinator's feedback by uploading your revised document."
              : "Simply provide your research title and import your proposal document."}
          </p>
          {group && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
              Submitting for:{" "}
              <span className="text-gray-800 dark:text-gray-200">{group.name}</span>
              {course && (
                <> · <span className="text-gray-800 dark:text-gray-200">{course.code || course.name}</span></>
              )}
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!group && !pageLoading && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You must be assigned to a research group before submitting a proposal.
              Please contact your Research Coordinator.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Research Title */}
          <div>
            <Input
              label="Research Title *"
              type="text"
              placeholder="e.g. AI-Based Research Management System"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.title}</p>
            )}
          </div>

          {/* ── Document Attachment Section ─────────────────────────────────── */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Import Proposal Document *
                <span className="font-normal text-gray-400 normal-case tracking-normal ml-1">
                  (PDF, DOC, DOCX, PPT, PPTX · max {MAX_FILE_SIZE_MB}MB)
                </span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                disabled={isBusy}
              >
                <Upload className="w-3.5 h-3.5" />
                Browse File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES}
                onChange={handleFilePick}
                className="hidden"
              />
            </div>

            {validationErrors.files && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1 mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {validationErrors.files}
              </p>
            )}

            {fileError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {fileError}
              </p>
            )}

            {/* Already-saved attachments (edit mode) */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Previously Uploaded
                </p>
                {existingAttachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                  >
                    <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={att.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:underline truncate block"
                      >
                        {att.fileName}
                      </a>
                      <p className="text-[10px] text-gray-400">
                        {FILE_TYPE_LABELS[att.contentType] || "FILE"} · {formatBytes(att.fileSize)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(i)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition"
                      disabled={isBusy}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending (to-be-uploaded) files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {existingAttachments.length > 0 && (
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    New Files (will upload on save)
                  </p>
                )}
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10"
                  >
                    <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-400">
                          {FILE_TYPE_LABELS[file.type] || "FILE"} · {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition"
                      disabled={isBusy}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {existingAttachments.length === 0 && pendingFiles.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition"
              >
                <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Upload className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Drop your document here or <span className="text-primary">browse</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Supported: PDF, DOCX, PPTX (max {MAX_FILE_SIZE_MB}MB)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100 dark:border-slate-800">
            <Link to="/proposals">
              <Button type="button" variant="outline" disabled={isBusy}>
                Cancel
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              {!isResubmitMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isBusy || !group}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isBusy || !group}
              >
                {isResubmitMode ? (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Resubmit Proposal</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Proposal</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SubmitProposal;
