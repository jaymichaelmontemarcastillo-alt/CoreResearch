// src/pages/ProposalDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Toast } from "../components/ui/Toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  User,
  Tag,
  Send,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const ProposalDetail = () => {
  const { id } = useParams();
  const { role } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review form states
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [adviserComment, setAdviserComment] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState("");

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/proposals/${id}`);
      if (response.data && response.data.data) {
        setProposal(response.data.data);
        setAdviserComment(response.data.data.adviserComment || "");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/proposals/${id}/status`, {
        status: reviewStatus,
        adviserComment,
      });
      setToast(`Proposal decision recorded: '${reviewStatus.toUpperCase()}'`);
      await fetchProposal();
    } catch (err) {
      alert(`Error updating proposal status: ${err.message}`);
    } finally {
      setUpdating(false);
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
        Loading proposal details...
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/proposals"
        className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Proposals
      </Link>

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Main Proposal Card */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusBadges[proposal.status]?.variant || "amber"} className="flex items-center gap-1">
                <StatusIcon className="w-3.5 h-3.5" />
                {statusBadges[proposal.status]?.label || proposal.status}
              </Badge>
              <span className="text-gray-400 dark:text-gray-500 text-xs">• {proposal.department}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              {proposal.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>
                Submitted by <strong className="text-gray-700 dark:text-gray-300">{proposal.studentName}</strong> on{" "}
                {new Date(proposal.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
            Abstract
          </h3>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {proposal.abstract}
          </div>
        </div>

        {/* Objectives */}
        {proposal.objectives && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
              Specific Objectives
            </h3>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {proposal.objectives}
            </div>
          </div>
        )}

        {/* Keywords */}
        {proposal.keywords && proposal.keywords.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {proposal.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs"
                >
                  <Tag className="w-3 h-3 text-primary" /> {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Adviser Existing Comments */}
        {proposal.adviserComment && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 space-y-1">
            <div className="text-xs font-bold text-primary dark:text-blue-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Reviewer Remarks & Recommendations
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">{proposal.adviserComment}</p>
          </div>
        )}
      </Card>

      {/* Adviser / Admin Review Workspace Form */}
      {(role === "adviser" || role === "admin") && (
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Reviewer Decision & Feedback Workspace
          </h2>

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Evaluation Decision
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "approved", label: "Approve", variant: "emerald" },
                  { id: "revisions_required", label: "Request Revisions", variant: "blue" },
                  { id: "rejected", label: "Reject", variant: "rose" },
                  { id: "pending", label: "Hold (Pending)", variant: "amber" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewStatus(opt.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      reviewStatus === opt.id
                        ? "bg-primary border-primary text-white shadow-sm"
                        : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Reviewer Comments & Recommendations"
              rows={4}
              placeholder="Provide guidance, required modifications, or approval notes for the student research team..."
              value={adviserComment}
              onChange={(e) => setAdviserComment(e.target.value)}
            />

            <Button type="submit" variant="primary" isLoading={updating} className="w-full">
              <Send className="w-4 h-4 mr-2" /> Submit Review Decision
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
