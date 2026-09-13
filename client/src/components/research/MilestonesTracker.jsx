// src/components/research/MilestonesTracker.jsx
import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, FileCheck } from 'lucide-react';

export const MilestonesTracker = ({ milestones = [], orientation = 'horizontal' }) => {
  if (!milestones || milestones.length === 0) return null;

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalMilestones = milestones.length;

  const getStatusBadge = (status, isCompleted, isActive) => {
    if (isCompleted || status === 'completed') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Completed
        </span>
      );
    }
    if (status === 'submitted' || status === 'under_review') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Submitted
        </span>
      );
    }
    if (status === 'revision_required') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Revision
        </span>
      );
    }
    if (status === 'in_progress' || isActive) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-700">
        Not Started
      </span>
    );
  };

  // Vertical list layout for narrow sidebar columns
  if (orientation === 'vertical') {
    return (
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Research Milestones
          </h3>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {completedCount} of {totalMilestones} Reached
          </span>
        </div>

        <div className="space-y-2">
          {milestones.map((m, idx) => {
            const isCompleted = m.completed || m.status === 'completed';
            const isActive = m.active && !isCompleted;
            const isSubmitted = m.status === 'submitted' || m.status === 'under_review';
            const isRevision = m.status === 'revision_required';

            return (
              <div
                key={m.id || idx}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 min-w-0 ${
                  isCompleted
                    ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                    : isSubmitted
                    ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25 text-blue-900 dark:text-blue-300'
                    : isRevision
                    ? 'bg-rose-50/70 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-900 dark:text-rose-300'
                    : isActive
                    ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-900 dark:text-amber-300'
                    : 'bg-gray-50/50 dark:bg-[#1c1d28]/70 border-gray-100 dark:border-[#222433] text-gray-500 dark:text-[#9396a8]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isSubmitted ? (
                    <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : isRevision ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : isActive ? (
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-[#4c5064] shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-gray-900 dark:text-white">
                      Chapter {m.order || idx + 1}: {m.title?.replace(/^Chapter \d+:\s*/i, '') || m.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {getStatusBadge(m.status, isCompleted, isActive)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default horizontal grid layout for full-width containers
  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Research Milestones
        </h3>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          {completedCount} of {totalMilestones} Reached
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 min-w-0">
        {milestones.map((m, idx) => {
          const isCompleted = m.completed || m.status === 'completed';
          const isActive = m.active && !isCompleted;
          const isSubmitted = m.status === 'submitted' || m.status === 'under_review';
          const isRevision = m.status === 'revision_required';

          return (
            <div
              key={m.id || idx}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                isCompleted
                  ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                  : isSubmitted
                  ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25 text-blue-900 dark:text-blue-300 shadow-sm'
                  : isRevision
                  ? 'bg-rose-50/70 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-900 dark:text-rose-300'
                  : isActive
                  ? 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-900 dark:text-amber-300 shadow-sm'
                  : 'bg-gray-50/50 dark:bg-[#1c1d28]/70 border-gray-100 dark:border-[#222433] text-gray-500 dark:text-[#9396a8]'
              }`}
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : isSubmitted ? (
                      <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : isRevision ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    ) : isActive ? (
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 dark:text-[#4c5064] shrink-0" />
                    )}
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                      Chapter {m.order || idx + 1}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(m.status, isCompleted, isActive)}
                  </div>
                </div>

                <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium line-clamp-2 leading-tight">
                  {m.title?.replace(/^Chapter \d+:\s*/i, '') || m.title}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-[#6b6f84] line-clamp-2">
                  {m.description}
                </p>
              </div>

              <div className="pt-2 mt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                <span>{m.order ? `CH ${m.order}` : `#${idx + 1}`}</span>
                <span>{typeof m.progress === 'number' ? `${m.progress}%` : (isCompleted ? '100%' : isSubmitted ? '75%' : isRevision ? '50%' : isActive ? '25%' : '0%')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestonesTracker;
