import React, { useState, useEffect, useMemo } from 'react';
import { HiMagnifyingGlass, HiClock } from 'react-icons/hi2';
import { Modal } from '../../ui/Modal';
import { systemActivityService } from '../../../services/systemActivity.service';

export const RecentActivityWidget = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState('all');
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    const unsubscribe = systemActivityService.subscribeRecentActivities((items) => {
      setActivities(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getCategoryMeta = (category) => {
    switch (category) {
      case 'task':
        return { dotColor: 'bg-emerald-500', label: 'Task' };
      case 'adviser':
        return { dotColor: 'bg-blue-500', label: 'Mentorship' };
      case 'repository':
        return { dotColor: 'bg-purple-500', label: 'Repository' };
      case 'feedback':
        return { dotColor: 'bg-amber-500', label: 'Feedback' };
      case 'schedule':
        return { dotColor: 'bg-indigo-500', label: 'Defense' };
      case 'workspace':
      case 'proposal':
        return { dotColor: 'bg-cyan-500', label: 'Manuscript' };
      default:
        return { dotColor: 'bg-gray-400', label: 'System' };
    }
  };

  const getDotColor = (category) => getCategoryMeta(category).dotColor;

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      const matchesFilter =
        modalFilter === 'all' ||
        item.category === modalFilter ||
        (modalFilter === 'workspace' && item.category === 'proposal');

      const query = modalSearch.trim().toLowerCase();
      if (!query) return matchesFilter;

      const titleMatch = (item.title || '').toLowerCase().includes(query);
      const descMatch = (item.description || '').toLowerCase().includes(query);
      const actorMatch = (item.actorName || '').toLowerCase().includes(query);

      return matchesFilter && (titleMatch || descMatch || actorMatch);
    });
  }, [activities, modalFilter, modalSearch]);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatFullDateTime(timestamp);
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-[#222433] pb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Recent System Activity
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
              Real-time actions & milestone events
            </p>
          </div>
          {activities && activities.length > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline shrink-0 transition flex items-center gap-1"
            >
              View All
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3 text-gray-400 flex-1">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm">Loading events...</span>
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="flex-1 divide-y divide-gray-100 dark:divide-[#222433]/70">
            {activities.slice(0, 3).map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getDotColor(item.category)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5 font-medium">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500 dark:text-[#9396a8] leading-relaxed mt-0.5 line-clamp-2">
                    {item.actorName && (
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {item.actorName}
                      </span>
                    )}
                    {item.actorName ? " - " : ""}
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 flex-1 flex flex-col items-center justify-center">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              No recent activity
            </h4>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-1">
              Events will appear here as you work.
            </p>
          </div>
        )}
      </div>

      {activities && activities.length > 3 && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-3 pt-2 text-center text-xs font-medium text-gray-500 dark:text-[#9396a8] hover:text-blue-600 dark:hover:text-blue-400 border-t border-gray-100 dark:border-[#222433] transition-colors"
        >
          See all
        </button>
      )}

      {/* Modal Dialog for View All with Filters */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Recent System Activity"
        icon={HiClock}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Header Controls & Filter */}
          <div className="space-y-3 pb-3 border-b border-gray-100 dark:border-[#222433]">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-[#9396a8]">
              <span>Real-time actions, milestone events, and research timeline</span>
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
                  placeholder="Search activity, author, or description..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6b6f84] focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'task', label: 'Tasks' },
                  { id: 'workspace', label: 'Manuscripts' },
                  { id: 'adviser', label: 'Mentorship' },
                  { id: 'feedback', label: 'Feedback' },
                  { id: 'repository', label: 'Repository' },
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
                <p>Try adjusting your search query or category filter.</p>
              </div>
            ) : (
              filteredActivities.map((item) => {
                const meta = getCategoryMeta(item.category);

                return (
                  <div
                    key={item.id}
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
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-400 dark:text-[#6b6f84]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {item.actorName || 'System'}
                          </span>
                          {item.actorRole && (
                            <span className="capitalize px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#1c1d28] text-[10px] text-gray-500 dark:text-[#9396a8]">
                              {item.actorRole}
                            </span>
                          )}
                        </div>
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
