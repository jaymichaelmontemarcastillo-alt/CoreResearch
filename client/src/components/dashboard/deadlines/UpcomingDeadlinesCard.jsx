// src/components/dashboard/deadlines/UpcomingDeadlinesCard.jsx
import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Link } from 'react-router-dom';
import { 
  HiCalendarDays, 
  HiClock, 
  HiAcademicCap, 
  HiCheckCircle,
  HiClipboardDocumentCheck,
  HiArrowTopRightOnSquare 
} from 'react-icons/hi2';

export const UpcomingDeadlinesCard = ({ 
  deadlines = [], 
  loading = false 
}) => {
  // Format date helper: "Sep 18"
  const formatDateMonthDay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'final_defense':
      case 'defense':
        return 'purple';
      case 'proposal_defense':
        return 'blue';
      case 'consultation':
        return 'emerald';
      case 'task':
        return 'amber';
      case 'submission':
      case 'revision':
        return 'rose';
      default:
        return 'gray';
    }
  };

  const getTypeLabel = (item) => {
    if (item.typeLabel) return item.typeLabel;
    if (item.defenseType === 'proposal_defense') return 'Proposal Defense';
    if (item.defenseType === 'final_defense') return 'Final Defense';
    if (item.type === 'task') return 'Task Due';
    if (item.type === 'consultation') return 'Consultation';
    if (item.type === 'revision') return 'Revision';
    return 'Deadline';
  };

  return (
    <Card className="p-5 sm:p-6 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <HiCalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Upcoming Deadlines
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-[#9396a8]">
              Milestones, Defenses &amp; Task Due Dates
            </p>
          </div>
        </div>

        <Link
          to="/schedules"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          All Schedules <HiArrowTopRightOnSquare className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs">Loading upcoming schedule...</span>
        </div>
      ) : deadlines.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-1">
            <HiCalendarDays className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            No upcoming deadlines
          </h4>
          <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
            You are completely up to date. Scheduled defenses, consultations, and research task deadlines will appear here.
          </p>
        </div>
      ) : (
        /* Upcoming Deadlines List */
        <div className="space-y-2.5 flex-1 min-h-0 pt-4 pb-2 overflow-y-auto max-h-[260px] pr-1">
          {deadlines.slice(0, 5).map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1c1d28] flex items-center justify-between gap-3 hover:border-blue-200 dark:hover:border-blue-900/50 transition group"
            >
              {/* Date Box */}
              <div className="w-14 h-12 rounded-lg bg-white dark:bg-[#15161e] border border-gray-200/80 dark:border-[#262838] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none">
                  {formatDateMonthDay(item.date || item.dueDate).split(' ')[0]}
                </span>
                <span className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                  {formatDateMonthDay(item.date || item.dueDate).split(' ')[1] || ''}
                </span>
              </div>

              {/* Title & Type */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={getBadgeVariant(item.type || item.defenseType)} size="sm">
                    {getTypeLabel(item)}
                  </Badge>
                  {item.startTime && (
                    <span className="text-[11px] text-gray-400 font-mono">
                      {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                    </span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {item.title || item.projectTitle}
                </h4>
                {item.venue && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    📍 {item.venue}
                  </p>
                )}
              </div>

              {/* Action / Link */}
              {item.link ? (
                <Link
                  to={item.link}
                  className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  <HiArrowTopRightOnSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Footer shortcut */}
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-[#222433] flex justify-between items-center text-[11px] text-gray-400 shrink-0">
        <span>Showing nearest active dates</span>
        <Link to="/schedules" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          View Master Calendar →
        </Link>
      </div>
    </Card>
  );
};

export default UpcomingDeadlinesCard;
