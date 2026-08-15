// src/pages/CoordinatorProposalReview.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Toast } from "../components/ui/Toast";
import {
  ArrowLeft,
  FileText,
  Target,
  ShieldAlert,
  Compass,
  Users,
  BookOpen,
  Calendar,
  Tag,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  FileEdit,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import titleProposalService from "../services/titleProposal.service";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

const STATUS_ICONS = {
  submitted: Clock,
  needs_revision: AlertTriangle,
  approved: CheckCircle2,
  draft: FileEdit,
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

export const CoordinatorProposalReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile, currentUser, role } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Evaluation form
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState(""); // 'needs_revision' | 'approved'
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const coordinatorId = currentUser?.uid || userProfile?.uid || "";
  const coordinatorName =
    userProfile?.fullName ||
    `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
    "Research Coordinator";

  useEffect(() => {
    const load = async () => {
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
        setError(err.message || "Failed to load proposal.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!decision) {
      setFormError("Please select a decision: Request Revision or Approve.");
      return;
    }
    if (decision === "needs_revision" && !feedback.trim()) {
      setFormError(
        "Please provide feedback explaining what needs to be revised."
      );
      return;
    }

    setSubmitting(true);
    try {
      const evaluation = {
        coordinatorId,
        coordinatorName,
        coordinatorFeedback: feedback.trim(),
        decision,
      };

      if (decision === "approved") {
        await titleProposalService.approveProposal(id, evaluation);
        setToast("Proposal approved successfully.");
      } else {
        await titleProposalService.requestRevision(id, evaluation);
        setToast("Revision requested. The group will be notified.");
      }

      // Refresh proposal state
      const updated = await titleProposalService.getProposalById(id);
      setProposal(updated);
      setFeedback("");
      setDecision("");

      // Navigate back to queue after short delay
      setTimeout(() => navigate("/coordinator/proposals"), 1800);
    } catch (err) {
      setFormError(err.message || "Failed to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading proposal...</span>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-500 font-semibold">{error || "Proposal not found."}</p>
        <Link to="/coordinator/proposals">
          <Button variant="outline">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const cfg = PROPOSAL_STATUS_CONFIG[proposal.status] ?? {
    label: proposal.status,
    variant: "gray",
  };
  const StatusIcon = STATUS_ICONS[proposal.status] ?? Clock;
  const canEvaluate = proposal.status === "submitted";
  const alreadyReviewed =
    proposal.status === "needs_revision" || proposal.status === "approved";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <div>
        <Link
          to="/coordinator/proposals"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Review Queue
        </Link>
      </div>

      {toast && (
        <Toast
          message={toast}
          variant="success"
          onClose={() => setToast("")}
        />
      )}

      {/* ── Proposal Header Card ─────────────────────────────────────────────── */}
      <Card className="space-y-6">
        {/* Title + Status */}
        <div className="pb-5 border-b border-gray-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={cfg.variant} className="flex items-center gap-1">
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
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Revision #{proposal.revisionCount}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
            {proposal.title}
          </h1>

          {/* Meta info */}
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
                <strong className="text-gray-700 dark:text-gray-300">
                  {proposal.courseName}
                </strong>
              </div>
            )}
            {proposal.sectionName && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <strong className="text-gray-700 dark:text-gray-300">
                  {proposal.sectionName}
                </strong>
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
            {(proposal.lastSubmittedAt ?? proposal.submittedAt) && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {new Date(
                    proposal.lastSubmittedAt ?? proposal.submittedAt
                  ).toLocaleString()}
                </span>
              </div>
            )}

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

      {/* ── Previous Review Info (if already reviewed) ───────────────────────── */}
      {alreadyReviewed && proposal.coordinatorFeedback && (
        <Card className="p-5 space-y-2 border-l-4 border-l-blue-400 dark:border-l-blue-600">
          <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Previous Evaluation
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {proposal.coordinatorFeedback}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            — {proposal.coordinatorName}
            {proposal.reviewedAt && (
              <> · {new Date(proposal.reviewedAt).toLocaleString()}</>
            )}
          </p>
        </Card>
      )}

      {/* ── COORDINATOR EVALUATION FORM ──────────────────────────────────────── */}
      {canEvaluate ? (
        <Card className="space-y-5">
          <div className="pb-4 border-b border-gray-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Coordinator Evaluation
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Provide feedback and select a decision for this proposal.
            </p>
          </div>

          <form onSubmit={handleSubmitEvaluation} className="space-y-5">
            {/* Feedback */}
            <div>
              <Textarea
                label="Feedback / Comments"
                rows={5}
                placeholder="Provide specific, constructive feedback for the research group. If requesting revisions, clearly explain what needs to be changed or improved..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            {/* Decision */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Decision *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Request Revision */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${decision === "needs_revision"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="needs_revision"
                    checked={decision === "needs_revision"}
                    onChange={() => setDecision("needs_revision")}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-blue-500" />
                      Request Revision
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      The group must revise and resubmit this proposal.
                    </p>
                  </div>
                </label>

                {/* Approve */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${decision === "approved"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="approved"
                    checked={decision === "approved"}
                    onChange={() => setDecision("approved")}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Approve Proposal
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      The research title is cleared for manuscript development.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400 font-medium">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Link to="/coordinator/proposals">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                variant={decision === "approved" ? "primary" : "primary"}
                isLoading={submitting}
                disabled={!decision}
              >
                {decision === "approved" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve Proposal
                  </>
                ) : decision === "needs_revision" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Request Revision
                  </>
                ) : (
                  "Submit Evaluation"
                )}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-5 text-center text-sm text-gray-500 dark:text-gray-400">
          {proposal.status === "approved" ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">
                This proposal has been approved.
              </span>
            </div>
          ) : (
            <p>
              This proposal has status{" "}
              <strong>{cfg.label}</strong>. It is not currently awaiting evaluation.
            </p>
          )}
        </Card>
      )}
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

export default CoordinatorProposalReview;
