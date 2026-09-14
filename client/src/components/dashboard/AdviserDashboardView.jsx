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
  const [requests, setRequests] = useState([]);
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

  useEffect(() => {
    loadAdviserData();
  }, [currentUser?.uid]);

  // 2. Real-time subscription to pending Adviser Requests
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = adviserRequestService.subscribeToPendingAdviserRequests(
      currentUser.uid,
      (incomingRequests) => {
        setRequests(incomingRequests || []);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Real-time subscription to System Activity
  useEffect(() => {
    const unsubscribe = systemActivityService.subscribeRecentActivities((items) => {
      setActivities(items || []);
      setActivityLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Request Handlers
  const handleAcceptRequest = async (reqId) => {
    setActionLoading(reqId);
    try {
      const request = requests.find((r) => r.id === reqId);
      if (!request) return;

      await adviserRequestService.acceptRequest(reqId);

      if (request.groupId) {
        await groupService.updateGroup(request.groupId, {
          adviserId: request.adviserId || currentUser.uid,
          adviserName: request.adviserName || currentUser.displayName || 'Faculty Adviser',
          title: request.researchTitle || '',
        });
      }

      await researchWorkspaceService.getOrCreateWorkspaceForAdviserRequest(request, userProfile);

      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      setToast(`Accepted request for "${request.researchTitle || 'Research'}"!`);
      setToastVariant('success');

      // Refresh groups and workspaces list
      loadAdviserData();
    } catch (err) {
      console.error('[AdviserDashboardView] handleAcceptRequest error:', err);
      setToast('Failed to accept request: ' + err.message);
      setToastVariant('error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (reqId) => {
    setActionLoading(reqId);
    try {
      await adviserRequestService.declineRequest(reqId);
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      setToast('Mentorship request declined.');
      setToastVariant('success');
    } catch (err) {
      console.error('[AdviserDashboardView] handleDeclineRequest error:', err);
      setToast('Failed to decline request: ' + err.message);
      setToastVariant('error');
    } finally {
      setActionLoading(null);
    }
  };

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
    requests.length +
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
          value={`${activeGroupsCount} ${activeGroupsCount === 1 ? 'Group' : 'Groups'}`}
          trend={activeGroupsCount > 0 ? 'Assigned Advisees' : 'No Advisees'}
          trendType={activeGroupsCount > 0 ? 'positive' : 'neutral'}
        />

        {/* Card 2: Manuscripts Needing Review */}
        <StatCard
          icon={HiDocumentText}
          showIcon
          label="Manuscripts Needing Review"
          value={
            manuscriptsNeedingReview.length > 0
              ? `${manuscriptsNeedingReview.length} Pending`
              : '0 Pending'
          }
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
          value={`${pendingTasks.length} Active`}
          trend={
            overdueTasks.length > 0
              ? `${overdueTasks.length} Overdue • ${inProgressTasks.length} Active`
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
          value={
            nearestDefense
              ? `${formatDefenseDate(nearestDefense.date)}`
              : 'No Upcoming'
          }
          trend={
            nearestDefense
              ? `${nearestDefense.startTime || 'TBA'} • ${
                  nearestDefense.defenseType === 'final_defense'
                    ? 'Final Defense'
                    : 'Proposal Defense'
                }`
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
          <Card className="p-5 sm:p-6 border-l-4 border-l-amber-500 space-y-4">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <HiSparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Action Required
                    {totalActionCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                        {totalActionCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8]">
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
                  There are currently no pending actions requiring your attention. All manuscripts, tasks, and mentorship requests are up to date.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Pending Student Mentorship Requests */}
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/10 space-y-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="amber">Mentorship Request</Badge>
                          <span className="text-[11px] text-gray-400">
                            Received {formatRelativeTime(req.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                          {req.researchTitle || 'Research Proposal'}
                        </h4>
                        {req.researchDescription && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                            {req.researchDescription}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-[#9396a8]">
                          <div>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              Student:
                            </span>{' '}
                            {req.studentName}
                          </div>
                          {(req.courseName || req.sectionName) && (
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                Program:
                              </span>{' '}
                              {req.courseName} {req.sectionName}
                            </div>
                          )}
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            Match: {req.compatibilityScore || 0}%
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={actionLoading === req.id}
                          onClick={() => handleAcceptRequest(req.id)}
                          className="w-full sm:w-28 text-xs font-semibold"
                        >
                          {actionLoading === req.id ? 'Accepting...' : 'Accept'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionLoading === req.id}
                          onClick={() => handleDeclineRequest(req.id)}
                          className="w-full sm:w-28 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white border-transparent"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Manuscripts Awaiting Review */}
                {manuscriptsNeedingReview.map((item) => (
                  <div
                    key={item.workspaceId}
                    className="p-3.5 sm:p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="blue">Manuscript Review</Badge>
                        <span className="text-[11px] text-gray-400">
                          {item.groupName}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#9396a8]">
                        {item.submittedSections.length > 0
                          ? `Sections submitted: ${item.submittedSections
                              .map((s) => s.name)
                              .join(', ')}`
                          : 'Full manuscript submitted for adviser verification.'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(`/faculty/workspace/${item.groupId || item.workspaceId}`)
                      }
                      className="shrink-0 text-xs flex items-center gap-1 self-start sm:self-center"
                    >
                      Review Manuscript <HiArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Submitted Tasks Awaiting Sign-off */}
                {submittedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="emerald">Task Submitted</Badge>
                        {t.priority && (
                          <span className="text-[10px] uppercase font-bold text-amber-500">
                            {t.priority} priority
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
                      className="shrink-0 text-xs flex items-center gap-1 self-start sm:self-center"
                    >
                      Verify Task <HiArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Overdue Tasks */}
                {overdueTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 sm:p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="rose">Overdue Task</Badge>
                        <span className="text-[11px] text-rose-500 font-medium">
                          Due {formatDefenseDate(t.dueDate)}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
                      className="shrink-0 text-xs flex items-center gap-1 self-start sm:self-center"
                    >
                      Check Workspace <HiArrowRight className="w-3.5 h-3.5" />
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
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiClipboardDocumentList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Research Progress Overview
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#9396a8]">
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
                      className="p-3.5 sm:p-4 rounded-xl border border-gray-200/80 dark:border-[#222433] bg-gray-50/50 dark:bg-[#171822]/60 hover:border-gray-300 dark:hover:border-[#333649] transition-all space-y-2.5"
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
                            Workspace →
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

          {/* -------------------------------------------------- */}
          {/* 4. MY RESEARCH GROUPS (DETAILED TABLE / LIST) */}
          {/* -------------------------------------------------- */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#222433] pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiFolder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  My Research Groups
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#9396a8]">
                  Complete directory of research groups under your mentorship
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {groups.length} Cohorts
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading research cohorts...
              </div>
            ) : groups.length === 0 ? (
              /* Honest Empty State for Research Groups */
              <div className="py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-[#222433] text-center space-y-2">
                <HiUsers className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  No Active Research Groups
                </h4>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] max-w-sm mx-auto">
                  You currently have no active research groups assigned to you. Once students invite you or coordinators assign advisees, they will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#222433] text-[11px] uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                      <th className="pb-3 px-3 font-semibold">Group &amp; Title</th>
                      <th className="pb-3 px-3 font-semibold">Student Members</th>
                      <th className="pb-3 px-3 font-semibold">Program / Section</th>
                      <th className="pb-3 px-3 font-semibold">Progress</th>
                      <th className="pb-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#222433]/60 text-xs">
                    {groups.map((group) => {
                      const progress = progressMap[group.id] || 0;
                      const membersList = group.members || [];
                      const course = coursesMap[group.courseId];
                      const section = sectionsMap[group.sectionId];

                      return (
                        <tr
                          key={group.id}
                          className="hover:bg-gray-50/80 dark:hover:bg-[#1a1b26]/50 transition-colors"
                        >
                          {/* Group & Title */}
                          <td className="py-3.5 px-3 min-w-[180px]">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {group.name}
                            </div>
                            <div
                              className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[220px] mt-0.5"
                              title={group.title || 'No Title Set'}
                            >
                              {group.title || 'No Research Title Set'}
                            </div>
                          </td>

                          {/* Student Members */}
                          <td className="py-3.5 px-3 min-w-[160px]">
                            {membersList.length === 0 ? (
                              <span className="text-gray-400 italic">No members yet</span>
                            ) : (
                              <div className="space-y-0.5">
                                {membersList.slice(0, 2).map((m, idx) => (
                                  <div
                                    key={m.uid || idx}
                                    className="text-gray-700 dark:text-gray-300 font-medium"
                                  >
                                    {m.fullName || m.name}
                                  </div>
                                ))}
                                {membersList.length > 2 && (
                                  <span className="text-[10px] text-gray-400 font-semibold block">
                                    +{membersList.length - 2} more members
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Program & Section */}
                          <td className="py-3.5 px-3 min-w-[130px] text-gray-600 dark:text-gray-300">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {course?.code || course?.name || 'Academic Unit'}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {section?.name || 'Regular Section'}
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-3 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                />
                              </div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {progress}%
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 capitalize block mt-0.5">
                              {group.status ? group.status.replace('_', ' ') : 'in progress'}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/faculty/workspace/${group.id}`)}
                              className="text-xs py-1 px-3"
                            >
                              View Workspace <HiArrowRight className="w-3 h-3 ml-1 inline" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiCalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Upcoming Defenses
                </h3>
                <p className="text-[11px] text-gray-400">
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
                    className="p-3.5 rounded-xl border border-gray-200/80 dark:border-[#222433] bg-gray-50/50 dark:bg-[#171822]/60 hover:border-blue-300 dark:hover:border-blue-900/50 transition-all space-y-2"
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
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#9396a8]">
                  Recent System Activity
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
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
