// src/components/dashboard/StudentDashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
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
import adviserRequestService from '../../services/adviserRequest.service';
import titleProposalService from '../../services/titleProposal.service';

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
  const [groupProjectInfo, setGroupProjectInfo] = useState(null);

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
        const { default: dataCache, CACHE_TTL } = await import('../../services/dataCache');

        // 1. Fetch group first because schedules depends on it
        const studentGroup = await dataCache.getOrFetch(`group_${studentUid}`, () => groupService.getGroupByStudentId(studentUid), CACHE_TTL.MODERATE);

        // 2. Parallel Fetching for independent data
        const [courses, allSchedules, docs] = await Promise.all([
          userProfile?.courseId ? dataCache.getOrFetch('courses', () => courseService.getAllCourses(), CACHE_TTL.STABLE) : Promise.resolve([]),
          dataCache.getOrFetch(`schedules_${studentUid}`, () => scheduleService.getSchedulesForStudent(studentUid, studentGroup?.id, userProfile?.fullName), CACHE_TTL.MODERATE),
          dataCache.getOrFetch('user_docs', () => documentStore.fetchDocuments(userProfile), CACHE_TTL.SHORT).catch(() => [])
        ]);

        const leaderUid = studentGroup?.memberIds?.[0] || studentGroup?.members?.[0]?.uid;

        // Auto-sync student to group project in Firestore
        if (studentGroup) {
          groupService.syncMemberToGroupProject(studentGroup.id, studentUid, userProfile).catch((err) => {
            console.warn('[StudentDashboardView] Group project sync error:', err);
          });
        }

        if (isMounted) {
          setGroup(studentGroup);
          setSchedules(allSchedules || []);
        }

        // 2. Dependent fetches: Workspace and Sections
        let [ws, sections] = await Promise.all([
          dataCache.getOrFetch(`workspace_${studentUid}`, async () => {
            let fetchedWs = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
              studentUid,
              studentGroup?.id,
              leaderUid
            );
            // Auto-resolve / provision workspace if group or leader already has title or accepted request or approved proposal
            if (!fetchedWs && studentGroup) {
              try {
                fetchedWs = await researchWorkspaceService.getOrCreateWorkspaceForGroup(studentGroup, userProfile, leaderUid);
              } catch (e) {
                console.warn('[StudentDashboardView] Auto workspace create fallback:', e);
              }
            }
            return fetchedWs;
          }, CACHE_TTL.SHORT),
          (userProfile?.courseId && userProfile?.sectionId) ? 
            dataCache.getOrFetch(`sections_${userProfile.courseId}`, () => sectionService.getSectionsByCourseId(userProfile.courseId), CACHE_TTL.STABLE) : Promise.resolve([])
        ]);

        if (isMounted) {
          setWorkspace(ws);
          if (onActiveResearchChange) onActiveResearchChange(Boolean(ws));
        }

        // 2b. If still no workspace, resolve group project status (pending request / proposal / title)
        if (!ws && studentGroup) {
          try {
            let sharedTitle = studentGroup.title || '';
            let sharedAdviser = studentGroup.adviserName || '';
            let sharedStatus = 'Group Formed';

            const reqs = await adviserRequestService.getRequestsForStudentOrGroup(studentUid, studentGroup.id, leaderUid);
            const activeReq = reqs.find((r) => r.status === 'pending' || r.status === 'accepted');
            if (activeReq) {
              if (!sharedTitle) sharedTitle = activeReq.researchTitle;
              if (!sharedAdviser) sharedAdviser = activeReq.adviserName;
              sharedStatus = activeReq.status === 'accepted' ? 'Adviser Accepted' : 'Adviser Request Pending';
            }

            const props = await titleProposalService.getProposalsByGroup(studentGroup.id, leaderUid);
            if (props && props.length > 0) {
              const latestProp = props[0];
              if (!sharedTitle) sharedTitle = latestProp.title;
              if (latestProp.status === 'approved') sharedStatus = 'Title Approved';
              else if (latestProp.status === 'needs_revision') sharedStatus = 'Revision Required';
              else if (latestProp.status === 'submitted') sharedStatus = 'Proposal Under Review';
            }

            if (isMounted && (sharedTitle || studentGroup.name)) {
              setGroupProjectInfo({
                title: sharedTitle || 'Research Project in Progress',
                adviserName: sharedAdviser,
                status: sharedStatus,
                groupName: studentGroup.name,
                members: studentGroup.members || [],
              });
            }
          } catch (e) {
            console.warn('[StudentDashboardView] Group project info fallback:', e);
          }
        }

        // 3. Resolve ONLYOFFICE Document ID (requires workspace)
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

        // 4. Set Program Info
        if (isMounted && userProfile?.courseId) {
          const course = courses.find((c) => c.id === userProfile.courseId);
          const sec = sections.find((s) => s.id === userProfile.sectionId);
          setProgramInfo({ course, sectionName: sec?.name || userProfile.sectionId || '' });
        }

        // 5. Set Filtered Documents
        if (isMounted) {
          const filtered = (docs || []).filter(
            (d) =>
              d.ownerId === studentUid ||
              (leaderUid && d.ownerId === leaderUid) ||
              (studentGroup?.id && d.groupId === studentGroup.id) ||
              (studentGroup?.memberIds && studentGroup.memberIds.includes(d.ownerId)) ||
              (ws?.documentId && d.id === ws.documentId)
          );
          setGroupDocuments(filtered);

          // If workspace documentId was not populated yet, link the matched doc
          if (!resolvedDocId && filtered.length > 0) {
            resolvedDocId = filtered[0].id;
            setDocumentId(resolvedDocId);
            if (ws && !ws.documentId) {
              try {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../../firebase/firebase');
                await updateDoc(doc(db, 'manuscript_workspaces', ws.id), {
                  documentId: resolvedDocId,
                  updatedAt: new Date().toISOString(),
                });
                ws.documentId = resolvedDocId;
              } catch (e) {}
            }
          }
        }
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
    if (!workspace) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list = [];

    const leaderUid = group?.memberIds?.[0] || group?.members?.[0]?.uid;
    const leaderName = group?.members?.[0]?.fullName;

    // 1. Group / Student Defense Schedules
    schedules.forEach((sch) => {
      const matchesGroup = group?.id && (sch.projectId === group.id || sch.groupId === group.id);
      const matchesStudent = sch.studentId === studentUid || sch.studentName === userProfile?.fullName;
      const matchesLeader = leaderUid && (sch.studentId === leaderUid || (leaderName && sch.studentName === leaderName));
      const matchesMember = group?.memberIds && group.memberIds.includes(sch.studentId);
      const matchesTitle =
        workspace?.title &&
        (sch.projectTitle?.toLowerCase() === workspace.title.toLowerCase() ||
          sch.title?.toLowerCase() === workspace.title.toLowerCase());

      if (matchesGroup || matchesStudent || matchesLeader || matchesMember || matchesTitle) {
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
    if (!workspace) return [];
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
    if (!workspace) return [];
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
    if (!workspace) return [];
    const feed = [];

    // Revisions (Only show student actions like addressing a revision)
    revisions.forEach((r) => {
      if (r.status === 'addressed') {
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
      }
    });

    // Tasks (Only show student actions like completing or submitting)
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

    // Sort descending by timestamp
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feed;
  }, [revisions, tasks, groupDocuments, upcomingDeadlines, documentId, studentUid]);

  // Helper booleans for layout conditional rendering
  const hasWorkspace = Boolean(workspace);
  const hasDeadlines = !loading && hasWorkspace && upcomingDeadlines.length > 0;
  const hasRevisions = !loading && hasWorkspace && revisions.length > 0;
  
  const total7DayActions = dailyActivity.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const hasActivityChart = !loading && hasWorkspace && total7DayActions > 1;
  const hasFeed = !loading && hasWorkspace && recentActivities.length > 0;
  const hasGroupActivity = !loading && hasWorkspace && group?.members?.length > 0 && activityRecords.length > 0;

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* ─────────────────────────────────────────────── */}
      {/* SHARED GROUP RESEARCH IN PROGRESS               */}
      {/* ─────────────────────────────────────────────── */}
      {!loading && !workspace && groupProjectInfo && (
        <DashboardCard className="p-5 sm:p-7 border-blue-200 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 dark:from-blue-950/20 dark:via-[#15161e] dark:to-indigo-950/10 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400">
                  Shared Group Project • {groupProjectInfo.groupName}
                </span>
                <Badge variant="blue" size="sm" className="font-semibold text-[11px]">
                  {groupProjectInfo.status}
                </Badge>
              </div>

              <h2
                className="text-base sm:text-xl lg:text-[22px] font-bold text-gray-900 dark:text-white leading-snug break-words"
                title={groupProjectInfo.title}
              >
                {groupProjectInfo.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
                {groupProjectInfo.adviserName && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>
                      Adviser: <strong className="text-gray-800 dark:text-gray-200">{groupProjectInfo.adviserName}</strong>
                    </span>
                  </>
                )}
              </div>

              {groupProjectInfo.members && groupProjectInfo.members.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium mr-1">Team:</span>
                  {groupProjectInfo.members.map((m) => (
                    <span
                      key={m.uid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-[#1f202e] text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-[#2b2d42]"
                    >
                      {m.fullName}
                      {m.uid === studentUid && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">(You)</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0 pt-1">
              <Link to="/research/workspace">
                <Button variant="primary" size="sm" className="font-semibold shadow-xs">
                  Go to Workspace
                </Button>
              </Link>
              <Link to="/my-group">
                <Button variant="outline" size="sm" className="font-medium">
                  View Group
                </Button>
              </Link>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* EMPTY STATE: No Active Research Workspace       */}
      {/* ─────────────────────────────────────────────── */}
      {!loading && !workspace && !groupProjectInfo && (
        <DashboardCard className="p-6 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <HiOutlineBookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              No Active Research Workspace
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-[#9396a8] leading-relaxed">
              Submit a research title proposal to get started. Once approved and an adviser is assigned, your research workspace, manuscript, and activities will appear here.
            </p>
          </div>
          <div className="pt-1 sm:pt-2 flex items-center gap-3">
            <Link to="/submit-title">
              <button
                type="button"
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition shadow-xs flex items-center gap-2"
              >
                Submit Title Proposal
              </button>
            </Link>
          </div>
        </DashboardCard>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 1: Active Research Card (Full Width)    */}
      {/* ─────────────────────────────────────────────── */}
      {workspace && (
        <DashboardCard className="p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-6">
            <div className="space-y-2 sm:space-y-3 min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400">
                Active Research
              </span>

              <h2
                className="text-base sm:text-xl lg:text-[22px] font-bold text-gray-900 dark:text-white leading-snug break-words"
                title={workspace.title}
              >
                {workspace.title || 'Untitled Research'}
              </h2>

              {/* Metadata line — dot-separated, no pills */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-0.5 sm:pt-1">
              {documentId && (
                <button
                  type="button"
                  onClick={() => navigate(`/documents/${documentId}`)}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 sm:gap-2 shadow-xs"
                >
                  Open Manuscript
                </button>
              )}
              <Link to="/research/workspace">
                <button
                  type="button"
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1d28] text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#222433] transition"
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
        <div className="py-12 sm:py-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
          <div className="w-7 h-7 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading research data...</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 2: Recent Activity (LEFT) + Chart (RIGHT) */}
      {/* ─────────────────────────────────────────────── */}
      {(hasFeed || hasActivityChart) && (
        <div className={`grid grid-cols-1 gap-3.5 sm:gap-5 ${hasFeed && hasActivityChart ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''} items-stretch`}>
          {/* LEFT: Recent Activity Feed */}
          {hasFeed && (
            <DashboardCard className="p-3.5 sm:p-5 flex flex-col justify-between">
              <StudentRecentActivityFeed activities={recentActivities} currentUserId={studentUid} loading={loading} />
            </DashboardCard>
          )}

          {/* RIGHT: Research Activity Chart */}
          {hasActivityChart && (
            <DashboardCard className="p-3.5 sm:p-5 flex flex-col justify-between">
              <ResearchActivityChart dailyActivity={dailyActivity} loading={loading} />
            </DashboardCard>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* SECTION 3: Group Activity (LEFT) + Revisions (RIGHT) */}
      {/* ─────────────────────────────────────────────── */}
      {(hasGroupActivity || hasRevisions) && (
        <div className={`grid grid-cols-1 gap-3.5 sm:gap-5 ${(hasGroupActivity && hasRevisions) ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''} items-stretch`}>
          {hasGroupActivity && (
            <DashboardCard className="p-4 sm:p-6 flex flex-col justify-between">
              <GroupActivityCard members={group.members} activityRecords={activityRecords} currentUserId={studentUid} loading={loading} />
            </DashboardCard>
          )}
          {hasRevisions && (
            <DashboardCard className="p-4 sm:p-6 flex flex-col justify-between">
              <ManuscriptRevisionsCard revisions={revisions} workspace={workspace} documentId={documentId} loading={loading} />
            </DashboardCard>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboardView;
