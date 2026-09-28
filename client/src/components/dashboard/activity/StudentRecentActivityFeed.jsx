import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HiChatBubbleBottomCenterText,
  HiClipboardDocumentCheck,
  HiDocumentText,
  HiCalendarDays,
  HiClock,
  HiArrowTopRightOnSquare,
  HiListBullet
} from 'react-icons/hi2';
import { Modal } from '../../ui/Modal';

export const StudentRecentActivityFeed = ({ 
  activities = [], 
  currentUserId = null,
  loading = false 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const formatFullDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
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

  const visibleActivities = activities.slice(0, 3);

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
              Recent Activity
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
              Live Research & Group Timeline
            </p>
          </div>
          {activities.length > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline shrink-0 pt-0.5 transition flex items-center gap-1"
            >
              View All
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-xs">Loading activity...</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#222433]/70">
            {visibleActivities.map((item, idx) => {
              const isMe = item.actorId === currentUserId;
              const actorDisplay = isMe ? 'You' : item.actorName || 'Group Member';

              return (
                <div
                  key={item.id || idx}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3"
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getCategoryDot(item.category || item.type)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5 font-medium">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-[12.5px] text-gray-500 dark:text-[#9396a8] leading-relaxed mt-0.5 line-clamp-1">
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

      {/* Subtle full-width button at bottom of list if more than 3 activities */}
      {activities.length > 3 && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-3 pt-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border-t border-gray-100 dark:border-[#222433]/70 transition-colors"
        >
          View all {activities.length} activities →
        </button>
      )}

      {/* Modal Dialog for View All */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Research Activity History"
        icon={HiListBullet}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#9396a8] pb-2 border-b border-gray-100 dark:border-[#222433]">
            <span>Full chronological history of research and group events</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1c1d28] px-2 py-0.5 rounded-md">
              {activities.length} events
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-1.5 divide-y divide-gray-100 dark:divide-[#222433]/70 space-y-0.5">
            {activities.map((item, idx) => {
              const isMe = item.actorId === currentUserId;
              const actorDisplay = isMe ? 'You' : item.actorName || 'Group Member';

              return (
                <div
                  key={item.id || idx}
                  className="py-3 first:pt-1 last:pb-1 flex items-start gap-3"
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${getCategoryDot(item.category || item.type)}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        {item.title}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 font-medium">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-[13px] text-gray-600 dark:text-[#9396a8] leading-relaxed mt-0.5">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{actorDisplay}</span>{' '}
                      {item.description || 'updated group research materials.'}
                    </p>

                    {item.timestamp && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-1">
                        {formatFullDateTime(item.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentRecentActivityFeed;
