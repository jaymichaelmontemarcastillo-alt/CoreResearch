import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
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
  UserCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { userProfile, role } = useAuth();

  return (
    <div className="space-y-6 text-left">
      
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="blue" className="text-xs">
                {(role || 'Student').toUpperCase()} WORKSPACE
              </Badge>
              <span className="text-slate-500 text-xs">• {userProfile?.department || 'Computer Studies'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {userProfile?.fullName || 'Researcher'}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
              Centralized platform for research title proposals, manuscript revisions, defense rubrics, and institutional repository archiving.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {role === 'student' && (
              <Link to="/proposals">
                <Button variant="primary" size="md">
                  <PlusCircle className="w-4 h-4 mr-2" /> Submit Proposal
                </Button>
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/admin/users">
                <Button variant="primary" size="md">
                  <Users className="w-4 h-4 mr-2" /> Manage Users
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      {role === 'student' && <StudentDashboardMetrics />}
      {role === 'adviser' && <AdviserDashboardMetrics />}
      {role === 'panelist' && <PanelistDashboardMetrics />}
      {role === 'admin' && <AdminDashboardMetrics />}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Module Card 1: Title Proposals */}
        <Card hover className="flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <Badge variant="blue">Proposal Stage</Badge>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Title Proposals</h3>
            <p className="text-xs text-slate-400 mt-1">Submit new research titles, review status, and adviser recommendations.</p>
          </div>
          <Link to="/proposals" className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:underline pt-2">
            View Proposals <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Module Card 2: Manuscripts */}
        <Card hover className="flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <Badge variant="emerald">Versioning v1.2</Badge>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Manuscript Repository</h3>
            <p className="text-xs text-slate-400 mt-1">Upload PDF/DOCX drafts, track submission timeline, and download revisions.</p>
          </div>
          <Link to="/manuscripts" className="text-xs font-bold text-emerald-400 flex items-center gap-1 hover:underline pt-2">
            Open Manuscripts <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Module Card 3: Defense & Schedules */}
        <Card hover className="flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <Badge variant="purple">Interactive Calendar</Badge>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Defense Scheduling</h3>
            <p className="text-xs text-slate-400 mt-1">View scheduled presentation dates, room venues, and panelist committee members.</p>
          </div>
          <Link to="/schedules" className="text-xs font-bold text-purple-400 flex items-center gap-1 hover:underline pt-2">
            Check Calendar <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

      </div>
    </div>
  );
};

/* Student Metrics */
const StudentDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Proposal Status</div>
        <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
        <FolderGit2 className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Current Manuscript</div>
        <div className="text-sm font-bold text-white">Version v1.2</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
        <MessageSquare className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Adviser Comments</div>
        <div className="text-sm font-bold text-white">3 Pending Revisions</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
        <Calendar className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Defense Schedule</div>
        <div className="text-sm font-bold text-purple-400">Aug 14, 2026</div>
      </div>
    </Card>
  </div>
);

/* Adviser Metrics */
const AdviserDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
        <UserCheck className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Assigned Teams</div>
        <div className="text-base font-extrabold text-white">6 Research Groups</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
        <Clock className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Pending Reviews</div>
        <div className="text-base font-extrabold text-amber-400">4 Manuscripts</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Title Proposals</div>
        <div className="text-base font-extrabold text-white">2 Pending Approval</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
        <Award className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Upcoming Defenses</div>
        <div className="text-base font-extrabold text-white">3 This Month</div>
      </div>
    </Card>
  </div>
);

/* Panelist Metrics */
const PanelistDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
        <Calendar className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Assigned Defenses</div>
        <div className="text-base font-extrabold text-white">5 Panels</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
        <Award className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Pending Rubrics</div>
        <div className="text-base font-extrabold text-amber-400">2 Forms</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Evaluations Submitted</div>
        <div className="text-base font-extrabold text-white">8 Completed</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
        <FolderGit2 className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Pre-Defense Papers</div>
        <div className="text-base font-extrabold text-white">3 Available</div>
      </div>
    </Card>
  </div>
);

/* Admin Metrics */
const AdminDashboardMetrics = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
        <Users className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Total System Users</div>
        <div className="text-base font-extrabold text-white">128 Registered</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
        <FileText className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Active Proposals</div>
        <div className="text-base font-extrabold text-white">42 Active</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
        <BookOpen className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">Published Papers</div>
        <div className="text-base font-extrabold text-emerald-400">19 Repository</div>
      </div>
    </Card>

    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
        <Shield className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-400">System Health</div>
        <div className="text-base font-extrabold text-emerald-400">100% Operational</div>
      </div>
    </Card>
  </div>
);
