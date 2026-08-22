import React from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';

export const MilestonesTracker = ({ milestones = [] }) => {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Research Milestones
        </h3>
        <span className="text-xs text-primary font-semibold">
          {milestones.filter((m) => m.completed).length} of {milestones.length} Reached
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {milestones.map((m, idx) => {
          const isCompleted = m.completed;
          const isActive = m.active && !m.completed;

          return (
            <div
              key={m.id || idx}
              className={`p-3 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300'
                  : isActive
                  ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-300 shadow-sm'
                  : 'bg-gray-50/50 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isActive ? (
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold truncate">
                      {m.title}
                    </p>
                    <span className="text-[10px] font-bold opacity-75">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 line-clamp-2 mt-0.5">
                    {m.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestonesTracker;
