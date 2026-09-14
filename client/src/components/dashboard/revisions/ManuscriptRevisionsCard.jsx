// src/components/dashboard/revisions/ManuscriptRevisionsCard.jsx
import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { useNavigate } from 'react-router-dom';
import { 
  HiChatBubbleBottomCenterText, 
  HiCheckCircle, 
  HiExclamationCircle, 
  HiDocumentText,
  HiArrowTopRightOnSquare 
} from 'react-icons/hi2';

export const ManuscriptRevisionsCard = ({ 
  revisions = [], 
  workspace = null, 
  documentId = null,
  loading = false 
}) => {
  const navigate = useNavigate();

  // Categorize revisions based on authoritative feedback status
  const newRevisions = revisions.filter(
    (r) => r.status === 'open' || r.status === 'addressed' || r.status === 'pending' || r.status === 'new'
  );
  const resolvedRevisions = revisions.filter(
    (r) => r.status === 'resolved' || r.status === 'completed'
  );
  const totalRevisions = revisions.length;

  const newCount = newRevisions.length;
  const resolvedCount = resolvedRevisions.length;

  // Donut chart calculation
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const resolvedRatio = totalRevisions > 0 ? resolvedCount / totalRevisions : 0;
  const newRatio = totalRevisions > 0 ? newCount / totalRevisions : 0;

  const resolvedStroke = resolvedRatio * circumference;
  const newStroke = newRatio * circumference;

  const handleNavigateToRevisions = (filter = 'all') => {
    if (documentId) {
      navigate(`/documents/${documentId}?tab=comments&filter=${filter}`);
    } else if (workspace?.id) {
      navigate(`/research/workspace?tab=feedback&filter=${filter}`);
    } else {
      navigate('/research/workspace');
    }
  };

  return (
    <Card padding={false} className="p-4 sm:p-5 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HiChatBubbleBottomCenterText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
              Manuscript Revisions
            </h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
              ONLYOFFICE In-Document Feedback
            </p>
          </div>
        </div>

        {totalRevisions > 0 && (
          <Badge variant={newCount > 0 ? 'amber' : 'emerald'} size="sm" className="text-[10px] py-0 px-1.5">
            {newCount > 0 ? `${newCount} Actionable` : 'All Resolved'}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-2 text-gray-400 flex-1">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-xs">Loading manuscript revisions...</span>
        </div>
      ) : totalRevisions === 0 ? (
        /* Empty State */
        <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-1.5 flex-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-0.5">
            <HiDocumentText className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            No manuscript revisions yet.
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
            When your faculty adviser or defense panelist highlights revisions in your ONLYOFFICE manuscript, they will appear here.
          </p>
        </div>
      ) : (
        /* Data & Visualization */
        <div className="space-y-3 flex-1 min-h-0 pt-3 pb-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* SVG Donut Chart */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-gray-100 dark:stroke-slate-800/80"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Resolved Segment (Emerald) */}
                {resolvedCount > 0 && (
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${resolvedStroke} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
                {/* New Segment (Amber) */}
                {newCount > 0 && (
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-amber-500 transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={`${newStroke} ${circumference}`}
                    strokeDashoffset={-resolvedStroke}
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </svg>
              {/* Inner Center Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-gray-900 dark:text-white leading-none">
                  {totalRevisions}
                </span>
                <span className="text-[9px] uppercase font-semibold text-gray-400 tracking-wider mt-0.5">
                  Total
                </span>
              </div>
            </div>

            {/* Clickable Statistic Rows */}
            <div className="flex-1 w-full space-y-1.5">
              {/* New Revision */}
              <button
                type="button"
                onClick={() => handleNavigateToRevisions('new')}
                className="w-full p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition flex items-center justify-between group text-left"
                title="Click to view active revisions requiring attention"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    New Revision
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {newCount}
                  </span>
                  <HiArrowTopRightOnSquare className="w-3 h-3 text-gray-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition" />
                </div>
              </button>

              {/* Revision Resolved */}
              <button
                type="button"
                onClick={() => handleNavigateToRevisions('resolved')}
                className="w-full p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition flex items-center justify-between group text-left"
                title="Click to view resolved revision history"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Revision Resolved
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {resolvedCount}
                  </span>
                  <HiArrowTopRightOnSquare className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" />
                </div>
              </button>

              {/* Total Revisions */}
              <div className="px-2 py-0.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-[#9396a8]">
                <span>Total Revisions</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {totalRevisions}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer shortcut */}
      {documentId && (
        <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-[#222433] flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/documents/${documentId}`)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Open in ONLYOFFICE Editor →
          </button>
        </div>
      )}
    </Card>
  );
};

export default ManuscriptRevisionsCard;
