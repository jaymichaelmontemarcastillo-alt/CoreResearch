// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatCard } from "../components/ui/StatCard";
import {
  FileText,
  FolderGit2,
  MessageSquare,
  Calendar,
  Award,
  BookOpen,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  PlusCircle,
  Shield,
  GraduationCap,
  UserCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export const Dashboard = () => {
  const { userProfile, role } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner matching Dashboard Reference */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {getGreeting()}, {userProfile?.fullName || "Researcher"} 👋
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">
            Your dashboard is active under{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {userProfile?.department || "Computer Studies"}
            </span>
            . Centralized workspace for proposals, manuscript revisions, defense rubrics, and archiving.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {role === "student" && (
            <Link to="/proposals/new">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-2" /> Submit Proposal
              </Button>
            </Link>
          )}
          {role === "admin" && (
            <Link to="/admin/users">
              <Button variant="primary" size="md">
                <Users className="w-4 h-4 mr-2" /> Manage Users
              </Button>
            </Link>
          )}
          {(role === "adviser" || role === "panelist") && (
            <Link to="/reviews">
              <Button variant="primary" size="md">
                <MessageSquare className="w-4 h-4 mr-2" /> View Feedback Threads
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      {role === "student" && <StudentDashboardMetrics />}
      {role === "adviser" && <AdviserDashboardMetrics />}
      {role === "panelist" && <PanelistDashboardMetrics />}
      {role === "admin" && <AdminDashboardMetrics />}

      {/* Main Content Grid: Pipeline + Active Papers + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Role-Specific Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ====== STUDENT CONTENT ====== */}
          {(!role || role === "student") && (
            <>
              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card hover className="flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge variant="blue">Proposal Stage</Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Title Proposals
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Submit new research titles, review evaluation status, and adviser recommendations.
                    </p>
                  </div>
                  <Link
                    to="/proposals"
                    className="text-xs font-semibold text-primary dark:text-blue-400 flex items-center gap-1 hover:underline pt-2"
                  >
                    View Proposals <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Card>

                <Card hover className="flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FolderGit2 className="w-5 h-5" />
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
                    Open Manuscripts <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </Card>
              </div>

              {/* Current Research Highlight */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    CURRENT MANUSCRIPT DRAFT
                  </h3>
                  <Badge variant="purple">v1.2 In Progress</Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    Enhancing RAG Retrieval with Hybrid Graph-Vector Embeddings
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last edited 2 days ago — <strong className="text-gray-700 dark:text-gray-300">80% complete</strong>
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
                    <div className="bg-primary h-2 rounded-full w-[80%]" />
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ====== ADMIN CONTENT ====== */}
          {role === "admin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
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
                  Manage Users <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>

              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
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
                  View Repository <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>
            </div>
          )}

          {/* ====== ADVISER & PANELIST CONTENT ====== */}
          {(role === "adviser" || role === "panelist") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant="blue">Pending Action</Badge>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Review Proposals
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Evaluate and approve new title proposals submitted by students.
                  </p>
                </div>
                <Link
                  to="/proposals"
                  className="text-xs font-semibold text-primary dark:text-blue-400 flex items-center gap-1 hover:underline pt-2"
                >
                  View Proposals <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>

              <Card hover className="flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
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
                  View Reviews <ArrowUpRight className="w-3.5 h-3.5" />
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
                <Activity className="w-4 h-4 text-primary" /> RECENT ACTIVITY
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
              Browse University Research Repository <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

/* Student Metrics */
const StudentDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={FileText} label="Proposal Status" value="Approved" color="emerald" valueColor="text-emerald-600 dark:text-emerald-400" />
    <StatCard icon={FolderGit2} label="Current Manuscript" value="Version v1.2" color="blue" />
    <StatCard icon={MessageSquare} label="Adviser Comments" value="3 Pending" color="amber" valueColor="text-amber-600 dark:text-amber-400" />
    <StatCard icon={Calendar} label="Defense Schedule" value="Aug 14, 2026" color="purple" valueColor="text-purple-600 dark:text-purple-400" />
  </div>
);

/* Adviser Metrics */
const AdviserDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={UserCheck} label="Assigned Teams" value="6 Research Groups" color="emerald" />
    <StatCard icon={Clock} label="Pending Reviews" value="4 Manuscripts" color="amber" valueColor="text-amber-600 dark:text-amber-400" />
    <StatCard icon={FileText} label="Title Proposals" value="2 Pending" color="blue" valueColor="text-primary dark:text-blue-400" />
    <StatCard icon={Award} label="Upcoming Defenses" value="3 This Month" color="purple" valueColor="text-purple-600 dark:text-purple-400" />
  </div>
);

/* Panelist Metrics */
const PanelistDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={Calendar} label="Assigned Defenses" value="5 Panels" color="purple" />
    <StatCard icon={Award} label="Pending Rubrics" value="2 Forms" color="amber" valueColor="text-amber-600 dark:text-amber-400" />
    <StatCard icon={CheckCircle2} label="Evaluations Done" value="8 Completed" color="emerald" valueColor="text-emerald-600 dark:text-emerald-400" />
    <StatCard icon={FolderGit2} label="Pre-Defense Papers" value="3 Available" color="blue" valueColor="text-primary dark:text-blue-400" />
  </div>
);

/* Admin Metrics */
const AdminDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={Users} label="Total Users" value="128 Registered" color="amber" />
    <StatCard icon={FileText} label="Active Proposals" value="42 Active" color="blue" valueColor="text-primary dark:text-blue-400" />
    <StatCard icon={BookOpen} label="Published Papers" value="19 Repository" color="emerald" valueColor="text-emerald-600 dark:text-emerald-400" />
    <StatCard icon={Shield} label="System Health" value="100% Operational" color="blue" valueColor="text-emerald-600 dark:text-emerald-400" />
  </div>
);
