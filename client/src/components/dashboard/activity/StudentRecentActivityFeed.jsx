import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  HiChatBubbleBottomCenterText,
  HiClipboardDocumentCheck,
  HiDocumentText,
  HiCalendarDays,
  HiClock,
  HiArrowTopRightOnSquare,
  HiListBullet,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { Modal } from '../../ui/Modal';

export const StudentRecentActivityFeed = ({ 
  activities = [], 
  currentUserId = null,
  loading = false 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState('all');
  const [modalSearch, setModalSearch] = useState('');

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

  const getCategoryMeta = (category) => {
    switch (category) {
      case 'revision':
      case 'feedback':
        return { dotColor: 'bg-amber-500', label: 'Revision' };
      case 'task':
        return { dotColor: 'bg-emerald-500', label: 'Task' };
      case 'document':
      case 'workspace':
        return { dotColor: 'bg-blue-500', label: 'Document' };
      case 'schedule':
        return { dotColor: 'bg-purple-500', label: 'Defense' };
      default:
        return { dotColor: 'bg-gray-400', label: 'Activity' };
    }
  };

  const getCategoryDot = (category) => getCategoryMeta(category).dotColor;

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      const cat = item.category || item.type;
      const matchesFilter =
        modalFilter === 'all' ||
        cat === modalFilter ||
        (modalFilter === 'revision' && (cat === 'revision' || cat === 'feedback')) ||
        (modalFilter === 'document' && (cat === 'document' || cat === 'workspace'));

      const query = modalSearch.trim().toLowerCase();
      if (!query) return matchesFilter;

      const titleMatch = (item.title || '').toLowerCase().includes(query);
      const descMatch = (item.description || '').toLowerCase().includes(query);
      const actorMatch = (item.actorName || '').toLowerCase().includes(query);

      return matchesFilter && (titleMatch || descMatch || actorMatch);
    });
  }, [activities, modalFilter, modalSearch]);

  if (!loading && activities.length === 0) return null;

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

      {/* Modal Dialog for View All with Filters */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Research Activity History"
        icon={HiClock}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Header Controls & Filter */}
          <div className="space-y-3 pb-3 border-b border-gray-100 dark:border-[#222433]">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#9396a8]">
              <span>Chronological research history & group activities</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1c1d28] px-2 py-0.5 rounded-md">
                {filteredActivities.length} of {activities.length} events
              </span>
            </div>

            {/* Search Input and Filter Badges */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type="text"
                  placeholder="Search activity, teammate, or task..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6b6f84] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'revision', label: 'Revisions' },
                  { id: 'task', label: 'Tasks' },
                  { id: 'document', label: 'Documents' },
                  { id: 'schedule', label: 'Defenses' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors ${
                      modalFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8] hover:bg-gray-200 dark:hover:bg-[#252736]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Timeline List */}
          <div className="max-h-[60vh] overflow-y-auto pr-1 divide-y divide-gray-100 dark:divide-[#222433]/70 space-y-0.5">
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 dark:text-[#6b6f84] space-y-1">
                <p className="font-medium text-gray-500 dark:text-gray-400">No activities found</p>
                <p>Try adjusting your search query or filter.</p>
              </div>
            ) : (
              filteredActivities.map((item, idx) => {
                const isMe = item.actorId === currentUserId;
                const actorDisplay = isMe ? 'You' : item.actorName || 'Group Member';
                const meta = getCategoryMeta(item.category || item.type);

                return (
                  <div
                    key={item.id || idx}
                    className="py-3 first:pt-1 last:pb-1 flex items-start gap-3 hover:bg-gray-50/60 dark:hover:bg-[#1c1d28]/40 p-2.5 rounded-xl transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${meta.dotColor}`} />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8]">
                            {meta.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-[#6b6f84] shrink-0 font-medium whitespace-nowrap">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-[12.5px] text-gray-600 dark:text-[#9396a8] leading-relaxed">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{actorDisplay}</span>{' '}
                        {item.description || 'updated group research materials.'}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-400 dark:text-[#6b6f84]">
                        {item.link ? (
                          <Link
                            to={item.link}
                            onClick={() => setIsModalOpen(false)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                          >
                            Open item <HiArrowTopRightOnSquare className="w-3 h-3" />
                          </Link>
                        ) : <span />}

                        {item.timestamp && (
                          <span className="text-[10px] text-gray-400 dark:text-[#6b6f84]">
                            {formatFullDateTime(item.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentRecentActivityFeed;
