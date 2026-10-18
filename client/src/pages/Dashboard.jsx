import React, { useState, useEffect, Suspense, lazy } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import { Link, useLocation } from "react-router-dom";
import { Toast } from "../components/ui/Toast";
import { RecentActivityWidget } from "../components/dashboard/activity/RecentActivityWidget";
import { facultyService } from "../services/faculty.service";

const AdviserDashboardView = lazy(() =>
  import("../components/dashboard/AdviserDashboardView").then((m) => ({ default: m.AdviserDashboardView }))
);
const StudentDashboardView = lazy(() =>
  import("../components/dashboard/StudentDashboardView").then((m) => ({ default: m.StudentDashboardView }))
);
const AdminAnalyticsSection = lazy(() =>
  import("../components/admin/analytics/AdminAnalyticsSection").then((m) => ({ default: m.AdminAnalyticsSection }))
);

export const Dashboard = () => {
  const { userProfile, currentUser, role, currentFacultyMode, setFacultyMode } = useAuth();

  const effectiveRole = role === 'faculty' ? currentFacultyMode : (role === 'research_coordinator' ? 'admin' : role);

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

  const [hasActiveResearch, setHasActiveResearch] = useState(false);

  const isAdminOrCoordinator = effectiveRole === "admin" || effectiveRole === "research_coordinator" || effectiveRole === "coordinator" || role === "admin" || role === "research_coordinator" || role === "coordinator";
  const isStudent = effectiveRole === "student" || (!effectiveRole && !isAdminOrCoordinator && role !== 'faculty');
  const showGreetingCard = !isStudent || !hasActiveResearch;

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
            {isAdminOrCoordinator && (
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
      <Suspense fallback={
        <div className="py-12 flex justify-center items-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        {effectiveRole === "adviser" ? (
          <AdviserDashboardView />
        ) : isStudent ? (
          <StudentDashboardView onActiveResearchChange={setHasActiveResearch} />
        ) : (
          <>
            {/* Metric Cards Row */}
            {effectiveRole === "panelist" && <PanelistDashboardMetrics />}
            {isAdminOrCoordinator && <AdminAnalyticsSection />}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Cols (or 3 for admin) */}
              <div className={isAdminOrCoordinator ? "lg:col-span-3 space-y-5" : "lg:col-span-2 space-y-5"}>

            {/* ====== ADMIN CONTENT ====== */}
            {isAdminOrCoordinator && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Right Col: Recent Activity for Non-Admins */}
          {!isAdminOrCoordinator && (
            <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-6 h-full">
              <RecentActivityWidget currentUser={currentUser} />
            </div>
          )}
        </div>
      </>
    )}
  </Suspense>
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





