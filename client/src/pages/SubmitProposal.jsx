// src/pages/SubmitProposal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
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

const EMPTY_FORM = {
  title: "",
  rationale: "",
  objectives: "",
  scopeAndDelimitation: "",
  methodology: "",
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
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [group, setGroup] = useState(null);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [existingProposal, setExistingProposal] = useState(null);

  // File attachment state
  const [pendingFiles, setPendingFiles] = useState([]); // File[] — not yet uploaded
  const [existingAttachments, setExistingAttachments] = useState([]); // already saved
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

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
          setFormData({
            title: proposal.title || "",
            rationale: proposal.rationale || "",
            objectives: proposal.objectives || "",
            scopeAndDelimitation: proposal.scopeAndDelimitation || "",
            methodology: proposal.methodology || "",
          });
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
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (requireAll = true) => {
    const errors = {};
    if (!formData.title.trim()) errors.title = "Research Title is required.";
    
    const hasFiles = pendingFiles.length > 0 || existingAttachments.length > 0;

    if (requireAll && !hasFiles) {
      if (!formData.rationale.trim())
        errors.rationale = "Rationale / Background is required. (Or attach a document)";
      if (!formData.objectives.trim())
        errors.objectives = "Research Objectives are required. (Or attach a document)";
      if (!formData.scopeAndDelimitation.trim())
        errors.scopeAndDelimitation = "Scope and Delimitation is required. (Or attach a document)";
      if (!formData.methodology.trim())
        errors.methodology = "Methodology is required. (Or attach a document)";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── File handling ─────────────────────────────────────────────────────────────
  const handleFilePick = (e) => {
    setFileError("");
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
    const uploaded = [];
    for (const file of pendingFiles) {
      const result = await storageService.uploadFile(
        file,
        `proposals/${proposalId}/documents`
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
    return [...existingAttachments, ...uploaded];
  };

  const buildContentPayload = () => ({
    title: formData.title.trim(),
    rationale: formData.rationale.trim(),
    objectives: formData.objectives.trim(),
    scopeAndDelimitation: formData.scopeAndDelimitation.trim(),
    methodology: formData.methodology.trim(),
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
    setUploading(pendingFiles.length > 0);
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
        if (pendingFiles.length > 0) {
          const attachments = await uploadAndGetAttachments(created.id);
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
      setError("Please complete all required fields before submitting.");
      return;
    }
    if (!group) {
      setError("You must be in a research group before submitting a proposal.");
      return;
    }
    setSubmitting(true);
    setError("");
    setUploading(pendingFiles.length > 0);
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
    : "Submit Title Proposal";
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
            <FileText className="w-6 h-6 text-primary" />
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {isResubmitMode
              ? "Address the coordinator's feedback and resubmit."
              : "Fill in all required fields, OR simply attach your proposal document below."}
          </p>
          {group && (
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-2">
              Submitting for:{" "}
              <span className="text-gray-800 dark:text-gray-200">{group.name}</span>
              {course && (
                <> · <span className="text-gray-800 dark:text-gray-200">{course.code || course.name}</span></>
              )}
              {section && (
                <> · <span className="text-gray-800 dark:text-gray-200">{section.name}</span></>
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
              placeholder="e.g. AI-Based Research Management System for Academic Institutions"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
            {validationErrors.title && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.title}</p>
            )}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 mb-2">
             <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-primary" />
                The following text fields are <strong>optional</strong> if you attach a proposal document (PDF, DOCX, etc.) at the bottom of the page.
             </p>
          </div>

          {/* Rationale */}
          <div>
            <Textarea
              label="Rationale / Background (Optional if document attached)"
              rows={5}
              placeholder="Explain the background problem, context, significance of the study, and motivations for conducting this research..."
              value={formData.rationale}
              onChange={(e) => handleChange("rationale", e.target.value)}
            />
            {validationErrors.rationale && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.rationale}</p>
            )}
          </div>

          {/* Objectives */}
          <div>
            <Textarea
              label="Specific Research Objectives (Optional if document attached)"
              rows={4}
              placeholder="1. Design the system architecture&#10;2. Implement the core modules&#10;3. Validate and evaluate system performance..."
              value={formData.objectives}
              onChange={(e) => handleChange("objectives", e.target.value)}
            />
            {validationErrors.objectives && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.objectives}</p>
            )}
          </div>

          {/* Scope */}
          <div>
            <Textarea
              label="Scope and Delimitation (Optional if document attached)"
              rows={4}
              placeholder="Define the coverage, target users, system boundaries, limitations, and excluded features..."
              value={formData.scopeAndDelimitation}
              onChange={(e) => handleChange("scopeAndDelimitation", e.target.value)}
            />
            {validationErrors.scopeAndDelimitation && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.scopeAndDelimitation}</p>
            )}
          </div>

          {/* Methodology */}
          <div>
            <Textarea
              label="Methodology (Optional if document attached)"
              rows={5}
              placeholder="Describe the research framework, system design, data collection approach, development methodology, and evaluation strategy..."
              value={formData.methodology}
              onChange={(e) => handleChange("methodology", e.target.value)}
            />
            {validationErrors.methodology && (
              <p className="mt-1 text-xs text-red-500 font-medium">{validationErrors.methodology}</p>
            )}
          </div>

          {/* ── Document Attachment Section ─────────────────────────────────── */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Supporting Documents
                <span className="font-normal text-gray-400 normal-case tracking-normal ml-1">
                  (PDF, DOC, DOCX, PPT, PPTX · max {MAX_FILE_SIZE_MB}MB each)
                </span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                disabled={isBusy}
              >
                <Upload className="w-3.5 h-3.5" />
                Attach File
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
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
                  >
                    <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {FILE_TYPE_LABELS[file.type] || "FILE"} · {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition"
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
                className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition"
              >
                <Upload className="w-7 h-7 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Click to attach supporting documents
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  PDF, DOC, DOCX, PPT, PPTX · up to {MAX_FILE_SIZE_MB}MB each
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
                  isLoading={savingDraft}
                  disabled={submitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={submitting || (uploading && !savingDraft)}
                disabled={savingDraft || !group}
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
