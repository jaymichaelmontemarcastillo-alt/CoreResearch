import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HiChatBubbleBottomCenterText,
  HiClipboardDocumentCheck,
  HiDocumentText,
  HiCalendarDays,
  HiClock,
} from 'react-icons/hi2';

export const StudentRecentActivityFeed = ({ 
  activities = [], 
  currentUserId = null,
  loading = false 
}) => {
  if (!loading && activities.length === 0) return null;

  // Format relative time helper
  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getCategoryDot = (category) => {
    switch (category) {
      case 'revision':
      case 'feedback':
        return 'bg-amber-500';
      case 'task':
        return 'bg-emerald-500';
      case 'document':
      case 'workspace':
        return 'bg-blue-500';
      case 'schedule':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
<<<<<<< HEAD
    <Card padding={false} className="p-4 sm:p-5 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
            Live Research &amp; Group Timeline
          </p>
        </div>

        <span className="text-[11px] font-semibold text-gray-400">
          Live Feed
        </span>
=======
    <div className="flex flex-col h-full">
      {/* Header — no icon, just text */}
      <div className="mb-5">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h3>
        <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
          Live Research & Group Timeline
        </p>
>>>>>>> 68296efb39d6f1783a2b591ec86554ec12380bd1
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading activity...</span>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-gray-100 dark:divide-[#222433]/70">
          {activities.slice(0, 6).map((item, idx) => {
            const isMe = item.actorId === currentUserId;
            const actorDisplay = isMe ? 'You' : item.actorName || 'Group Member';

            return (
              <div
                key={item.id || idx}
                className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3"
              >
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getCategoryDot(item.category || item.type)}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5 font-medium">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-[13px] text-gray-500 dark:text-[#9396a8] leading-relaxed mt-0.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{actorDisplay}</span>{' '}
                    {item.description || 'updated group research materials.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentRecentActivityFeed;
