import React from 'react';
import { Link } from 'react-router-dom';

export const UpcomingDeadlinesCard = ({ 
  deadlines = [], 
  loading = false 
}) => {
  if (!loading && deadlines.length === 0) return null;

  // Format date helper: "Sep 18"
  const formatDateMonthDay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
    <div className="flex flex-col h-full">
      {/* Header */}
<<<<<<< HEAD
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
            Upcoming Deadlines
          </h3>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
            Milestones, Defenses &amp; Task Due Dates
=======
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            Upcoming Deadlines
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
            Milestones, Defenses & Tasks
>>>>>>> 68296efb39d6f1783a2b591ec86554ec12380bd1
          </p>
        </div>
        <Link
          to="/schedules"
          className="text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading schedules...</span>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-gray-100 dark:divide-[#222433]/70">
          {deadlines.map((item, idx) => (
            <div
              key={item.id || idx}
              className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {item.title || item.projectTitle}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                  <span>{getTypeLabel(item)}</span>
                  {item.startTime && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>
                        {item.startTime} {item.endTime ? `– ${item.endTime}` : ''}
                      </span>
                    </>
                  )}
                  {item.venue && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="truncate">{item.venue}</span>
                    </>
                  )}
                </div>
              </div>

              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0 bg-gray-50 dark:bg-[#1c1d28] px-2.5 py-1 rounded-lg">
                {formatDateMonthDay(item.date || item.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesCard;
