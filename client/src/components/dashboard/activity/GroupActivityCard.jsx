import React, { useState, useMemo } from 'react';

export const GroupActivityCard = ({ 
  members = [], 
  activityRecords = [],
  currentUserId = null,
  loading = false 
}) => {
  const [filter, setFilter] = useState('all'); 

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'task', label: 'Tasks' },
    { key: 'document', label: 'Documents' },
    { key: 'revision', label: 'Revisions' },
    { key: 'comment', label: 'Comments' },
  ];

  if (!loading && (members.length === 0 || activityRecords.length === 0)) return null;

  // Calculate action counts per member under current filter
  const memberStats = useMemo(() => {
    if (!members || members.length === 0) return [];

    const countsByMember = new Map();
    members.forEach((m) => {
      countsByMember.set(m.uid || m.id, {
        member: m,
        count: 0,
        taskCount: 0,
        docCount: 0,
        revisionCount: 0,
        commentCount: 0,
      });
    });

    activityRecords.forEach((act) => {
      const targetUid = act.memberId || act.actorId || act.uid;
      const stat = countsByMember.get(targetUid);
      if (stat) {
        if (act.type === 'task') stat.taskCount += 1;
        else if (act.type === 'document') stat.docCount += 1;
        else if (act.type === 'revision') stat.revisionCount += 1;
        else if (act.type === 'comment') stat.commentCount += 1;

        if (filter === 'all' || act.type === filter) {
          stat.count += 1;
        }
      }
    });

    return Array.from(countsByMember.values());
  }, [members, activityRecords, filter]);

  const totalFilteredActions = memberStats.reduce((acc, m) => acc + m.count, 0);
  const maxActions = Math.max(...memberStats.map((m) => m.count), 1);

  return (
<<<<<<< HEAD
    <Card padding={false} className="p-4 sm:p-5 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-xs">
      {/* Header with Title & Filter Buttons */}
      <div className="space-y-2 border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
              Group Activity
            </h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
              Recent Measurable Actions by Member
            </p>
          </div>

          <Badge variant="gray" size="sm" className="text-[10px] py-0 px-1.5">
            {members.length} {members.length === 1 ? 'Researcher' : 'Researchers'}
          </Badge>
=======
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            Group Activity
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1c1d28] px-2 py-0.5 rounded-md">
              {members.length} {members.length === 1 ? 'Researcher' : 'Researchers'}
            </span>
          </h3>
          <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
            Recent measurable actions by member
          </p>
>>>>>>> 68296efb39d6f1783a2b591ec86554ec12380bd1
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#222433]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400 flex-1">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading data...</span>
        </div>
      ) : totalFilteredActions === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500 flex-1">
          No {filter !== 'all' ? filter : ''} actions recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-[#222433]/70 flex-1">
          {memberStats.map(({ member, count, taskCount, docCount, revisionCount, commentCount }) => {
            const widthPercent = Math.round((count / maxActions) * 100);
            const isMe = member.uid === currentUserId;
            const initials = (member.fullName || member.name || 'Member')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div key={member.uid || member.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isMe 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 dark:bg-[#222433] text-gray-600 dark:text-gray-300'
                    }`}>
                      {initials}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {member.fullName || member.name || 'Team Member'} {isMe ? '(You)' : ''}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                    {count} {count === 1 ? 'action' : 'actions'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-[#1c1d28] overflow-hidden">
                  <div
                    style={{ width: `${Math.max(widthPercent, count > 0 ? 4 : 0)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      isMe ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                {/* Sub-breakdown */}
                {filter === 'all' && count > 0 && (
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    {taskCount > 0 && <span>{taskCount} tasks</span>}
                    {docCount > 0 && <span>{docCount} docs</span>}
                    {revisionCount > 0 && <span>{revisionCount} revisions</span>}
                    {commentCount > 0 && <span>{commentCount} comments</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupActivityCard;
