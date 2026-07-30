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
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Tag,
  Edit,
  Trash2,
  Calendar,
  Layers,
  FileText,
  Target,
  ShieldAlert,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import titleProposalService from "../services/titleProposal.service";

export const ProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

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
    if (!window.confirm(`Are you sure you want to delete proposal: "${proposal.title}"?`)) {
      return;
    }
    setDeleting(true);
    try {
      await titleProposalService.deleteProposal(proposal.id);
      setToast("Proposal deleted successfully.");
      setTimeout(() => navigate("/proposals"), 1000);
    } catch (err) {
      alert(`Error deleting proposal: ${err.message}`);
      setDeleting(false);
    }
  };

  const statusBadges = {
    pending: { label: "Pending Review", variant: "amber", icon: Clock },
    approved: { label: "Approved", variant: "emerald", icon: CheckCircle2 },
    revisions_required: { label: "Revisions Required", variant: "blue", icon: AlertTriangle },
    rejected: { label: "Rejected", variant: "rose", icon: XCircle },
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-gray-500">
        Loading title proposal details...
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-500 font-semibold">{error || "Proposal not found."}</p>
        <Link to="/proposals">
          <Button variant="outline">Return to Proposals</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusBadges[proposal.status]?.icon || Clock;
  const isPending = proposal.status === "pending";
  const canEdit = isPending || proposal.status === "revisions_required";
  const canDelete = isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/proposals"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Proposals
        </Link>

        {/* Edit and Delete Actions for Students */}
        {role === "student" && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/proposals/new?edit=${proposal.id}`)}
              >
                <Edit className="w-4 h-4 mr-1.5 text-blue-600" /> Edit Proposal
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={deleting}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Main Proposal Header Card */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusBadges[proposal.status]?.variant || "amber"} className="flex items-center gap-1">
                <StatusIcon className="w-3.5 h-3.5" />
                {statusBadges[proposal.status]?.label || proposal.status}
              </Badge>
              {proposal.researchCategory && (
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-primary" /> {proposal.researchCategory}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              {proposal.title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary shrink-0" />
                <span>Submitted by: <strong className="text-gray-700 dark:text-gray-300">{proposal.studentName || proposal.submittedBy || "Student"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>Submitted on: <strong>{new Date(proposal.submittedAt).toLocaleDateString()}</strong></span>
              </div>
              {proposal.updatedAt && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Last Updated: <strong>{new Date(proposal.updatedAt).toLocaleDateString()}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rationale / Background */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary" /> Rationale & Background
          </h3>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {proposal.rationale || proposal.abstract}
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4 text-primary" /> Research Objectives
          </h3>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {proposal.objectives}
          </div>
        </div>

        {/* Scope and Delimitation */}
        {proposal.scopeAndDelimitation && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-primary" /> Scope and Delimitation
            </h3>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {proposal.scopeAndDelimitation}
            </div>
          </div>
        )}

        {/* Methodology */}
        {proposal.methodology && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-primary" /> Methodology
            </h3>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {proposal.methodology}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProposalDetail;
