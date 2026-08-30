// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import {
  HiDocumentText,
  HiFolder,
  HiChatBubbleLeftRight,
  HiCalendarDays,
  HiTrophy,
  HiBookOpen,
  HiUsers,
  HiArrowUpRight,
  HiCheckCircle,
  HiClock,
  HiPlusCircle,
  HiShieldCheck,
  HiAcademicCap,
  HiCheckBadge,
  HiBolt,
  HiArrowRight,
} from "react-icons/hi2";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { groupService } from "../services/group.service";
import titleProposalService from "../services/titleProposal.service";
import researchWorkspaceService from "../services/researchWorkspace.service";
import manuscriptDocumentAdapter from "../services/manuscriptDocumentAdapter";
import { documentStore } from "../services/documentStore";
import { Toast } from "../components/ui/Toast";
import { facultyService } from '../services/faculty.service';
import { adviserRequestService } from '../services/adviserRequest.service';

export const Dashboard = () => {
  const { userProfile, currentUser, role, currentFacultyMode, setFacultyMode } = useAuth();
  
  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;
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
            courseId ? courseService.getAllCourses() : Promise.resolve([]),
            studentUid ? groupService.getGroupByStudentId(studentUid) : Promise.resolve(null),
          ]);

          const course = courses.find((c) => c.id === courseId);
          let sectionName = sectionId || "";

          if (course && sectionId) {
            const sections = await sectionService.getSectionsByCourseId(course.id);
            const sec = sections.find((s) => s.id === sectionId);
            if (sec) sectionName = sec.name;
          }

          // Fetch student proposals, workspace, and documents
          let proposals = [];
          if (group?.id) {
            proposals = await titleProposalService.getProposalsByGroup(group.id);
          }
          if (proposals.length === 0 && studentUid) {
            proposals = await titleProposalService.getProposalsByStudentId(studentUid);
          }

          const workspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup(
            studentUid,
            group?.id
          );

          let userDocs = [];
          try {
            const docs = await documentStore.fetchDocuments(userProfile);
            userDocs = (docs || []).filter(
              (d) => d.ownerId === studentUid || (group?.id && d.groupId === group.id)
            );
          } catch (e) {}

          if (isMounted) {
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

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast message={toastMessage} variant="success" onClose={() => setToastMessage("")} />
      )}

      {/* Welcome Banner matching Dashboard Reference */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
              {getGreeting()}, {displayName} 👋
            </h1>
          </div>
          {role === 'faculty' && (
            <div className="flex items-center gap-2 mt-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-max">
              <button
                onClick={() => setFacultyMode('adviser')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentFacultyMode === 'adviser'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Adviser Mode
              </button>
              <button
                onClick={() => setFacultyMode('panelist')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentFacultyMode === 'panelist'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Panelist Mode
              </button>
            </div>
          )}
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">
            Your dashboard is active under{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {userProfile?.department || "Computer Studies"}
            </span>
            . Centralized workspace for proposals, manuscript revisions, defense rubrics, and archiving.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {effectiveRole === "student" && (
            <>
              <Link to="/research/workspace">
                <Button variant="secondary" size="md">
                  <HiBookOpen className="w-4 h-4 mr-2" /> Research Workspace
                </Button>
              </Link>
              <Link to="/submit-title">
                <Button variant="primary" size="md">
                  <HiPlusCircle className="w-4 h-4 mr-2" /> Start Research Workflow
                </Button>
              </Link>
            </>
          )}
          {effectiveRole === "adviser" && (
            <>
              <Link to="/advisees">
                <Button variant="primary" size="md">
                  <HiUsers className="w-4 h-4 mr-2" /> My Advisees
                </Button>
              </Link>
              <Link to="/reviews">
                <Button variant="secondary" size="md">
                  <HiChatBubbleLeftRight className="w-4 h-4 mr-2" /> Feedback Threads
                </Button>
              </Link>
            </>
          )}
          {effectiveRole === "panelist" && (
            <Link to="/reviews">
              <Button variant="primary" size="md">
                <HiChatBubbleLeftRight className="w-4 h-4 mr-2" /> View Feedback Threads
              </Button>
            </Link>
          )}
          {effectiveRole === "admin" && (
            <Link to="/admin/users">
              <Button variant="primary" size="md">
                <HiUsers className="w-4 h-4 mr-2" /> Manage Users
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      {effectiveRole === "student" && <StudentDashboardMetrics research={studentResearch} userProfile={userProfile} />}
      {effectiveRole === "adviser" && <AdviserDashboardMetrics />}
      {effectiveRole === "panelist" && <PanelistDashboardMetrics />}
      {effectiveRole === "admin" && <AdminDashboardMetrics />}

      {/* Main Content Grid: Pipeline + Active Papers + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Role-Specific Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ====== STUDENT CONTENT ====== */}
          {(!effectiveRole || effectiveRole === "student") && (
            <>
              {/* Academic Profile Widget */}
              {userProfile && (
                <Card className="p-5 border-blue-100 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                      <HiAcademicCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Academic Profile</h3>
                      {userProfile.courseId ? (
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Course:</span>{" "}
                            {academicInfo?.course?.name || userProfile.courseId}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Section:</span>{" "}
                            {academicInfo?.sectionName || "Unassigned"}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Year Level:</span>{" "}
                            {userProfile.yearLevel ? `Year ${userProfile.yearLevel}` : "N/A"} 
                            {" • "}
                            <span className="capitalize">{userProfile.enrollmentStatus || "N/A"}</span>
                          </p>

                          {academicInfo?.group ? (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50">
                              <p className="font-semibold text-gray-900 dark:text-white mb-1 text-base">
                                {academicInfo.group.name}
                              </p>
                              <div className="flex flex-col gap-1 mt-1 text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">Members:</span>
                                {academicInfo.group.members.map(m => (
                                  <span key={m.uid} className="flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                    {m.fullName} {m.uid === userProfile.uid ? "(You)" : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50 text-orange-600 dark:text-orange-400 font-medium">
                              No Research Group Assigned Yet
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          You have not been assigned to a Course and Section yet. Please contact your coordinator.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!studentResearch.workspace && (
                  <Card hover className="flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center">
                        <HiDocumentText className="w-5 h-5" />
                      </div>
                      <Badge variant="blue">Proposal Stage</Badge>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        Submit Title
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Submit a new research title to find and match with a faculty adviser.
                      </p>
                    </div>
                    <Link
                      to="/submit-title"
                      className="text-xs font-semibold text-primary dark:text-blue-400 flex items-center gap-1 hover:underline pt-2"
                    >
                      Start Submission <HiArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </Card>
                )}

                <Card hover className="flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <HiFolder className="w-5 h-5" />
                    </div>
                    <Badge variant="emerald">Versioning</Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Manuscript Repository
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Upload PDF/DOCX drafts, track submission timelines, and download revisions.
                    </p>
                  </div>
                  <Link
                    to="/manuscripts"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline pt-2"
                  >
                    Open Manuscripts <HiArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Card>
              </div>

              {/* Current Research Highlight */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    CURRENT MANUSCRIPT DRAFT
                  </h3>
                  <Badge variant={studentResearch.workspace ? "purple" : studentResearch.proposal?.status === 'approved' ? "emerald" : "blue"}>
                    {studentResearch.workspace
                      ? "Active Workspace"
                      : studentResearch.proposal?.status
                      ? studentResearch.proposal.status.replace('_', ' ').toUpperCase()
                      : studentResearch.documents.length > 0
                      ? "Draft Document"
                      : "Ready to Start"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      {studentResearch.workspace?.title ||
                        studentResearch.proposal?.title ||
                        studentResearch.documents[0]?.title ||
                        "Research Manuscript Draft"}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {studentResearch.workspace
                        ? `Department of ${studentResearch.workspace.department || 'Computer Studies'} — Overall Progress: ${studentResearch.workspace.overallProgress || 20}%`
                        : studentResearch.proposal
                        ? `Proposal Status: ${studentResearch.proposal.status.replace('_', ' ')}`
                        : "No active manuscript yet. Start drafting or submit your Title Proposal."}
                    </p>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          studentResearch.workspace?.overallProgress ||
                          (studentResearch.proposal?.status === 'approved' ? 20 : studentResearch.proposal ? 10 : 0)
                        }%`,
                      }}
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        try {
                          if (studentResearch.workspace) {
                            const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
                              studentResearch.workspace,
                              userProfile
                            );
                            navigate(doc.editorUrl);
                          } else if (studentResearch.proposal) {
                            const ws = await researchWorkspaceService.getOrCreateWorkspaceForProposal(
                              studentResearch.proposal,
                              userProfile
                            );
                            const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
                              ws,
                              userProfile
                            );
                            navigate(doc.editorUrl);
                          } else {
                            const doc = await manuscriptDocumentAdapter.getOrCreateManuscriptDocument(
                              {
                                id: `ws-${currentUser?.uid}`,
                                title: 'Research Manuscript Draft',
                                groupId: userProfile?.groupId || '',
                              },
                              userProfile
                            );
                            navigate(doc.editorUrl);
                          }
                        } catch (e) {
                          navigate('/research/workspace');
                        }
                      }}
                    >
                      <HiBookOpen className="w-4 h-4 mr-1.5" />
                      Open Manuscript
                    </Button>
                    <Link to="/research/workspace">
                      <Button variant="outline" size="sm">
                        View Workspace
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ====== ADMIN CONTENT ====== */}
          {effectiveRole === "admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <HiUsers className="w-5 h-5" />
                  </div>
                  <Badge variant="amber">Access Control</Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    User Directory
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Manage institutional accounts, assign roles, and handle department assignments.
                  </p>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline pt-2"
                >
                  Manage Users <HiArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>

              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <HiBookOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="emerald">Knowledge Base</Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Repository Overview
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Monitor published papers and institutional research output.
                  </p>
                </div>
                <Link
                  to="/repository"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline pt-2"
                >
                  View Repository <HiArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>
            </div>
          )}

          {/* ====== ADVISER & PANELIST CONTENT ====== */}
          {(effectiveRole === "adviser" || effectiveRole === "panelist") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {effectiveRole === "adviser" && (
                <div className="sm:col-span-2">
                  <AdviserRequestsWidget />
                </div>
              )}

              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <HiChatBubbleLeftRight className="w-5 h-5" />
                  </div>
                  <Badge variant="purple">Collaboration</Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Feedback Threads
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Provide feedback on ongoing manuscript drafts and revisions.
                  </p>
                </div>
                <Link
                  to="/reviews"
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline pt-2"
                >
                  View Reviews <HiArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>
            </div>
          )}
        </div>

        {/* Right Col: Recent Activity */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <HiBolt className="w-4 h-4 text-primary" /> RECENT ACTIVITY
              </h3>
              <Link to="/reviews" className="text-xs text-primary font-semibold hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Manuscript under panel review
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Chapter 3 - System Design & Q&A
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">2 hours ago</div>
                </div>
                <Badge variant="blue">PLANNED</Badge>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Proposal approved
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Smart Agriculture Sensing Platform
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">Yesterday</div>
                </div>
                <Badge variant="emerald">APPROVED</Badge>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Defense Date Scheduled
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    Room 402 — Engineering Building
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">3 days ago</div>
                </div>
                <Badge variant="purple">SCHEDULED</Badge>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-slate-800 text-center">
            <Link to="/repository" className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400 flex items-center justify-center gap-1">
              Browse University Research Repository <HiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* Student Metrics */
const StudentDashboardMetrics = ({ research, userProfile }) => {
  const proposalStatus = research?.proposal
    ? research.proposal.status.replace('_', ' ').toUpperCase()
    : 'No Proposal';

  const manuscriptStatus = research?.workspace
    ? `${research.workspace.overallProgress || 20}% Complete`
    : (research?.documents?.length || 0) > 0
    ? `${research.documents.length} Draft${research.documents.length > 1 ? 's' : ''}`
    : 'Ready';

  const adviserStatus = research?.workspace?.adviserName || 'In Matching';
  const departmentStatus = userProfile?.department || 'Computer Studies';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={HiDocumentText}
        label="Proposal Status"
        value={proposalStatus}
        color={research?.proposal?.status === 'approved' ? 'emerald' : 'blue'}
        valueColor={research?.proposal?.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary dark:text-blue-400'}
      />
      <StatCard
        icon={HiFolder}
        label="Manuscript Progress"
        value={manuscriptStatus}
        color="purple"
      />
      <StatCard
        icon={HiUsers}
        label="Faculty Adviser"
        value={adviserStatus}
        color="emerald"
      />
      <StatCard
        icon={HiAcademicCap}
        label="Department"
        value={departmentStatus}
        color="amber"
      />
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
        // Assuming we could fetch reviews/proposals from other services if needed
        setMetrics(prev => ({ ...prev, groups: groups.length }));
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
  }, [currentUser?.uid]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={HiCheckBadge} label="My Groups" value={`${metrics.groups} Active`} color="emerald" />
      <StatCard icon={HiClock} label="Pending Reviews" value="View Action Hub" color="amber" valueColor="text-amber-600 dark:text-amber-400" />
      <StatCard icon={HiDocumentText} label="Advisees" value="Active Tracking" color="blue" valueColor="text-primary dark:text-blue-400" />
      <StatCard icon={HiTrophy} label="Upcoming Defenses" value="Check Schedule" color="purple" valueColor="text-purple-600 dark:text-purple-400" />
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
        const groups = await facultyService.getPanelistGroups(currentUser.uid);
        const defenses = await facultyService.getUpcomingDefenses(currentUser.uid);
        setMetrics({ defenses: defenses.length, groups: groups.length });
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
  }, [currentUser?.uid]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={HiCalendarDays} label="Assigned Defenses" value={`${metrics.defenses} Upcoming`} color="purple" />
      <StatCard icon={HiUsers} label="Panel Assignments" value={`${metrics.groups} Defendees`} color="amber" valueColor="text-amber-600 dark:text-amber-400" />
      <StatCard icon={HiCheckCircle} label="Evaluations Done" value="Pending Action" color="emerald" valueColor="text-emerald-600 dark:text-emerald-400" />
      <StatCard icon={HiFolder} label="Pre-Defense Papers" value="View Repository" color="blue" valueColor="text-primary dark:text-blue-400" />
    </div>
  );
};

/* Admin Metrics */
const AdminDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={HiUsers} label="Total Users" value="128 Registered" color="amber" />
    <StatCard icon={HiDocumentText} label="Active Proposals" value="42 Active" color="blue" valueColor="text-primary dark:text-blue-400" />
    <StatCard icon={HiBookOpen} label="Published Papers" value="19 Repository" color="emerald" valueColor="text-emerald-600 dark:text-emerald-400" />
    <StatCard icon={HiShieldCheck} label="System Health" value="100% Operational" color="blue" valueColor="text-emerald-600 dark:text-emerald-400" />
  </div>
);

/* Adviser Requests Widget */
const AdviserRequestsWidget = () => {
  const { currentUser, userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    const unsubscribe = adviserRequestService.subscribeToPendingAdviserRequests(currentUser.uid, (reqs) => {
      setRequests(reqs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAccept = async (reqId) => {
    try {
      const request = requests.find(r => r.id === reqId);
      if (!request) return;

      // 1. Accept the request
      await adviserRequestService.acceptRequest(reqId);
      
      // 2. Assign the adviser to the group
      if (request.groupId) {
        await groupService.updateGroup(request.groupId, {
          adviserId: request.adviserId,
          adviserName: request.adviserName
        });
      }

      // 3. Provision the Research Workspace
      // We pass a dummy userProfile, or we can fetch it, but getOrCreateWorkspaceForAdviserRequest handles it fine
      await researchWorkspaceService.getOrCreateWorkspaceForAdviserRequest(request, userProfile);

      // Remove from pending list
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {
      console.error(err);
      alert('Failed to accept request: ' + err.message);
    }
  };

  const handleDecline = async (reqId) => {
    try {
      await adviserRequestService.declineRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (err) {
      console.error(err);
      alert('Failed to decline request: ' + err.message);
    }
  };

  if (loading) return null;
  if (requests.length === 0) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-gray-500 min-h-[160px]">
        <HiCheckCircle className="w-8 h-8 text-gray-300 mb-2" />
        <p>No pending adviser requests.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <Card key={req.id} className="p-5 border-l-4 border-l-amber-500">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="amber">New Request</Badge>
                <span className="text-xs text-gray-400">Received {new Date(req.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{req.researchTitle}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{req.researchDescription}</p>
              
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <div><span className="font-semibold">Student:</span> {req.studentName}</div>
                {(req.courseName || req.sectionName) && (
                  <div><span className="font-semibold">Program/Section:</span> {req.courseName} {req.sectionName}</div>
                )}
                <div><span className="font-semibold text-blue-600 dark:text-blue-400">Match: {req.compatibilityScore}%</span></div>
              </div>
            </div>
            
            <div className="flex md:flex-col gap-2 shrink-0 self-start md:self-center w-full md:w-auto">
              <Button variant="primary" onClick={() => handleAccept(req.id)} className="flex-1 md:w-32">Accept</Button>
              <Button variant="danger" onClick={() => handleDecline(req.id)} className="flex-1 md:w-32 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">Decline</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
