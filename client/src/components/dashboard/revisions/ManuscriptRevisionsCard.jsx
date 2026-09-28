import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ManuscriptRevisionsCard = ({ 
  revisions = [], 
  workspace = null, 
  documentId = null,
  loading = false 
}) => {
  const navigate = useNavigate();

  // Categorize revisions based on feedback status
  const newRevisions = revisions.filter(
    (r) => r.status === 'open' || r.status === 'addressed' || r.status === 'pending' || r.status === 'new'
  );
  const resolvedRevisions = revisions.filter(
    (r) => r.status === 'resolved' || r.status === 'completed'
  );
  const totalRevisions = revisions.length;

  if (!loading && totalRevisions === 0) return null;

  const newCount = newRevisions.length;
  const resolvedCount = resolvedRevisions.length;

  // Donut chart calculation
  const radius = 28;
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
    <div className="flex flex-col h-full">
      {/* Header */}
<<<<<<< HEAD
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
            Manuscript Revisions
          </h3>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
            ONLYOFFICE In-Document Feedback
=======
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            Manuscript Revisions
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
            In-document feedback
>>>>>>> 68296efb39d6f1783a2b591ec86554ec12380bd1
          </p>
        </div>
        {documentId && (
          <button
            type="button"
            onClick={() => navigate(`/documents/${documentId}`)}
            className="text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            Open document
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading revisions...</span>
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center gap-6">
            {/* SVG Donut Chart */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  className="stroke-gray-100 dark:stroke-[#222433]"
                  strokeWidth="7"
                  fill="none"
                />
                {resolvedCount > 0 && (
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-700 ease-out"
                    strokeWidth="7"
                    strokeDasharray={`${resolvedStroke} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
                {newCount > 0 && (
                  <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    className="stroke-amber-500 transition-all duration-700 ease-out"
                    strokeWidth="7"
                    strokeDasharray={`${newStroke} ${circumference}`}
                    strokeDashoffset={-resolvedStroke}
                    strokeLinecap="round"
                    fill="none"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                  {totalRevisions}
                </span>
                <span className="text-[10px] uppercase font-medium text-gray-400 tracking-wider mt-0.5">
                  Total
                </span>
              </div>
            </div>

            {/* Clickable Stats */}
            <div className="flex-1 space-y-2.5">
              <button
                type="button"
                onClick={() => handleNavigateToRevisions('new')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">New / Open</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {newCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigateToRevisions('resolved')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Resolved</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {resolvedCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManuscriptRevisionsCard;
