// src/components/dashboard/StudentDashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HiDocumentText, 
  HiArrowTopRightOnSquare,
  HiOutlineBookOpen,
} from 'react-icons/hi2';

// Child Dashboard Cards
import { ManuscriptRevisionsCard } from './revisions/ManuscriptRevisionsCard';
import { UpcomingDeadlinesCard } from './deadlines/UpcomingDeadlinesCard';
import { ResearchActivityChart } from './activity/ResearchActivityChart';
import { GroupActivityCard } from './activity/GroupActivityCard';
import { StudentRecentActivityFeed } from './activity/StudentRecentActivityFeed';

// Services
import { groupService } from '../../services/group.service';
import researchWorkspaceService from '../../services/researchWorkspace.service';
import researchFeedbackService from '../../services/researchFeedback.service';
import researchTaskService from '../../services/researchTask.service';
import { scheduleService } from '../../services/schedule.service';
import manuscriptDocumentAdapter from '../../services/manuscriptDocumentAdapter';
import { documentStore } from '../../services/documentStore';
import { courseService } from '../../services/course.service';
import { sectionService } from '../../services/section.service';

/* ─── Dashboard Card Shell ─── */
const DashboardCard = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] ${className}`}>
    {children}
  </div>
);

export const StudentDashboardView = ({ onActiveResearchChange }) => {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  const studentUid = userProfile?.uid || currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [programInfo, setProgramInfo] = useState({ course: null, sectionName: '' });

  // Real-time Data
  const [revisions, setRevisions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [groupDocuments, setGroupDocuments] = useState([]);

  // Load Primary Group & Workspace
  useEffect(() => {
    if (!studentUid) return;

    let isMounted = true;
    const initData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Group
        const studentGroup = await groupService.getGroupByStudentId(studentUid);
        if (isMounted) setGroup(studentGroup);

        // 2. Fetch Workspace
        const ws = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
          studentUid,
          studentGroup?.id
        );
        if (isMounted) {
          setWorkspace(ws);
          if (onActiveResearchChange) {
            onActiveResearchChange(Boolean(ws));
          }
        }

        // 3. Resolve ONLYOFFICE Document ID
        let resolvedDocId = ws?.documentId || null;
        if (!resolvedDocId && ws) {
          try {
            const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(ws, userProfile);
            resolvedDocId = doc.id;
          } catch (e) {
            console.warn('[StudentDashboardView] Could not resolve manuscript document:', e);
          }
        }
        if (isMounted) setDocumentId(resolvedDocId);

        // 4. Fetch Course / Section name
        if (userProfile?.courseId) {
          try {
            const courses = await courseService.getAllCourses();
            const course = courses.find((c) => c.id === userProfile.courseId);
            let sectionName = userProfile.sectionId || '';
            if (course && userProfile.sectionId) {
              const sections = await sectionService.getSectionsByCourseId(course.id);
              const sec = sections.find((s) => s.id === userProfile.sectionId);
              if (sec) sectionName = sec.name;
            }
            if (isMounted) setProgramInfo({ course, sectionName });
          } catch (e) {}
        }

        // 5. Fetch Schedules
        try {
          const allSchedules = await scheduleService.getAllSchedules();
          if (isMounted) setSchedules(allSchedules || []);
        } catch (e) {
          console.warn('[StudentDashboardView] Schedules fetch error:', e);
        }

        // 6. Fetch Documents owned by group or student
        try {
          const docs = await documentStore.fetchDocuments(userProfile);
          const filtered = (docs || []).filter(
            (d) => d.ownerId === studentUid || (studentGroup?.id && d.groupId === studentGroup.id)
          );
          if (isMounted) setGroupDocuments(filtered);
        } catch (e) {}
      } catch (err) {
        console.error('[StudentDashboardView] Init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, [studentUid, userProfile?.courseId, userProfile?.sectionId]);

  // Real-time Subscriptions for Revisions (Feedback) & Tasks
  useEffect(() => {
    if (!workspace?.id) return;

    // A. Subscribe to Workspace Feedback (Manuscript Revisions)
    const unsubscribeFeedback = researchFeedbackService.subscribeWorkspaceFeedback(
      workspace.id,
      (feedbackList) => {
        setRevisions(feedbackList || []);
      }
    );

    // B. Subscribe to Workspace Tasks
    const unsubscribeTasks = researchTaskService.subscribeWorkspaceTasks(
      workspace.id,
      (taskList) => {
        setTasks(taskList || []);
      }
    );

    return () => {
      if (typeof unsubscribeFeedback === 'function') unsubscribeFeedback();
      if (typeof unsubscribeTasks === 'function') unsubscribeTasks();
    };
  }, [workspace?.id]);

  // Compute Filtered Upcoming Deadlines
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = [];

    // 1. Group / Student Defense Schedules
    schedules.forEach((sch) => {
      const matchesGroup = group?.id && (sch.projectId === group.id || sch.groupId === group.id);
      const matchesStudent = sch.studentId === studentUid || sch.studentName === userProfile?.fullName;
      const matchesTitle = workspace?.title && sch.projectTitle === workspace.title;

      if (matchesGroup || matchesStudent || matchesTitle) {
        const schDate = new Date(sch.date);
        if (!isNaN(schDate.getTime()) && schDate >= today) {
          list.push({
            id: `sch-${sch.id}`,
            date: sch.date,
            title: sch.projectTitle || sch.title || 'Research Presentation',
            defenseType: sch.defenseType || 'defense',
            startTime: sch.startTime,
            endTime: sch.endTime,
            venue: sch.venue,
            link: '/schedules',
          });
        }
      }
    });

    // 2. Tasks with due dates
    tasks.forEach((t) => {
      if (t.status !== 'completed' && t.dueDate) {
        const tDate = new Date(t.dueDate);
        if (!isNaN(tDate.getTime()) && tDate >= today) {
          list.push({
            id: `task-${t.id}`,
            date: t.dueDate,
            title: t.title,
            type: 'task',
            link: '/research/workspace',
          });
        }
      }
    });

    // Sort ascending by date
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [schedules, tasks, group?.id, studentUid, userProfile?.fullName, workspace?.title]);

  // Compute 7-Day Recent Research Activity
  const dailyActivity = useMemo(() => {
    const days = [];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate rolling last 7 days (6 days ago through today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dateStr = d.toISOString().split('T')[0];
      const dayName = weekdayNames[d.getDay()];
      const shortDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      // Count events matching this day
      let count = 0;

      // Tasks (created, submitted, or completed on this day)
      tasks.forEach((t) => {
        [t.completedAt, t.submittedAt, t.createdAt, t.updatedAt].forEach((ts) => {
          if (ts) {
            const evDate = new Date(ts);
            if (evDate >= d && evDate < nextDay) count++;
          }
        });
      });

      // Revisions / Feedback on this day
      revisions.forEach((r) => {
        [r.createdAt, r.updatedAt].forEach((ts) => {
          if (ts) {
            const evDate = new Date(ts);
            if (evDate >= d && evDate < nextDay) count++;
          }
        });
      });

      // Manuscript documents updated on this day
      groupDocuments.forEach((doc) => {
        if (doc.updatedAt) {
          const evDate = new Date(doc.updatedAt);
          if (evDate >= d && evDate < nextDay) count++;
        }
      });

      days.push({
        date: dateStr,
        day: dayName,
        shortDate,
        fullDate,
        count,
      });
    }

    return days;
  }, [tasks, revisions, groupDocuments]);

  // Compute Discrete Group Activity Records by Member
  const activityRecords = useMemo(() => {
    const records = [];

    // Task actions
    tasks.forEach((t) => {
      const uid = t.studentId;
      if (uid) {
        if (t.status === 'completed') {
          records.push({ memberId: uid, type: 'task', timestamp: t.completedAt || t.updatedAt });
        } else if (t.status === 'submitted') {
          records.push({ memberId: uid, type: 'task', timestamp: t.submittedAt || t.updatedAt });
        } else if (t.createdAt) {
          records.push({ memberId: uid, type: 'task', timestamp: t.createdAt });
        }
      }
    });

    // Document actions
    groupDocuments.forEach((doc) => {
      const uid = doc.ownerId;
      if (uid) {
        records.push({ memberId: uid, type: 'document', timestamp: doc.updatedAt || doc.createdAt });
      }
    });

    // Revision actions
    revisions.forEach((r) => {
      const uid = r.studentId || studentUid;
      if (r.status === 'addressed' || r.status === 'resolved') {
        records.push({ memberId: uid, type: 'revision', timestamp: r.updatedAt });
      } else {
        records.push({ memberId: uid, type: 'comment', timestamp: r.createdAt });
      }
    });

    return records;
  }, [tasks, groupDocuments, revisions, studentUid]);

  // Compute Chronological Recent Activity Feed for this Group
  const recentActivities = useMemo(() => {
    const feed = [];

    // Revisions
    revisions.forEach((r) => {
      if (r.status === 'resolved') {
        feed.push({
          id: `rev-res-${r.id}`,
          category: 'revision',
          title: 'Manuscript Revision Resolved',
          description: `Revision note on ${r.sectionId ? r.sectionId.replace('_', ' ') : 'manuscript'} verified and signed off.`,
          actorName: r.authorName || 'Faculty Adviser',
          actorId: r.authorId,
          timestamp: r.updatedAt || r.createdAt,
          link: documentId ? `/documents/${documentId}` : '/research/workspace',
        });
      } else if (r.status === 'addressed') {
        feed.push({
          id: `rev-add-${r.id}`,
          category: 'revision',
          title: 'Revision Response Submitted',
          description: `Addressed revision on ${r.sectionId ? r.sectionId.replace('_', ' ') : 'manuscript'}.`,
          actorName: 'You',
          actorId: studentUid,
          timestamp: r.updatedAt,
          link: documentId ? `/documents/${documentId}` : '/research/workspace',
        });
      } else {
        feed.push({
          id: `rev-new-${r.id}`,
          category: 'revision',
          title: 'Adviser Added Revision',
          description: `New comment on ${r.sectionId ? r.sectionId.replace('_', ' ') : 'manuscript'}.`,
          actorName: r.authorName || 'Faculty Adviser',
          actorId: r.authorId,
          timestamp: r.createdAt,
          link: documentId ? `/documents/${documentId}` : '/research/workspace',
        });
      }
    });

    // Tasks
    tasks.forEach((t) => {
      if (t.status === 'completed') {
        feed.push({
          id: `task-comp-${t.id}`,
          category: 'task',
          title: 'Research Task Completed',
          description: `Completed "${t.title}".`,
          actorName: t.studentName || 'Team Member',
          actorId: t.studentId,
          timestamp: t.completedAt || t.updatedAt,
          link: '/research/workspace',
        });
      } else if (t.status === 'submitted') {
        feed.push({
          id: `task-sub-${t.id}`,
          category: 'task',
          title: 'Task Submitted for Review',
          description: `Submitted work for "${t.title}".`,
          actorName: t.studentName || 'Team Member',
          actorId: t.studentId,
          timestamp: t.submittedAt || t.updatedAt,
          link: '/research/workspace',
        });
      }
    });

    // Group Documents — compact descriptions
    groupDocuments.forEach((doc) => {
      if (doc.updatedAt) {
        feed.push({
          id: `doc-up-${doc.id}`,
          category: 'document',
          title: 'Manuscript Draft Updated',
          description: 'Saved changes to the research manuscript.',
          actorName: doc.ownerName || 'Researcher',
          actorId: doc.ownerId,
          timestamp: doc.updatedAt,
          link: `/documents/${doc.id}`,
        });
      }
    });

    // Schedules
    upcomingDeadlines.forEach((sch) => {
      feed.push({
        id: `feed-sch-${sch.id}`,
        category: 'schedule',
        title: `Upcoming: ${sch.title}`,
        description: `Scheduled on ${new Date(sch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.`,
        actorName: 'Academic Schedule',
        timestamp: sch.date,
        link: sch.link || '/schedules',
      });
    });

    // Sort descending by timestamp
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feed;
  }, [revisions, tasks, groupDocuments, upcomingDeadlines, documentId, studentUid]);

  // Helper booleans for layout conditional rendering
  const hasDeadlines = !loading && upcomingDeadlines.length > 0;
  const hasRevisions = !loading && revisions.length > 0;
  
  const total7DayActions = dailyActivity.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const hasActivityChart = !loading && total7DayActions > 1;
  const hasFeed = !loading && recentActivities.length > 0;
  const hasGroupActivity = !loading && group?.members?.length > 0 && activityRecords.length > 0;

  return (
    <div className="space-y-5">
      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 1: Active Research Card (Full Width)    */}
      {/* ─────────────────────────────────────────────── */}
      {workspace && (
        <DashboardCard className="p-6 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 min-w-0 flex-1">
              <span className="text-[11px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400">
                Active Research
              </span>

              <h2
                className="text-xl sm:text-[22px] font-bold text-gray-900 dark:text-white leading-snug break-words"
                title={workspace.title}
              >
                {workspace.title || 'Untitled Research'}
              </h2>

              {/* Metadata line — dot-separated, no pills */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                {programInfo.course && (
                  <span>
                    Program: <strong className="text-gray-800 dark:text-gray-200">{programInfo.course.code || programInfo.course.name}</strong>
                  </span>
                )}
                {programInfo.sectionName && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>
                      Section: <strong className="text-gray-800 dark:text-gray-200">{programInfo.sectionName}</strong>
                    </span>
                  </>
                )}
                {workspace.adviserName && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>
                      Adviser: <strong className="text-gray-800 dark:text-gray-200">{workspace.adviserName}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 shrink-0 pt-1">
              {documentId && (
                <button
                  type="button"
                  onClick={() => navigate(`/documents/${documentId}`)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  Open Manuscript
                </button>
              )}
              <Link to="/research/workspace">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1d28] text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#222433] transition"
                >
                  Workspace
                </button>
              </Link>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
          <div className="w-7 h-7 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading research data...</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 2: Recent Activity (LEFT) + Chart (RIGHT) */}
      {/* ─────────────────────────────────────────────── */}
      {(hasFeed || hasActivityChart) && (
        <div className={`grid grid-cols-1 gap-5 ${hasFeed && hasActivityChart ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''} items-stretch`}>
          {/* LEFT: Recent Activity Feed */}
          {hasFeed && (
            <DashboardCard className="p-5 flex flex-col justify-between">
              <StudentRecentActivityFeed activities={recentActivities} currentUserId={studentUid} loading={loading} />
            </DashboardCard>
          )}

          {/* RIGHT: Research Activity Chart */}
          {hasActivityChart && (
            <DashboardCard className="p-5 flex flex-col justify-between">
              <ResearchActivityChart dailyActivity={dailyActivity} loading={loading} />
            </DashboardCard>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 3: Deadlines (LEFT) + Revisions (RIGHT) */}
      {/* ─────────────────────────────────────────────── */}
      {(hasDeadlines || hasRevisions) && (
        <div className={`grid grid-cols-1 gap-5 ${hasDeadlines && hasRevisions ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''}`}>
          {hasDeadlines && (
            <DashboardCard className="p-6">
              <UpcomingDeadlinesCard deadlines={upcomingDeadlines} loading={loading} />
            </DashboardCard>
          )}
          {hasRevisions && (
            <DashboardCard className="p-6">
              <ManuscriptRevisionsCard revisions={revisions} workspace={workspace} documentId={documentId} loading={loading} />
            </DashboardCard>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 4: Group Activity (Full Width)          */}
      {/* ─────────────────────────────────────────────── */}
      {hasGroupActivity && (
        <DashboardCard className="p-6">
          <GroupActivityCard members={group.members} activityRecords={activityRecords} currentUserId={studentUid} loading={loading} />
        </DashboardCard>
      )}
    </div>
  );
};

export default StudentDashboardView;
