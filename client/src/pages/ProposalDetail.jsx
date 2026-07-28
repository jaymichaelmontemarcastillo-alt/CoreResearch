import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, FileText, CheckCircle2, XCircle, AlertTriangle, Clock, MessageSquare, User, Tag, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProposalDetail = () => {
  const { id } = useParams();
  const { role } = useAuth();

  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Review form states
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [adviserComment, setAdviserComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/proposals/${id}`);
      if (response.data && response.data.data) {
        setProposal(response.data.data);
        setAdviserComment(response.data.data.adviserComment || '');
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
        adviserComment
      });
      setToast(`Proposal decision recorded: '${reviewStatus.toUpperCase()}'`);
      setTimeout(() => setToast(''), 4000);
      await fetchProposal();
    } catch (err) {
      alert(`Error updating proposal status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const statusBadges = {
    pending: { label: 'Pending Review', variant: 'amber', icon: Clock },
    approved: { label: 'Approved', variant: 'emerald', icon: CheckCircle2 },
    revisions_required: { label: 'Revisions Required', variant: 'blue', icon: AlertTriangle },
    rejected: { label: 'Rejected', variant: 'rose', icon: XCircle }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400">
        Loading proposal details...
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-rose-400 font-semibold">{error || 'Proposal not found.'}</p>
        <Link to="/proposals">
          <Button variant="outline">Return to Proposals</Button>
        </Link>
      </div>
    );
  }

  const StatusIcon = statusBadges[proposal.status]?.icon || Clock;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <Link to="/proposals" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold">
        <ArrowLeft className="w-4 h-4" /> Back to Proposals
      </Link>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Main Proposal Card */}
      <Card className="border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusBadges[proposal.status]?.variant || 'amber'} className="flex items-center gap-1">
                <StatusIcon className="w-3.5 h-3.5" />
                {statusBadges[proposal.status]?.label || proposal.status}
              </Badge>
              <span className="text-slate-500 text-xs">• {proposal.department}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">{proposal.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Submitted by <strong className="text-slate-200">{proposal.studentName}</strong> on {new Date(proposal.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Abstract */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Abstract</h3>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {proposal.abstract}
          </div>
        </div>

        {/* Objectives */}
        {proposal.objectives && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Specific Objectives</h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {proposal.objectives}
            </div>
          </div>
        )}

        {/* Keywords */}
        {proposal.keywords && proposal.keywords.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {proposal.keywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                  <Tag className="w-3 h-3 text-blue-400" /> {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Adviser Existing Comments */}
        {proposal.adviserComment && (
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1">
            <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Reviewer Remarks & Recommendations
            </div>
            <p className="text-sm text-slate-300 italic">{proposal.adviserComment}</p>
          </div>
        )}
      </Card>

      {/* Adviser / Admin Review Workspace Form */}
      {(role === 'adviser' || role === 'admin') && (
        <Card className="border-blue-500/30 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" /> Reviewer Decision & Feedback Workspace
          </h2>

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Evaluation Decision
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'approved', label: 'Approve', variant: 'emerald' },
                  { id: 'revisions_required', label: 'Request Revisions', variant: 'blue' },
                  { id: 'rejected', label: 'Reject', variant: 'rose' },
                  { id: 'pending', label: 'Hold (Pending)', variant: 'amber' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewStatus(opt.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewStatus === opt.id
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Reviewer Comments & Recommendations
              </label>
              <textarea
                rows={4}
                className="w-full glass-input rounded-xl text-sm p-3"
                placeholder="Provide guidance, required modifications, or approval notes for the student research team..."
                value={adviserComment}
                onChange={(e) => setAdviserComment(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" isLoading={updating} className="w-full">
              <Send className="w-4 h-4 mr-2" /> Submit Review Decision
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
