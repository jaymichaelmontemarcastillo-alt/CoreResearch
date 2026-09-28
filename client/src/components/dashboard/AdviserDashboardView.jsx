// src/components/dashboard/AdviserDashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { Toast } from '../ui/Toast';
import {
  HiUsers,
  HiDocumentText,
  HiClipboardDocumentList,
  HiCalendarDays,
  HiArrowRight,
  HiCheckCircle,
  HiExclamationTriangle,
  HiClock,
  HiMapPin,
  HiSparkles,
  HiChevronRight,
  HiBookOpen,
  HiAcademicCap,
  HiFolder,
  HiCheckBadge,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2';

import { facultyService } from '../../services/faculty.service';
import { researchWorkspaceService } from '../../services/researchWorkspace.service';
import { researchTaskService } from '../../services/researchTask.service';
import { scheduleService } from '../../services/schedule.service';
import { adviserRequestService } from '../../services/adviserRequest.service';
import { progressService } from '../../services/progress.service';
import { courseService } from '../../services/course.service';
import { sectionService } from '../../services/section.service';
import { groupService } from '../../services/group.service';
import { systemActivityService } from '../../services/systemActivity.service';

/* Helper: Format relative timestamp */
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

/* Helper: Format date for defenses */
const formatDefenseDate = (dateStr) => {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const AdviserDashboardView = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  const [actionLoading, setActionLoading] = useState(null);

  // Core Data Collections
  const [groups, setGroups] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [coursesMap, setCoursesMap] = useState({});
  const [sectionsMap, setSectionsMap] = useState({});

  // System Activity
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // 1. Initial Load of adviser research data
  const loadAdviserData = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);

    try {
      const [
        adviserGroups,
        adviserWorkspaces,
        adviserTasks,
        allSchedules,
        allCourses,
        allSections,
      ] = await Promise.all([
        facultyService.getAdviserGroups(currentUser.uid).catch((err) => {
          console.warn('[AdviserDashboardView] getAdviserGroups error:', err);
          return [];
        }),
        researchWorkspaceService.getWorkspacesByAdviser(currentUser.uid).catch((err) => {
          console.warn('[AdviserDashboardView] getWorkspaces error:', err);
          return [];
        }),
        researchTaskService.getTasksByAdviser(currentUser.uid).catch((err) => {
          console.warn('[AdviserDashboardView] getTasks error:', err);
          return [];
        }),
        scheduleService.getAllSchedules().catch((err) => {
          console.warn('[AdviserDashboardView] getAllSchedules error:', err);
          return [];
        }),
        courseService.getAllCourses().catch(() => []),
        sectionService.getAllSections().catch(() => []),
      ]);

      // 1. Map known workspaces by groupId, id, and studentId
      const wsList = [...(adviserWorkspaces || [])];
      const wsByGroupId = {};
      const wsByStudentId = {};

      wsList.forEach((w) => {
        if (w.groupId) wsByGroupId[w.groupId] = w;
        if (w.id) wsByGroupId[w.id] = w;
        if (w.studentId) wsByStudentId[w.studentId] = w;
      });

      // 2. For any group without a matched workspace in adviserWorkspaces, query workspace by groupId or member UID
      await Promise.all(
        (adviserGroups || []).map(async (grp) => {
          if (!wsByGroupId[grp.id]) {
            try {
              let ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', grp.id);
              if (!ws && Array.isArray(grp.members) && grp.members.length > 0) {
                for (const m of grp.members) {
                  if (m.uid) {
                    ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(m.uid);
                    if (ws) break;
                  }
                }
              }
              if (ws) {
                wsByGroupId[grp.id] = ws;
                if (ws.studentId) wsByStudentId[ws.studentId] = ws;
                wsList.push(ws);
              }
            } catch (err) {
              console.warn('[AdviserDashboardView] Workspace resolution failed for group:', grp.id, err);
            }
          }
        })
      );

      // 3. Enrich advisee groups with the actual submitted research title and status
      const enrichedGroups = (adviserGroups || []).map((grp) => {
        const ws =
          wsByGroupId[grp.id] ||
          (Array.isArray(grp.members)
            ? grp.members.map((m) => wsByStudentId[m.uid]).find(Boolean)
            : null);

        const resolvedTitle = grp.title || ws?.title || '';

        // Auto-heal / sync missing title back to Firestore research_groups document
        if (grp.id && ws?.title && (!grp.title || grp.title !== ws.title)) {
          groupService.updateGroup(grp.id, { title: ws.title }).catch((err) => {
            console.warn('[AdviserDashboardView] Auto-sync group title failed:', err);
          });
        }

        return {
          ...grp,
          title: resolvedTitle,
          workspaceId: ws?.id || grp.id,
          status: ws?.status && ws.status !== 'not_started' ? ws.status : grp.status,
        };
      });

      setGroups(enrichedGroups);
      setWorkspaces(wsList);
      setTasks(adviserTasks || []);

      // Build course and section lookup dictionaries
      const cMap = {};
      (allCourses || []).forEach((c) => {
        if (c?.id) cMap[c.id] = c;
      });
      setCoursesMap(cMap);

      const sMap = {};
      (allSections || []).forEach((s) => {
        if (s?.id) sMap[s.id] = s;
      });
      setSectionsMap(sMap);

      // Filter upcoming defenses specifically for this adviser's groups
      const adviseeGroupIds = new Set(
        (adviserGroups || []).map((g) => g.id).filter(Boolean)
      );

      const adviserSchedules = (allSchedules || []).filter((s) => {
        if (s.status === 'cancelled') return false;
        const matchesAdviser = s.adviserId === currentUser.uid;
        const matchesGroup =
          (s.projectId && adviseeGroupIds.has(s.projectId)) ||
          (s.groupId && adviseeGroupIds.has(s.groupId));
        return matchesAdviser || matchesGroup;
      });

      // Sort upcoming defenses chronologically
      adviserSchedules.sort((a, b) => {
        const timeA = new Date(`${a.date || '2099-01-01'}T${a.startTime || '00:00'}`).getTime();
        const timeB = new Date(`${b.date || '2099-01-01'}T${b.startTime || '00:00'}`).getTime();
        return timeA - timeB;
      });
      setSchedules(adviserSchedules);

      // Calculate progress for all advisee groups using progressService
      const computedProgress = await facultyService.getGroupsProgressSummary(enrichedGroups);
      // Recalculate accurately from workspace chapters (20% per completed chapter)
      wsList.forEach((ws) => {
        if (ws.groupId) {
          computedProgress[ws.groupId] = progressService.calculateWorkspaceProgress(ws, [], []);
        }
      });
      setProgressMap(computedProgress);
    } catch (err) {
      console.error('[AdviserDashboardView] Failed to load dashboard data:', err);
      setToast('Failed to load dashboard data. Please refresh.');
      setToastVariant('error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial data load
  useEffect(() => {
    loadAdviserData();
  }, [currentUser?.uid]);

  // Subscribe to system activities
  useEffect(() => {
    const unsubscribe = systemActivityService.subscribeRecentActivities((items) => {
      setActivities(items);
      setActivityLoading(false);
    });
    return () => unsubscribe();
  }, []);


  // ----------------------------------------------------
  // METRICS & COMPUTATIONS
  // ----------------------------------------------------

  // 1. Active Research Groups
  const activeGroupsCount = groups.length;

  // 2. Manuscripts Needing Review
  // Either workspace status is under_review / submitted_for_review, or any section is submitted / under_review
  const manuscriptsNeedingReview = useMemo(() => {
    const items = [];
    workspaces.forEach((ws) => {
      const wsNeedsReview =
        ws.status === 'submitted_for_review' || ws.status === 'under_review';
      const submittedSections = (ws.sections || []).filter(
        (sec) => sec.status === 'submitted' || sec.status === 'under_review'
      );

      if (wsNeedsReview || submittedSections.length > 0) {
        items.push({
          workspaceId: ws.id,
          groupId: ws.groupId,
          groupName: ws.groupName || 'Research Group',
          title: ws.title || 'Untitled Manuscript',
          submittedSections,
          updatedAt: ws.updatedAt,
        });
      }
    });
    return items;
  }, [workspaces]);

  // 3. Pending & Overdue Tasks
  const { pendingTasks, overdueTasks, submittedTasks, inProgressTasks } = useMemo(() => {
    const now = Date.now();
    const pending = [];
    const overdue = [];
    const submitted = [];
    const inProgress = [];

    tasks.forEach((t) => {
      const isResolved = progressService.isTaskResolved(t);
      if (!isResolved) {
        pending.push(t);
        const isOverdue =
          t.dueDate &&
          new Date(t.dueDate).getTime() < now &&
          t.status !== 'completed' &&
          t.status !== 'resolved';

        if (isOverdue) overdue.push(t);
        if (t.status === 'submitted') submitted.push(t);
        if (t.status === 'in_progress' || t.status === 'todo') inProgress.push(t);
      }
    });

    return {
      pendingTasks: pending,
      overdueTasks: overdue,
      submittedTasks: submitted,
      inProgressTasks: inProgress,
    };
  }, [tasks]);

  // 4. Upcoming Defenses
  const upcomingDefenses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return schedules.filter((s) => {
      if (!s.date) return false;
      const sDate = new Date(s.date);
      return sDate.getTime() >= today.getTime();
    });
  }, [schedules]);

  const nearestDefense = upcomingDefenses[0] || null;

  // ----------------------------------------------------
  // ACTION REQUIRED COMPILATION
  // ----------------------------------------------------
  const totalActionCount =
    manuscriptsNeedingReview.length +
    submittedTasks.length +
    overdueTasks.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {toast && (
        <Toast
          message={toast}
          variant={toastVariant}
          onClose={() => setToast('')}
        />
      )}

      {/* ==================================================== */}
      {/* 1. 4 RESPONSIVE SUMMARY METRIC CARDS */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Research Groups */}
        <StatCard
          icon={HiUsers}
          showIcon
          label="Active Research Groups"
          value={activeGroupsCount}
          subtitle="Assigned Advisees"
          trend={activeGroupsCount > 0 ? 'Assigned' : 'None'}
          trendType={activeGroupsCount > 0 ? 'positive' : 'neutral'}
        />

        {/* Card 2: Manuscripts Needing Review */}
        <StatCard
          icon={HiDocumentText}
          showIcon
          label="Manuscripts Needing Review"
          value={manuscriptsNeedingReview.length}
          subtitle="Pending Review"
          trend={
            manuscriptsNeedingReview.length > 0
              ? 'Action Required'
              : 'All Caught Up'
          }
          trendType={manuscriptsNeedingReview.length > 0 ? 'negative' : 'positive'}
          valueColor={
            manuscriptsNeedingReview.length > 0
              ? 'text-amber-600 dark:text-amber-400'
              : undefined
          }
        />

        {/* Card 3: Pending Tasks */}
        <StatCard
          icon={HiClipboardDocumentList}
          showIcon
          label="Pending Advisee Tasks"
          value={pendingTasks.length}
          subtitle="Active tasks"
          trend={
            overdueTasks.length > 0
              ? `${overdueTasks.length} Overdue`
              : `${inProgressTasks.length} in progress`
          }
          trendType={overdueTasks.length > 0 ? 'negative' : 'neutral'}
          valueColor={
            overdueTasks.length > 0
              ? 'text-rose-600 dark:text-rose-400'
              : undefined
          }
        />

        {/* Card 4: Upcoming Defense */}
        <StatCard
          icon={HiCalendarDays}
          showIcon
          label="Upcoming Defense"
          value={nearestDefense ? nearestDefense.startTime || 'TBA' : '0'}
          subtitle={nearestDefense ? formatDefenseDate(nearestDefense.date) : 'No Upcoming'}
          trend={
            nearestDefense
              ? `${nearestDefense.defenseType === 'final_defense' ? 'Final Defense' : 'Proposal Defense'}`
              : 'Oral Hearings'
          }
          trendType={nearestDefense ? 'positive' : 'neutral'}
        />
      </div>

      {/* ==================================================== */}
      {/* MAIN TWO-COLUMN CONTENT GRID */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 COLS): Action Required, Progress, Groups List */}
        <div className="lg:col-span-2 space-y-6">

          {/* -------------------------------------------------- */}
          {/* 2. ACTION REQUIRED SECTION */}
          {/* -------------------------------------------------- */}
          <Card className="p-5 sm:p-6 space-y-5 border-0 shadow-sm ring-1 ring-gray-100 dark:ring-[#222433]">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                    Action Required
                    {totalActionCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                        {totalActionCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
                    Items currently requiring your review, sign-off, or intervention
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Checking pending actions...
              </div>
            ) : totalActionCount === 0 ? (
              /* Honest Empty State for Action Required */
              <div className="py-6 px-4 rounded-xl border border-dashed border-gray-200 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1a1b26]/30 flex flex-col items-center justify-center text-center space-y-1.5">
                <HiCheckBadge className="w-8 h-8 text-emerald-500 shrink-0" />
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  No Actions Required
                </h4>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-md">
                  There are currently no pending actions requiring your attention. All manuscripts and tasks are up to date.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Manuscripts Awaiting Review */}
                {manuscriptsNeedingReview.map((item) => (
                  <div
                    key={item.workspaceId}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Manuscript Review
                        </span>
                        <span className="text-[11px] text-gray-400">· {item.groupName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#9396a8]">
                        {item.submittedSections.length > 0
                          ? `Sections submitted: ${item.submittedSections
                              .map((s) => s.name)
                              .join(', ')}`
                          : 'Full manuscript submitted for verification.'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/faculty/workspace/${item.groupId || item.workspaceId}`)
                      }
                      className="shrink-0 text-[11px] py-1.5 flex items-center gap-1 self-start"
                    >
                      Review <HiArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* Submitted Tasks Awaiting Sign-off */}
                {submittedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Task Submitted
                        </span>
                        {t.priority && (
                          <span className="text-[10px] uppercase font-bold text-amber-500">
                            {t.priority}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#9396a8]">
                        Assigned to {t.studentName || 'Student'} • Due {formatRelativeTime(t.dueDate)}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/faculty/workspace/${t.workspaceId || t.projectId}`)
                      }
                      className="shrink-0 text-[11px] py-1.5 flex items-center gap-1 self-start"
                    >
                      Verify <HiArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* Overdue Tasks */}
                {overdueTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] flex flex-col sm:flex-row sm:items-start justify-between gap-4 group hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-500 dark:text-rose-400">
                          Overdue Task
                        </span>
                        <span className="text-[11px] text-gray-400">
                          • Due {formatDefenseDate(t.dueDate)}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#9396a8]">
                        Advisee: {t.studentName || 'Student'}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate(`/faculty/workspace/${t.workspaceId || t.projectId}`)
                      }
                      className="shrink-0 text-[11px] py-1.5 flex items-center gap-1 self-start"
                    >
                      Check <HiArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* -------------------------------------------------- */}
          {/* 3. RESEARCH PROGRESS OVERVIEW */}
          {/* -------------------------------------------------- */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Research Progress Overview
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
                  Live milestone completion across all active advisee research groups
                </p>
              </div>
              {groups.length > 0 && (
                <Link
                  to="/advisees"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  Manage Advisees →
                </Link>
              )}
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Calculating group progress...
              </div>
            ) : groups.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No active advisee research groups currently assigned.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {groups.map((group) => {
                  const progress = progressMap[group.id] || 0;
                  const membersCount = group.members?.length || 0;

                  // Progress bar color gradient
                  const progressColor =
                    progress >= 75
                      ? 'from-emerald-500 to-teal-400'
                      : progress >= 40
                      ? 'from-blue-600 to-indigo-500'
                      : 'from-amber-500 to-orange-400';

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white">
                              {group.name}
                            </span>
                            <Badge
                              variant={
                                group.status === 'completed'
                                  ? 'emerald'
                                  : group.status === 'submitted_for_review'
                                  ? 'amber'
                                  : 'blue'
                              }
                            >
                              {group.status ? group.status.replace('_', ' ') : 'in progress'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md mt-0.5">
                            {group.title || 'No Research Title Set'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            {progress}%
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/faculty/workspace/${group.id}`)}
                            className="text-xs py-1 px-2.5 h-auto"
                          >
                            Workspace ΓåÆ
                          </Button>
                        </div>
                      </div>

                      {/* Horizontal Progress Bar */}
                      <div className="w-full bg-gray-200/80 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${progressColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-[#6b6f84] pt-0.5">
                        <span>
                          {membersCount} {membersCount === 1 ? 'member' : 'members'} enrolled
                        </span>
                        <span>
                          {group.updatedAt
                            ? `Updated ${formatRelativeTime(group.updatedAt)}`
                            : 'Active term'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>


        </div>

        {/* RIGHT COLUMN (1 COL): Upcoming Defenses & Recent Activity */}
        <div className="space-y-6">

          {/* -------------------------------------------------- */}
          {/* 5. UPCOMING DEFENSES SECTION */}
          {/* -------------------------------------------------- */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Upcoming Defenses
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
                  Scheduled hearings for your advisees
                </p>
              </div>
              <Link
                to="/schedules"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                All Schedules →
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Loading schedules...
              </div>
            ) : upcomingDefenses.length === 0 ? (
              /* Honest Empty State for Defenses */
              <div className="py-8 px-4 rounded-xl border border-dashed border-gray-200 dark:border-[#222433] text-center space-y-1.5">
                <HiCalendarDays className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  No Upcoming Defenses
                </h4>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  There are currently no upcoming defense schedules for your research groups.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {upcomingDefenses.slice(0, 4).map((sch) => (
                  <div
                    key={sch.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e] hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={sch.defenseType === 'final_defense' ? 'emerald' : 'blue'}>
                        {sch.defenseType === 'final_defense'
                          ? 'Final Defense'
                          : 'Proposal Defense'}
                      </Badge>
                      <span className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        <HiClock className="w-3.5 h-3.5 text-blue-500" />
                        {sch.startTime || 'TBA'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                        {sch.projectTitle || 'Oral Examination'}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-[#9396a8] mt-0.5">
                        Date: {formatDefenseDate(sch.date)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-[#9396a8] pt-1 border-t border-gray-100 dark:border-[#222433]">
                      <span className="flex items-center gap-1 truncate max-w-[160px]">
                        <HiMapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {sch.venue || sch.location || 'Room TBA'}
                      </span>
                      <Link
                        to="/schedules"
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* -------------------------------------------------- */}
          {/* 6. RECENT SYSTEM ACTIVITY WIDGET */}
          {/* -------------------------------------------------- */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Recent System Activity
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
                  Real-time actions &amp; milestone events
                </p>
              </div>
            </div>

            {activityLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-xs">Loading activity...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                No system activities recorded yet.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {activities.slice(0, 6).map((item) => {
                  const dotColor =
                    item.category === 'task'
                      ? 'bg-emerald-500'
                      : item.category === 'adviser'
                      ? 'bg-blue-500'
                      : item.category === 'repository'
                      ? 'bg-purple-500'
                      : item.category === 'feedback'
                      ? 'bg-amber-500'
                      : item.category === 'schedule'
                      ? 'bg-indigo-500'
                      : 'bg-gray-400';

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50/70 dark:hover:bg-[#1c1d28]/60 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-gray-500 dark:text-[#9396a8] line-clamp-2 leading-relaxed text-[11px]">
                          {item.description}
                        </div>
                        <div className="flex items-center justify-between pt-0.5 text-[10px] text-gray-400 dark:text-[#6b6f84]">
                          <span>{item.actorName || 'System'}</span>
                          <span>{formatRelativeTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
