// src/pages/ProposalDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Tag,
  Edit,
  Trash2,
  Calendar,
  FileText,
  Target,
  ShieldAlert,
  Compass,
  Users,
  BookOpen,
  MessageSquare,
  RefreshCw,
  Sparkles,
  FileEdit,
  User,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import titleProposalService from "../services/titleProposal.service";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

// Icons for each status
const STATUS_ICONS = {
  draft: FileEdit,
  submitted: Clock,
  needs_revision: AlertTriangle,
  approved: CheckCircle2,
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
      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
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
  const { role, userProfile, currentUser } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchProposal = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await titleProposalService.getProposalById(id);
      if (!data) {
        setError("Proposal not found.");
      } else {
        setProposal(data);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch proposal details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const handleDelete = async () => {
    if (!proposal) return;
    if (!window.confirm(`Delete proposal: "${proposal.title}"?`)) return;
    setDeleting(true);
    try {
      await titleProposalService.deleteProposal(proposal.id);
      setToast("Proposal deleted.");
      setTimeout(() => navigate("/proposals"), 1000);
    } catch (err) {
      alert(`Error: ${err.message}`);
      setDeleting(false);
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
        Loading proposal...
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-500 font-semibold">{error || "Proposal not found."}</p>
        <Link to="/proposals">
          <Button variant="outline">Back to Proposals</Button>
        </Link>
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const cfg = PROPOSAL_STATUS_CONFIG[proposal.status] ?? {
    label: proposal.status,
    variant: "gray",
  };
  const StatusIcon = STATUS_ICONS[proposal.status] ?? Clock;
  const isStudent = role === "student";
  const isCoordinator =
    role === "research_coordinator" || role === "admin";
  const canEdit = isStudent && titleProposalService.canStudentEdit(proposal.status);
  const canDelete = isStudent && titleProposalService.canStudentDelete(proposal.status);
  const isApproved = proposal.status === "approved";
  const needsRevision = proposal.status === "needs_revision";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back navigation + student actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={isCoordinator ? "/coordinator/proposals" : "/proposals"}
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          {isCoordinator ? "Back to Review Queue" : "Back to Proposals"}
        </Link>

        {isStudent && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/proposals/new?edit=${proposal.id}`)}
              >
                <Edit className="w-4 h-4 mr-1.5 text-blue-600" />
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
                <Trash2 className="w-4 h-4 mr-1.5" />
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
            <Shield className="w-4 h-4 mr-1.5" />
            Review This Proposal
          </Button>
        )}
      </div>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* ── APPROVED BANNER ─────────────────────────────────────────────────── */}
      {isApproved && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  Next Stage: Chapter 1–3 Manuscript Development
                </span>
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
        </div>
      )}

      {/* ── NEEDS REVISION BANNER ───────────────────────────────────────────── */}
      {needsRevision && (
        <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
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
                <RefreshCw className="w-4 h-4 mr-2" />
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
                  <Tag className="w-3 h-3 text-primary" />
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
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Group:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {proposal.groupName || "—"}
                  </strong>
                </span>
              </div>
              {proposal.courseName && (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
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
                <User className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Submitted by:{" "}
                  <strong className="text-gray-700 dark:text-gray-300">
                    {proposal.submittedByName || "—"}
                  </strong>
                </span>
              </div>
              {proposal.submittedAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {new Date(proposal.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Viewer Section */}
        <div className="pt-2">
          {proposal.attachments && proposal.attachments.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-primary" />
                Proposal Document
              </h3>
              <DocumentViewer attachment={proposal.attachments[0]} />
            </div>
          ) : (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
              <p className="text-sm text-gray-500 font-medium">No document attached to this proposal.</p>
            </div>
          )}
        </div>
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
