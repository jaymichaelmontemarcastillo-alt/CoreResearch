// src/components/dashboard/StudentDashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HiAcademicCap, 
  HiUserGroup, 
  HiDocumentText, 
  HiArrowTopRightOnSquare,
  HiOutlineBookOpen,
  HiCalendarDays,
  HiBolt
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

export const StudentDashboardView = () => {
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
        if (isMounted) setWorkspace(ws);

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
          description: `Advisees addressed revision: "${r.comment.slice(0, 70)}..."`,
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
          description: `"${r.comment.slice(0, 80)}" in ${r.sectionId ? r.sectionId.replace('_', ' ') : 'manuscript'}.`,
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

    // Group Documents
    groupDocuments.forEach((doc) => {
      if (doc.updatedAt) {
        feed.push({
          id: `doc-up-${doc.id}`,
          category: 'document',
          title: 'Manuscript Draft Updated',
          description: `Saved changes to "${doc.title || 'Research Document'}" in ONLYOFFICE.`,
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

  return (
    <div className="space-y-6">
      {/* Top Banner: Academic & Research Group Context */}
      <Card className="p-5 sm:p-6 border-blue-100/70 dark:border-blue-900/30 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-transparent dark:from-blue-950/20 dark:via-indigo-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">
                Active Research Cohort
              </span>
              <Badge variant="blue" size="sm">
                {userProfile?.enrollmentStatus || 'Active Student'}
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {workspace?.title || (group?.name ? `${group.name} Research Cohort` : 'Undergraduate Research')}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-[#9396a8] pt-0.5">
              {programInfo.course && (
                <span>
                  Program: <strong className="text-gray-800 dark:text-gray-200">{programInfo.course.name}</strong>
                </span>
              )}
              {programInfo.sectionName && (
                <span>
                  Section: <strong className="text-gray-800 dark:text-gray-200">{programInfo.sectionName}</strong>
                </span>
              )}
              {workspace?.adviserName && (
                <span>
                  Adviser: <strong className="text-gray-800 dark:text-gray-200">{workspace.adviserName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {documentId ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/documents/${documentId}`)}
                className="shadow-sm"
              >
                <HiDocumentText className="w-4 h-4 mr-1.5" /> Open Manuscript in ONLYOFFICE
              </Button>
            ) : null}
            <Link to="/research/workspace">
              <Button variant="outline" size="sm">
                <HiOutlineBookOpen className="w-4 h-4 mr-1.5" /> Research Workspace
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* ====== ROW 1: UPCOMING DEADLINES & MANUSCRIPT REVISIONS ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Module 1: Upcoming Deadlines */}
        <UpcomingDeadlinesCard
          deadlines={upcomingDeadlines}
          loading={loading}
        />

        {/* Module 2: Manuscript Revisions */}
        <ManuscriptRevisionsCard
          revisions={revisions}
          workspace={workspace}
          documentId={documentId}
          loading={loading}
        />
      </div>

      {/* ====== ROW 2: RECENT RESEARCH ACTIVITY (7-DAY BAR CHART) ====== */}
      <ResearchActivityChart
        dailyActivity={dailyActivity}
        loading={loading}
      />

      {/* ====== ROW 3: GROUP ACTIVITY & RECENT ACTIVITY FEED ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Module 4: Group Activity */}
        <GroupActivityCard
          members={group?.members || []}
          activityRecords={activityRecords}
          currentUserId={studentUid}
          loading={loading}
        />

        {/* Module 5: Recent Activity Feed */}
        <StudentRecentActivityFeed
          activities={recentActivities}
          currentUserId={studentUid}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default StudentDashboardView;
