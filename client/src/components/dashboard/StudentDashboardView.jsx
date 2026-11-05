// src/components/dashboard/StudentDashboardView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineBookOpen } from 'react-icons/hi2';

// Child Dashboard Cards
import { ManuscriptRevisionsCard } from './revisions/ManuscriptRevisionsCard';
import { ResearchActivityChart } from './activity/ResearchActivityChart';
import { GroupActivityCard } from './activity/GroupActivityCard';
import { StudentRecentActivityFeed } from './activity/StudentRecentActivityFeed';

// Services
import { groupService } from '../../services/group.service';
import researchWorkspaceService from '../../services/researchWorkspace.service';
import researchFeedbackService from '../../services/researchFeedback.service';
import researchTaskService from '../../services/researchTask.service';
import manuscriptDocumentAdapter from '../../services/manuscriptDocumentAdapter';
import { documentStore } from '../../services/documentStore';
import { courseService } from '../../services/course.service';
import { sectionService } from '../../services/section.service';
import adviserRequestService from '../../services/adviserRequest.service';
import titleProposalService from '../../services/titleProposal.service';
import dataCache, { CACHE_TTL } from '../../services/dataCache';

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

  // Synchronous cache hydration for instant initial render when navigating
  const cachedGroup = studentUid ? dataCache.get(`group_${studentUid}`) : null;
  const cachedWorkspace = studentUid ? dataCache.get(`workspace_${studentUid}`) : null;

  const [loading, setLoading] = useState(() => !cachedWorkspace && !cachedGroup);
  const [group, setGroup] = useState(() => cachedGroup);
  const [workspace, setWorkspace] = useState(() => cachedWorkspace);
  const [documentId, setDocumentId] = useState(() => cachedWorkspace?.documentId || null);
  const [programInfo, setProgramInfo] = useState(() => ({
    course: (userProfile?.programCode || userProfile?.program || userProfile?.courseId)
      ? {
          code: userProfile?.programCode || (userProfile?.courseId ? userProfile.courseId.toUpperCase() : userProfile?.program),
          name: userProfile?.program || userProfile?.programCode || userProfile?.courseId,
        }
      : null,
    sectionName: userProfile?.sectionName || userProfile?.section || userProfile?.sectionId || '',
  }));
  const [groupProjectInfo, setGroupProjectInfo] = useState(null);

  // Real-time Data
  const [revisions, setRevisions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [groupDocuments, setGroupDocuments] = useState([]);

  // Load Primary Group & Workspace
  useEffect(() => {
    if (!studentUid) return;

    let isMounted = true;
    const initData = async () => {
      // Only show full loading spinner if neither workspace nor group is cached
      if (!cachedWorkspace && !cachedGroup) {
        setLoading(true);
      }
      try {
        // 1. Parallel Core Fetches: Group and Workspace
        const studentGroupPromise = dataCache.getOrFetch(
          `group_${studentUid}`,
          () => groupService.getGroupByStudentId(studentUid),
          CACHE_TTL.MODERATE,
          { cacheNull: true }
        );

        // Fetch workspace in parallel with group lookup
        const workspacePromise = dataCache.getOrFetch(
          `workspace_${studentUid}`,
          async () => {
            let fetchedWs = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
              studentUid,
              userProfile?.groupId
            );

            // If not found yet, wait for groupPromise to resolve to check group.id / leaderUid
            if (!fetchedWs) {
              const studentGroup = await studentGroupPromise;
              const leaderUid = studentGroup?.memberIds?.[0] || studentGroup?.members?.[0]?.uid;
              if (studentGroup?.id || leaderUid) {
                fetchedWs = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
                  studentUid,
                  studentGroup?.id,
                  leaderUid
                );
              }
              // Auto-resolve / provision workspace only when group has assigned title/adviser
              if (!fetchedWs && studentGroup && studentGroup.status !== 'forming' && (studentGroup.adviserId || studentGroup.title)) {
                try {
                  fetchedWs = await researchWorkspaceService.getOrCreateWorkspaceForGroup(studentGroup, userProfile, leaderUid);
                } catch (e) {
                  console.info('[StudentDashboardView] Workspace prerequisite pending:', e.message);
                }
              }
            }
            return fetchedWs;
          },
          CACHE_TTL.SHORT,
          { cacheNull: true }
        );

        // Await the core data required to render the student's dashboard
        const [studentGroup, ws] = await Promise.all([
          studentGroupPromise,
          workspacePromise,
        ]);

        const leaderUid = studentGroup?.memberIds?.[0] || studentGroup?.members?.[0]?.uid;

        // Auto-sync student to group project in Firestore (non-blocking background task)
        if (studentGroup) {
          groupService.syncMemberToGroupProject(studentGroup.id, studentUid, userProfile).catch((err) => {
            console.warn('[StudentDashboardView] Group project sync error:', err);
          });
        }

        if (isMounted) {
          setGroup(studentGroup);
          setWorkspace(ws);
          if (ws?.documentId) {
            setDocumentId(ws.documentId);
          }
          if (onActiveResearchChange) onActiveResearchChange(Boolean(ws));
          // Core dashboard view unblocks immediately
          setLoading(false);
        }

        // 2. If no workspace, resolve group project status (pending request / proposal / title)
        if (!ws && studentGroup) {
          try {
            let sharedTitle = studentGroup.title || '';
            let sharedAdviser = studentGroup.adviserName || '';
            let sharedStatus = 'Group Formed';

            const [reqs, props] = await Promise.all([
              dataCache.getOrFetch(
                `adviser_requests_${studentUid}_${studentGroup.id || 'none'}`,
                () => adviserRequestService.getRequestsForStudentOrGroup(
                  studentUid,
                  studentGroup.id,
                  leaderUid
                ),
                CACHE_TTL.SHORT
              ),
              titleProposalService.getProposalsByGroup(studentGroup.id, leaderUid)
            ]);
            const activeReq = reqs.find((r) => r.status === 'pending' || r.status === 'accepted');
            if (activeReq) {
              if (!sharedTitle) sharedTitle = activeReq.researchTitle;
              if (!sharedAdviser) sharedAdviser = activeReq.adviserName;
              sharedStatus = activeReq.status === 'accepted' ? 'Adviser Accepted' : 'Adviser Request Pending';
            }

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

        // 3. Resolve ONLYOFFICE Document ID if missing from workspace record
        let resolvedDocId = ws?.documentId || null;
        if (!resolvedDocId && ws) {
          try {
            const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(ws, userProfile);
            resolvedDocId = doc?.id || null;
            if (isMounted && resolvedDocId) setDocumentId(resolvedDocId);
          } catch (e) {
            console.warn('[StudentDashboardView] Could not resolve manuscript document:', e);
          }
        }

        // 4. Background Enrichment: Documents for Activity feed & stats (Non-blocking)
        dataCache.getOrFetch(
          `user_docs_${studentUid}`,
          () => documentStore.fetchDocuments(userProfile),
          CACHE_TTL.SHORT
        ).then(async (docs) => {
          if (!isMounted) return;
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
              } catch (e) { }
            }
          }
        }).catch(() => {});

        // 5. Background Enrichment: Program & Section full names (Non-blocking)
        if (userProfile?.courseId) {
          Promise.all([
            dataCache.getOrFetch('courses', () => courseService.getAllCourses(), CACHE_TTL.STABLE),
            userProfile?.sectionId
              ? dataCache.getOrFetch(`sections_${userProfile.courseId}`, () => sectionService.getSectionsByCourseId(userProfile.courseId), CACHE_TTL.STABLE)
              : Promise.resolve([]),
          ]).then(([courses, sections]) => {
            if (!isMounted) return;
            const course = courses?.find((c) => c.id === userProfile.courseId);
            const sec = sections?.find((s) => s.id === userProfile.sectionId);
            if (course || sec) {
              setProgramInfo((prev) => ({
                course: course || prev.course,
                sectionName: sec?.name || prev.sectionName,
              }));
            }
          }).catch(() => {});
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
  }, [studentUid, userProfile?.courseId, userProfile?.sectionId, userProfile?.groupId]);

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

  // Compute 7-Day Recent Research Activity (Optimized single-pass bucketing)
  const dailyActivity = useMemo(() => {
    if (!workspace) return [];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const MS_PER_DAY = 86400000;

    // Pre-create the 7 day slots: index 0 = 6 days ago, index 6 = today
    const days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = todayMid - (6 - i) * MS_PER_DAY;
      const d = new Date(dayStart);
      return {
        start: dayStart,
        end: dayStart + MS_PER_DAY,
        date: d.toISOString().split('T')[0],
        day: weekdayNames[d.getDay()],
        shortDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        count: 0,
      };
    });

    const minTime = days[0].start;
    const maxTime = days[6].end;

    const countTimestamp = (ts) => {
      if (!ts) return;
      const t = typeof ts === 'number' ? ts : new Date(ts).getTime();
      if (isNaN(t) || t < minTime || t >= maxTime) return;
      const dayIdx = Math.floor((t - minTime) / MS_PER_DAY);
      if (dayIdx >= 0 && dayIdx < 7) {
        days[dayIdx].count++;
      }
    };

    tasks.forEach((t) => {
      countTimestamp(t.completedAt);
      countTimestamp(t.submittedAt);
      countTimestamp(t.createdAt);
      countTimestamp(t.updatedAt);
    });

    revisions.forEach((r) => {
      countTimestamp(r.createdAt);
      countTimestamp(r.updatedAt);
    });

    groupDocuments.forEach((doc) => {
      countTimestamp(doc.updatedAt);
    });

    return days;
  }, [workspace, tasks, revisions, groupDocuments]);

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
  }, [workspace, tasks, groupDocuments, revisions, studentUid]);

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
  }, [workspace, revisions, tasks, groupDocuments, documentId, studentUid]);

  // Helper booleans for layout conditional rendering
  const hasWorkspace = Boolean(workspace);
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
