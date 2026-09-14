// src/components/dashboard/activity/GroupActivityCard.jsx
import React, { useState, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { 
  HiUsers, 
  HiFunnel,
  HiClipboardDocumentCheck,
  HiDocumentText,
  HiChatBubbleBottomCenterText,
  HiCheckCircle 
} from 'react-icons/hi2';

export const GroupActivityCard = ({ 
  members = [], 
  activityRecords = [], // Array of { memberId, memberName, type: 'task' | 'document' | 'revision' | 'comment', timestamp }
  currentUserId = null,
  loading = false 
}) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'task' | 'document' | 'revision' | 'comment'

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'task', label: 'Tasks' },
    { key: 'document', label: 'Documents' },
    { key: 'revision', label: 'Revisions' },
    { key: 'comment', label: 'Comments' },
  ];

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
    <Card padding={false} className="p-4 sm:p-5 flex flex-col h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-xs">
      {/* Header with Title & Filter Buttons */}
      <div className="space-y-2 border-b border-gray-100 dark:border-[#222433] pb-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <HiUsers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                Group Activity
              </h3>
              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
                Recent Measurable Actions by Member
              </p>
            </div>
          </div>

          <Badge variant="gray" size="sm" className="text-[10px] py-0 px-1.5">
            {members.length} {members.length === 1 ? 'Researcher' : 'Researchers'}
          </Badge>
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                filter === opt.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-[#9396a8] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-2 text-gray-400 flex-1">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-xs">Loading member activity telemetry...</span>
        </div>
      ) : members.length === 0 ? (
        /* Empty State: No Group */
        <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-1.5 flex-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-0.5">
            <HiUsers className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            No research group assigned
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
            Once you create or join a research group, measurable activities by each member will be tracked here.
          </p>
        </div>
      ) : totalFilteredActions === 0 ? (
        /* Empty State: No Activity for filter */
        <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-1.5 flex-1">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-0.5">
            <HiClipboardDocumentCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            No group activity recorded yet
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-[#9396a8] max-w-xs leading-relaxed">
            No {filter !== 'all' ? filter : ''} actions have been recorded yet. Activities will automatically log as members edit chapters, complete tasks, and submit revisions.
          </p>
        </div>
      ) : (
        /* Member Activity Horizontal Bars */
        <div className="space-y-2.5 flex-1 min-h-0 pt-3 pb-1 overflow-y-auto max-h-[190px] pr-1">
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
              <div key={member.uid || member.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Avatar */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      isMe 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {initials}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white truncate text-xs">
                      {member.fullName || member.name || 'Team Member'} {isMe ? '(You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-200">
                      {count} {count === 1 ? 'action' : 'actions'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-slate-800/80 overflow-hidden">
                  <div
                    style={{ width: `${Math.max(widthPercent, count > 0 ? 6 : 0)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                    }`}
                  />
                </div>

                {/* Sub-breakdown if all filter */}
                {filter === 'all' && count > 0 && (
                  <div className="flex items-center gap-2.5 text-[9px] text-gray-400 dark:text-[#6b6f84] pl-6.5">
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

      {/* Footer Disclaimer */}
      <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-[#222433] text-[10px] text-gray-400 dark:text-[#6b6f84] flex items-center justify-between shrink-0">
        <span>Represents discrete recorded platform interactions</span>
        <span className="font-semibold">{totalFilteredActions} total</span>
      </div>
    </Card>
  );
};

export default GroupActivityCard;
