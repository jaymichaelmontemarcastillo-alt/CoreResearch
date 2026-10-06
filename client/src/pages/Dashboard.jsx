// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import dataCache, { CACHE_TTL } from "../services/dataCache";
import { groupService } from "../services/group.service";
import titleProposalService from "../services/titleProposal.service";
import researchWorkspaceService from "../services/researchWorkspace.service";
import manuscriptDocumentAdapter from "../services/manuscriptDocumentAdapter";
import { documentStore } from "../services/documentStore";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { facultyService } from '../services/faculty.service';
import { adviserRequestService } from '../services/adviserRequest.service';
import { useNotifications } from "../hooks/useNotifications";
import { userService } from "../services/user.service";
import { AdminAnalyticsSection } from "../components/admin/analytics/AdminAnalyticsSection";
import { systemActivityService } from "../services/systemActivity.service";
import { AdviserDashboardView } from "../components/dashboard/AdviserDashboardView";
import { StudentDashboardView } from "../components/dashboard/StudentDashboardView";
import { HiClock, HiMagnifyingGlass } from "react-icons/hi2";

/* Shared helper — converts a date string/object to a relative time string */
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const Dashboard = () => {
  const { userProfile, currentUser, role, currentFacultyMode, setFacultyMode } = useAuth();

  const effectiveRole = role === 'faculty' ? currentFacultyMode : (role === 'research_coordinator' ? 'admin' : role);
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Construct the display name robustly based on available profile/auth data
  const displayName =
    userProfile?.fullName ||
    (userProfile?.first_name && userProfile?.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : null) ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Researcher";

  const location = useLocation();
  const [toastMessage, setToastMessage] = useState(location.state?.successMessage || "");

  useEffect(() => {
    // Clear history state to avoid showing toast again on reload
    if (location.state?.successMessage) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [academicInfo, setAcademicInfo] = useState(null);
  const [hasActiveResearch, setHasActiveResearch] = useState(false);
  const [studentResearch, setStudentResearch] = useState({
    workspace: null,
    proposal: null,
    documents: [],
    loading: true,
  });

  useEffect(() => {
    const studentUid = userProfile?.uid || currentUser?.uid;
    const courseId = userProfile?.courseId;
    const sectionId = userProfile?.sectionId;

    if (role === "student" && (courseId || studentUid)) {
      let isMounted = true;
      const fetchAcademicInfo = async () => {
        try {
          const [courses, group] = await Promise.all([
            courseId ? dataCache.getOrFetch('courses', () => courseService.getAllCourses(), CACHE_TTL.STABLE) : Promise.resolve([]),
            studentUid ? dataCache.getOrFetch(`group_${studentUid}`, () => groupService.getGroupByStudentId(studentUid), CACHE_TTL.MODERATE) : Promise.resolve(null),
          ]);

          const course = courses.find((c) => c.id === courseId);
          let sectionName = sectionId || "";

          if (course && sectionId) {
            const sections = await dataCache.getOrFetch(`sections_${course.id}`, () => sectionService.getSectionsByCourseId(course.id), CACHE_TTL.STABLE);
            const sec = sections.find((s) => s.id === sectionId);
            if (sec) sectionName = sec.name;
          }

          // Fetch student proposals, workspace, and documents
          const leaderUid = group?.memberIds?.[0] || group?.members?.[0]?.uid;
          let proposals = [];
          if (group?.id) {
            proposals = await titleProposalService.getProposalsByGroup(group.id, leaderUid);
          }
          if (proposals.length === 0 && studentUid) {
            proposals = await titleProposalService.getProposalsByStudentId(studentUid);
          }

          let workspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
            studentUid,
            group?.id,
            leaderUid
          );

          if (!workspace && group) {
            try {
              workspace = await researchWorkspaceService.getOrCreateWorkspaceForGroup(group, userProfile, leaderUid);
            } catch (e) {}
          }

          let userDocs = [];
          try {
            const docs = await documentStore.fetchDocuments(userProfile);
            userDocs = (docs || []).filter(
              (d) =>
                d.ownerId === studentUid ||
                (leaderUid && d.ownerId === leaderUid) ||
                (group?.id && d.groupId === group.id) ||
                (group?.memberIds && group.memberIds.includes(d.ownerId)) ||
                (workspace?.documentId && d.id === workspace.documentId)
            );
          } catch (e) { }

          if (isMounted) {
            setHasActiveResearch(Boolean(workspace));
            setAcademicInfo({ course, sectionName, group });
            setStudentResearch({
              workspace,
              proposal: proposals[0] || null,
              documents: userDocs,
              loading: false,
            });
          }
        } catch (error) {
          console.error("Failed to load academic and research info", error);
        }
      };
      fetchAcademicInfo();
      return () => { isMounted = false; };
    }
  }, [role, userProfile?.uid, userProfile?.courseId, userProfile?.sectionId, currentUser?.uid]);

  const isStudent = effectiveRole === "student" || (!effectiveRole && role !== 'admin' && role !== 'faculty');
  const showGreetingCard = !isStudent || (!hasActiveResearch && !studentResearch.workspace && !studentResearch.loading);

  return (
    <div className="space-y-4 sm:space-y-5">
      {toastMessage && (
        <Toast message={toastMessage} variant="success" onClose={() => setToastMessage("")} />
      )}

      {/* Page Header / Welcome Card — hidden for students with an active research */}
      {showGreetingCard && (
        <div className="p-4 sm:px-6 sm:py-5 rounded-2xl bg-white dark:bg-[#15161e] border border-gray-200/80 dark:border-[#222433] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {getGreeting()}, {displayName}
            </h1>
            {role === 'faculty' && (
              <div className="flex items-center gap-2 mt-2 bg-gray-100 dark:bg-[#1c1d28] p-1 rounded-lg w-max border border-transparent dark:border-[#222433]">
                <button
                  onClick={() => setFacultyMode('adviser')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${currentFacultyMode === 'adviser'
                      ? 'bg-white dark:bg-[#15161e] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-[#222433]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-[#9396a8] dark:hover:text-white'
                    }`}
                >
                  Adviser Mode
                </button>
                <button
                  onClick={() => setFacultyMode('panelist')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${currentFacultyMode === 'panelist'
                      ? 'bg-white dark:bg-[#15161e] text-blue-600 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-[#222433]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-[#9396a8] dark:hover:text-white'
                    }`}
                >
                  Panelist Mode
                </button>
              </div>
            )}
            <p className="text-gray-500 dark:text-[#9396a8] text-sm max-w-2xl leading-relaxed">
              Active under <span className="font-semibold text-gray-800 dark:text-white">{userProfile?.department || "Computer Studies"}</span>. Track research performance, monitor progress and stay updated on feedbacks.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">

            {effectiveRole === "adviser" && (
              <Link to="/advisees">
                <Button variant="primary" size="sm">
                  My Advisees
                </Button>
              </Link>
            )}
            {effectiveRole === "panelist" && (
              <Link to="/panelist/defendees">
                <Button variant="primary" size="sm">
                  Panel Defendees
                </Button>
              </Link>
            )}
            {effectiveRole === "admin" && (
              <Link to="/admin/users">
                <Button variant="primary" size="sm">
                  Manage Users
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Role-Specific Dashboard Content */}
      {effectiveRole === "adviser" ? (
        <AdviserDashboardView />
      ) : effectiveRole === "student" || (!effectiveRole && role !== 'admin' && role !== 'faculty') ? (
        <StudentDashboardView onActiveResearchChange={setHasActiveResearch} />
      ) : (
        <>
          {/* Metric Cards Row */}
          {effectiveRole === "panelist" && <PanelistDashboardMetrics />}
          {effectiveRole === "admin" && <AdminAnalyticsSection />}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols */}
            <div className="lg:col-span-2 space-y-5">

          {/* ====== ADMIN CONTENT ====== */}
          {effectiveRole === "admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-5 flex flex-col justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Research Hub</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Manuscript Management & Workflow
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed">
                    Review new uploads, ongoing revisions, approve camera-ready copies, award Best Thesis, and edit defense grades.
                  </p>
                </div>
                <Link
                  to="/admin/manuscripts"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage Manuscripts →
                </Link>
              </div>

              <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-5 flex flex-col justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Intelligence</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Data Analytics & Flow
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed">
                    Track the institutional research lifecycle flow, completion funnel, program comparisons, and adviser workloads.
                  </p>
                </div>
                <Link
                  to="/admin/analytics"
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  View Analytics Flow →
                </Link>
              </div>

              <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-5 flex flex-col justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Faculty</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Adviser & Faculty Profiles
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed">
                    Supervise adviser research specializations, active advisee quotas, and assigned research cohorts.
                  </p>
                </div>
                <Link
                  to="/admin/advisers"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage Advisers →
                </Link>
              </div>

              <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-5 flex flex-col justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Access</span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    User & Student Accounts
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed">
                    Manage institutional accounts, assign roles, approve registrations, and handle department affiliations.
                  </p>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Manage Users →
                </Link>
              </div>
            </div>
          )}

          {/* ====== ADVISER & PANELIST CONTENT ====== */}
          {/* Adviser specific dashboard content (Adviser Requests moved to separate page) */}
        </div>

        {/* Right Col: Recent Activity */}
        <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-6 h-full">
          <RecentActivityWidget currentUser={currentUser} />
        </div>
      </div>
    </>
  )}
</div>
);
};



/* Adviser Metrics */
const AdviserDashboardMetrics = () => {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState({ groups: 0, reviews: 0, proposals: 0, defenses: 0 });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchMetrics = async () => {
      try {
        const groups = await facultyService.getAdviserGroups(currentUser.uid);
        setMetrics(prev => ({ ...prev, groups: groups.length }));
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
  }, [currentUser?.uid]);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
      <StatCard
        label="Active Advisees"
        value={metrics.groups}
        subtitle="Groups"
        trend="Current Cohort"
        trendType="positive"
      />
      <StatCard
        label="Pending Reviews"
        value={metrics.reviews || 0}
        subtitle="Action Hub"
        trend="Manuscripts & Feedback"
        trendType="neutral"
        valueColor="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Title Proposals"
        value={metrics.proposals || 0}
        subtitle="Matching"
        trend="Adviser Requests"
        trendType="neutral"
      />
      <StatCard
        label="Upcoming Defenses"
        value={metrics.defenses || 0}
        subtitle="Schedules"
        trend="Oral Examinations"
        trendType="positive"
        className="col-span-3 sm:col-span-1"
      />
    </div>
  );
};

/* Panelist Metrics */
const PanelistDashboardMetrics = () => {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState({ defenses: 0, groups: 0 });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const fetchMetrics = async () => {
      try {
        const { default: dataCache, CACHE_TTL } = await import('../services/dataCache');
        const [groups, defenses] = await Promise.all([
          dataCache.getOrFetch(`panelist_groups_${currentUser.uid}`, () => facultyService.getPanelistGroups(currentUser.uid), CACHE_TTL.MODERATE),
          dataCache.getOrFetch(`panelist_defenses_${currentUser.uid}`, () => facultyService.getUpcomingDefenses(currentUser.uid), CACHE_TTL.MODERATE),
        ]);
        setMetrics({ defenses: defenses.length, groups: groups.length });
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
  }, [currentUser?.uid]);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
      <StatCard
        label="Assigned Defenses"
        value={metrics.defenses}
        subtitle="Schedules"
        trend="Upcoming Hearings"
        trendType="positive"
      />
      <StatCard
        label="Panel Defendees"
        value={metrics.groups}
        subtitle="Groups"
        trend="Assigned Research Groups"
        trendType="neutral"
      />
      <StatCard
        label="Rubric Evaluations"
        value="0"
        subtitle="Pending"
        trend="Grading Matrix"
        trendType="neutral"
      />
      <StatCard
        label="Repository Drafts"
        value="0"
        subtitle="Available"
        trend="Pre-Defense Manuscripts"
        trendType="positive"
        className="col-span-3 sm:col-span-1"
      />
    </div>
  );
};

/* Admin Metrics */
const AdminDashboardMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeProposals: 0,
    publishedTheses: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async () => {
      try {
        const [users, proposals] = await Promise.all([
          userService.getAllUsers().catch(() => []),
          titleProposalService.getAllProposals().catch(() => []),
        ]);
        if (!isMounted) return;

        const activeProps = proposals.filter((p) => p.status && p.status !== "draft");
        const approvedProps = proposals.filter((p) => p.status === "approved");

        setMetrics({
          totalUsers: users.length,
          activeProposals: activeProps.length,
          publishedTheses: approvedProps.length,
          loading: false,
        });
      } catch (err) {
        if (isMounted) setMetrics((prev) => ({ ...prev, loading: false }));
      }
    };

    loadMetrics();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
      <StatCard
        label="Total Users"
        value={metrics.loading ? "..." : metrics.totalUsers.toString()}
        trend="Registered in System"
        trendType="positive"
      />
      <StatCard
        label="Active Proposals"
        value={metrics.loading ? "..." : metrics.activeProposals.toString()}
        trend="Under Institutional Review"
        trendType="neutral"
        valueColor="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Approved Theses"
        value={metrics.loading ? "..." : metrics.publishedTheses.toString()}
        trend="Archived in Repository"
        trendType="positive"
      />
      <StatCard
        label="System Status"
        value="Operational"
        trend="All Services Operational"
        trendType="positive"
        className="col-span-3 sm:col-span-1"
      />
    </div>
  );
};



/* Recent Activity Widget — Displays real system activities across research workflow */
const RecentActivityWidget = () => {
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

