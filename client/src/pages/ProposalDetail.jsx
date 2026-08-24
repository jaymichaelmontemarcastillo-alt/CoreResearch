// src/pages/ProposalDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiExclamationTriangle,
  HiClock,
  HiTag,
  HiPencilSquare,
  HiTrash,
  HiCalendarDays,
  HiDocumentText,
  HiShieldExclamation,
  HiUsers,
  HiBookOpen,
  HiChatBubbleLeftRight,
  HiArrowPath,
  HiSparkles,
  HiDocumentDuplicate,
  HiUser,
  HiShieldCheck,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import titleProposalService from "../services/titleProposal.service";
import researchWorkspaceService from "../services/researchWorkspace.service";
import manuscriptDocumentAdapter from "../services/manuscriptDocumentAdapter";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

// Icons for each status
const STATUS_ICONS = {
  draft: HiDocumentDuplicate,
  submitted: HiClock,
  needs_revision: HiExclamationTriangle,
  approved: HiCheckCircle,
};

const DocumentViewer = ({ attachment }) => {
  if (!attachment) return null;

  const isPdf = attachment.contentType === 'application/pdf' || attachment.fileName.toLowerCase().endsWith('.pdf');
  const isOffice = [
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-powerpoint', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ].includes(attachment.contentType) || 
  /\.(doc|docx|ppt|pptx)$/i.test(attachment.fileName);

  if (isPdf) {
    return (
      <div className="w-full h-[700px] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 shadow-inner">
        <iframe 
          src={attachment.downloadUrl} 
          title={attachment.fileName}
          className="w-full h-full"
          frameBorder="0"
        />
      </div>
    );
  }

  if (isOffice) {
    const encodedUrl = encodeURIComponent(attachment.downloadUrl);
    const googleDocsViewer = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
    return (
      <div className="w-full h-[700px] border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-900 shadow-inner">
        <iframe 
          src={googleDocsViewer} 
          title={attachment.fileName}
          className="w-full h-full"
          frameBorder="0"
        />
      </div>
    );
  }

  return (
    <div className="p-8 border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl text-center">
      <HiDocumentText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Preview not available for this file type.
      </p>
      <a 
        href={attachment.downloadUrl} 
        target="_blank" 
        rel="noreferrer"
        className="mt-3 inline-block text-xs font-bold bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
      >
        Download {attachment.fileName}
      </a>
    </div>
  );
};

export const ProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, role } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState(false);

  const uid = currentUser?.uid || userProfile?.uid;
  const isStudent = role === "student";
  const isCoordinator = role === "research_coordinator" || role === "admin";

  useEffect(() => {
    const fetchProposal = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await titleProposalService.getProposalById(id);
        if (!data) throw new Error("Proposal not found.");
        setProposal(data);
      } catch (err) {
        setError(err.message || "Failed to load proposal details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProposal();
  }, [id]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitDraft = async () => {
    if (!proposal || !currentUser) return;
    setSubmitting(true);
    try {
      const studentUid = currentUser.uid;
      const studentName = userProfile?.fullName || currentUser.email?.split('@')[0] || 'Student';
      await titleProposalService.submitProposal(proposal.id, studentUid, studentName);
      setToast("Proposal submitted successfully to coordinator review queue!");
      await fetchProposal();
    } catch (err) {
      alert(`Error submitting proposal: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this proposal draft?")) return;
    setDeleting(true);
    try {
      await titleProposalService.deleteProposal(proposal.id, uid);
      navigate("/proposals", { replace: true });
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 dark:text-gray-500">
        Loading proposal details...
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-4">
        <Link
          to="/proposals"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <HiArrowLeft className="w-4 h-4" /> Back to Proposals
        </Link>
        <Card className="p-8 text-center text-red-500">
          <HiShieldExclamation className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold">{error || "Proposal not found."}</p>
        </Card>
      </div>
    );
  }

  const cfg = PROPOSAL_STATUS_CONFIG[proposal.status] ?? {
    label: proposal.status,
    variant: "gray",
  };
  const StatusIcon = STATUS_ICONS[proposal.status] ?? HiClock;

  const canEdit = isStudent && (proposal.status === "draft" || proposal.status === "needs_revision");
  const canDelete = isStudent && proposal.status === "draft";
  const isApproved = proposal.status === "approved";
  const needsRevision = proposal.status === "needs_revision";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back navigation + student actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={isCoordinator ? "/coordinator/proposals" : "/proposals"}
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <HiArrowLeft className="w-4 h-4" />
          {isCoordinator ? "Back to Review Queue" : "Back to Proposals"}
        </Link>

        {isStudent && (
          <div className="flex items-center gap-2">
            {proposal.status === "draft" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitDraft}
                isLoading={submitting}
              >
                <Send className="w-4 h-4 mr-1.5" />
                Submit for Review
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/proposals/new?edit=${proposal.id}`)}
              >
                <HiPencilSquare className="w-4 h-4 mr-1.5 text-blue-600" />
                {needsRevision ? "Revise Proposal" : "Edit Draft"}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={deleting}
              >
                <HiTrash className="w-4 h-4 mr-1.5" />
                Delete
              </Button>
            )}
          </div>
        )}

        {isCoordinator && proposal.status === "submitted" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/coordinator/proposals/${proposal.id}`)}
          >
            <HiShieldCheck className="w-4 h-4 mr-1.5" />
            Review This Proposal
          </Button>
        )}
      </div>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* ── DRAFT BANNER ────────────────────────────────────────────────────── */}
      {proposal.status === "draft" && isStudent && (
        <div className="p-5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileEdit className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Draft Proposal — Awaiting Submission
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                This title proposal is currently saved as a draft. Click "Submit for Review" to send it to the Coordinator evaluation queue.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitDraft}
            isLoading={submitting}
            className="shrink-0"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Submit for Review
          </Button>
        </div>
      )}

      {/* ── APPROVED BANNER ─────────────────────────────────────────────────── */}
      {isApproved && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <HiSparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  Proposal Approved
                </h2>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  Your research title proposal has been approved by the Research
                  Coordinator.
                </p>
                <div className="mt-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <HiBookOpen className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    Next Stage: Chapter 1–3 Manuscript Development
                  </span>
                </div>
                <div className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg inline-block border border-emerald-200/60 dark:border-emerald-800/40">
                  Adviser Matching: Available in Phase 2 after proposal approval.
                </div>
                {proposal.coordinatorName && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
                    Approved by {proposal.coordinatorName}
                    {proposal.approvedAt && (
                      <> · {new Date(proposal.approvedAt).toLocaleDateString()}</>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={async () => {
                  try {
                    const ws = await researchWorkspaceService.getOrCreateWorkspaceForProposal(proposal, userProfile);
                    const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(ws, userProfile);
                    if (ws.documentId !== doc.documentId) {
                      await researchWorkspaceService.linkDocumentId(ws.id, doc.documentId);
                    }
                    navigate(doc.editorUrl);
                  } catch (e) {
                    navigate('/research/workspace');
                  }
                }}
              >
                <HiBookOpen className="w-4 h-4 mr-2" />
                Open Manuscript
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEEDS REVISION BANNER ───────────────────────────────────────────── */}
      {needsRevision && (
        <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-start gap-3">
            <HiChatBubbleLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1.5">
                Coordinator Feedback — Revision Required
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed whitespace-pre-line">
                {proposal.coordinatorFeedback || "The coordinator has requested revisions. Please check with your coordinator for details."}
              </p>
              {proposal.coordinatorName && (
                <p className="text-xs text-blue-500 dark:text-blue-500 mt-2">
                  — {proposal.coordinatorName}
                  {proposal.reviewedAt && (
                    <> · {new Date(proposal.reviewedAt).toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
          </div>
          {isStudent && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/proposals/new?edit=${proposal.id}`)}
              >
                <HiArrowPath className="w-4 h-4 mr-2" />
                Revise &amp; Resubmit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN PROPOSAL CARD ──────────────────────────────────────────────── */}
      <Card className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-gray-200 dark:border-slate-800">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={cfg.variant}
                className="flex items-center gap-1"
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </Badge>
              {proposal.researchCategory && (
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <HiTag className="w-3 h-3 text-primary" />
                  {proposal.researchCategory}
                </span>
              )}
              {proposal.revisionCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
                  Revision #{proposal.revisionCount}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              {proposal.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <HiUsers className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Group:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {proposal.groupName || "—"}
                  </strong>
                </span>
              </div>
              {proposal.courseName && (
                <div className="flex items-center gap-1.5">
                  <HiBookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-gray-700 dark:text-gray-300">
                      {proposal.courseName}
                    </strong>
                    {proposal.sectionName && (
                      <> · {proposal.sectionName}</>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <HiUser className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Submitted by:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {proposal.submittedByName || "—"}
                  </strong>
                </span>
              </div>
              {proposal.submittedAt && (
                <div className="flex items-center gap-1.5">
                  <HiCalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {new Date(proposal.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Structured Text Content Sections */}
        {(proposal.description || proposal.rationale || proposal.objectives || proposal.scopeAndDelimitation || proposal.methodology) && (
          <div className="space-y-4 pt-2">
            {(proposal.description || proposal.rationale) && (
              <ContentSection
                icon={FileText}
                title="Research Purpose / Rationale"
                content={proposal.description || proposal.rationale}
              />
            )}
            {proposal.objectives && (
              <ContentSection
                icon={Target}
                title="Research Objectives"
                content={proposal.objectives}
              />
            )}
            {proposal.scopeAndDelimitation && (
              <ContentSection
                icon={ShieldAlert}
                title="Scope and Delimitation"
                content={proposal.scopeAndDelimitation}
              />
            )}
            {proposal.methodology && (
              <ContentSection
                icon={Compass}
                title="Proposed Methodology"
                content={proposal.methodology}
              />
            )}
          </div>
        )}

        {/* Document Viewer Section */}
        {proposal.attachments && proposal.attachments.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <HiDocumentText className="w-4 h-4 text-primary" />
                Proposal Document
              </h3>
              <DocumentViewer attachment={proposal.attachments[0]} />
            </div>
          </div>
        )}
      </Card>

      {/* ── SUBMISSION INFO (meta card) ─────────────────────────────────────── */}
      <Card className="p-5">
        <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider mb-4">
          Submission Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Status" value={cfg.label} />
          <InfoRow
            label="Created"
            value={new Date(proposal.createdAt).toLocaleString()}
          />
          {proposal.submittedAt && (
            <InfoRow
              label="First Submitted"
              value={new Date(proposal.submittedAt).toLocaleString()}
            />
          )}
          {proposal.lastSubmittedAt && proposal.revisionCount > 0 && (
            <InfoRow
              label="Last Submitted"
              value={new Date(proposal.lastSubmittedAt).toLocaleString()}
            />
          )}
          {proposal.revisionCount > 0 && (
            <InfoRow
              label="Revision Count"
              value={`#${proposal.revisionCount}`}
            />
          )}
          {proposal.coordinatorName && (
            <InfoRow label="Reviewed By" value={proposal.coordinatorName} />
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ContentSection = ({ icon: Icon, title, content }) => (
  <div className="space-y-2">
    <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-primary" />
      <span dangerouslySetInnerHTML={{ __html: title }} />
    </h3>
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
      {content || <span className="text-gray-400 italic">Not provided.</span>}
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
  </div>
);

export default ProposalDetail;
