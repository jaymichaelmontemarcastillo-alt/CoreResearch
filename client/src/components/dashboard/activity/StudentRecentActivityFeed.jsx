// src/components/dashboard/activity/StudentRecentActivityFeed.jsx
import React from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Link } from 'react-router-dom';
import { 
  HiClock, 
  HiArrowPath, 
  HiChatBubbleBottomCenterText,
  HiClipboardDocumentCheck,
  HiDocumentText,
  HiCalendarDays,
  HiCheckCircle,
  HiArrowTopRightOnSquare
} from 'react-icons/hi2';

export const StudentRecentActivityFeed = ({ 
  activities = [], 
  currentUserId = null,
  loading = false 
}) => {
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'revision':
      case 'feedback':
        return <HiChatBubbleBottomCenterText className="w-4 h-4 text-amber-500" />;
      case 'task':
        return <HiClipboardDocumentCheck className="w-4 h-4 text-emerald-500" />;
      case 'document':
      case 'workspace':
        return <HiDocumentText className="w-4 h-4 text-blue-500" />;
      case 'schedule':
        return <HiCalendarDays className="w-4 h-4 text-purple-500" />;
      default:
        return <HiClock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryBadgeVariant = (category) => {
    switch (category) {
      case 'revision':
      case 'feedback':
        return 'amber';
      case 'task':
        return 'emerald';
      case 'document':
      case 'workspace':
        return 'blue';
      case 'schedule':
        return 'purple';
      default:
        return 'gray';
    }
  };

  return (
    <Card className="p-5 sm:p-6 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <HiClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-[#9396a8]">
              Live Research &amp; Group Timeline
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-gray-400">
          Live Feed
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs">Loading activity stream...</span>
        </div>
      ) : activities.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2 flex-1">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-1">
            <HiClock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            No recent activity
          </h4>
          <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
            As your research adviser adds feedback and team members complete tasks, chronological updates will stream here.
          </p>
        </div>
      ) : (
        /* Activity Stream */
        <div className="space-y-3 flex-1 min-h-0 pt-4 pb-2 overflow-y-auto max-h-[260px] pr-1">
          {activities.slice(0, 6).map((item, idx) => {
            const isMe = item.actorId === currentUserId;
            const actorDisplay = isMe ? 'You' : item.actorName || 'Group Member';

            return (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl border border-gray-100 dark:border-[#222433] bg-gray-50/40 dark:bg-[#1c1d28]/70 flex items-start gap-3 hover:border-gray-300 dark:hover:border-[#2c2f42] transition"
              >
                <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-white dark:bg-[#15161e] border border-gray-200/80 dark:border-[#222433] shadow-2xs">
                  {getCategoryIcon(item.category || item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-gray-400 shrink-0 font-mono">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-[#9396a8] leading-relaxed line-clamp-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{actorDisplay}</span>{' '}
                    {item.description || 'updated group research materials.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer link */}
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-[#222433] flex justify-between items-center text-[11px] text-gray-400 shrink-0">
        <span>Group chronological audit stream</span>
        <Link to="/research/workspace" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          Workspace Log →
        </Link>
      </div>
    </Card>
  );
};

export default StudentRecentActivityFeed;
