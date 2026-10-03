import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { NetworkStatus } from './components/NetworkStatus';
import { PageLoadingFallback } from './components/ui/PageLoadingFallback';

// Lazy loaded pages
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Unauthorized = React.lazy(() => import('./pages/Unauthorized').then(m => ({ default: m.Unauthorized })));
const Onboarding = React.lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const JoinSection = React.lazy(() => import('./pages/JoinSection').then(m => ({ default: m.JoinSection })));

const UserDirectory = React.lazy(() => import('./pages/UserDirectory').then(m => ({ default: m.UserDirectory })));
const StudentDirectory = React.lazy(() => import('./pages/StudentDirectory').then(m => ({ default: m.StudentDirectory })));
const ResearchGroups = React.lazy(() => import('./pages/ResearchGroups').then(m => ({ default: m.ResearchGroups })));
const MyGroup = React.lazy(() => import('./pages/MyGroup').then(m => ({ default: m.MyGroup })));
const Courses = React.lazy(() => import('./pages/Courses').then(m => ({ default: m.Courses })));
const Sections = React.lazy(() => import('./pages/Sections').then(m => ({ default: m.Sections })));
const SubmitTitle = React.lazy(() => import('./pages/SubmitTitle').then(m => ({ default: m.SubmitTitle })));
const AdviserMatching = React.lazy(() => import('./pages/AdviserMatching').then(m => ({ default: m.AdviserMatching })));
const Projects = React.lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const StudentResearchWorkspace = React.lazy(() => import('./pages/StudentResearchWorkspace').then(m => ({ default: m.StudentResearchWorkspace })));
const AdviserAdvisees = React.lazy(() => import('./pages/AdviserAdvisees').then(m => ({ default: m.AdviserAdvisees })));
const FacultyWorkspaceView = React.lazy(() => import('./pages/FacultyWorkspaceView').then(m => ({ default: m.FacultyWorkspaceView })));
const PanelistDefendees = React.lazy(() => import('./pages/PanelistDefendees').then(m => ({ default: m.PanelistDefendees })));
const Documents = React.lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const DocumentEditorPage = React.lazy(() => import('./pages/DocumentEditorPage').then(m => ({ default: m.DocumentEditorPage })));
const Reviews = React.lazy(() => import('./pages/Reviews').then(m => ({ default: m.Reviews })));
const Schedules = React.lazy(() => import('./pages/Schedules').then(m => ({ default: m.Schedules })));
const Repository = React.lazy(() => import('./pages/Repository').then(m => ({ default: m.Repository })));
const ProfileSettings = React.lazy(() => import('./pages/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const Scheduling = React.lazy(() => import('./pages/Scheduling').then(m => ({ default: m.Scheduling })));
const Masterlist = React.lazy(() => import('./pages/Masterlist').then(m => ({ default: m.Masterlist })));
const Panelists = React.lazy(() => import('./pages/Panelists').then(m => ({ default: m.Panelists })));
const Notifications = React.lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const AdvisersList = React.lazy(() => import('./pages/AdvisersList').then(m => ({ default: m.AdvisersList })));
const ResearchDocumentsPage = React.lazy(() => import('./pages/ResearchDocumentsPage').then(m => ({ default: m.ResearchDocumentsPage })));
const AdminMasterCalendar = React.lazy(() => import('./pages/AdminMasterCalendar').then(m => ({ default: m.AdminMasterCalendar })));
const AdviserRequests = React.lazy(() => import('./pages/AdviserRequests').then(m => ({ default: m.AdviserRequests })));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmProvider>
            <NetworkStatus />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login portal="student" />} />
                <Route path="/register" element={<Register portal="student" />} />
                <Route path="/student/login" element={<Login portal="student" />} />
                <Route path="/student/register" element={<Register portal="student" />} />
                <Route path="/faculty/login" element={<Login portal="faculty" />} />
                <Route path="/faculty/register" element={<Register portal="faculty" />} />
                <Route path="/admin/login" element={<Login portal="admin" />} />
                <Route path="/admin-login" element={<Login portal="admin" />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Public/Shared Routes */}
                <Route path="/join/:inviteId" element={<JoinSection />} />

                {/* Protected Main Workspace Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<Onboarding />} />

                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile" element={<ProfileSettings />} />
                    <Route path="/profile-settings" element={<ProfileSettings />} />
                    <Route path="/settings" element={<ProfileSettings />} />

                    {/* Student specific */}
                    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                      <Route path="/my-group" element={<MyGroup />} />
                      <Route path="/masterlist" element={<Masterlist />} />
                      <Route path="/advisers" element={<AdvisersList />} />
                      <Route path="/submit-title" element={<SubmitTitle />} />
                      <Route path="/research/workspace" element={<StudentResearchWorkspace />} />
                      <Route path="/workspace" element={<StudentResearchWorkspace />} />
                    </Route>

                    {/* Adviser & Faculty specific */}
                    <Route element={<ProtectedRoute allowedRoles={['adviser', 'faculty', 'research_coordinator', 'admin']} />}>
                      <Route path="/advisees" element={<AdviserAdvisees />} />
                      <Route path="/adviser-requests" element={<AdviserRequests />} />
                      <Route path="/faculty/workspace/:id" element={<FacultyWorkspaceView />} />
                    </Route>

                    {/* Shared Research & Panelist Routes */}
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/panelists" element={<Panelists />} />
                    <Route path="/panelist/defendees" element={<PanelistDefendees />} />

                    {/* Real-time Documents Editor */}
                    <Route path="/documents" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/documents/:id" element={<DocumentEditorPage />} />

                    {/* Reviews */}
                    <Route path="/reviews" element={<Reviews />} />

                    {/* Schedules & Master Calendar */}
                    <Route path="/schedules" element={<Schedules />} />
                    <Route path="/calendar" element={<AdminMasterCalendar />} />

                    {/* Repository */}
                    <Route path="/repository" element={<Repository />} />

                    {/* Student & Groups Management */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'research_coordinator', 'adviser']} />}>
                      <Route path="/students" element={<StudentDirectory />} />
                      <Route path="/admin/students" element={<StudentDirectory />} />
                      <Route path="/research-groups" element={<ResearchGroups />} />
                      <Route path="/groups" element={<ResearchGroups />} />
                      <Route path="/admin/groups" element={<ResearchGroups />} />
                      <Route path="/admin/scheduling" element={<Scheduling />} />
                      <Route path="/research-documents" element={<ResearchDocumentsPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['admin', 'research_coordinator']} />}>
                      <Route path="/admin/users" element={<UserDirectory />} />
                      <Route path="/admin/courses" element={<Courses />} />
                      <Route path="/admin/courses/:courseId/sections" element={<Sections />} />
                    </Route>
                  </Route>
                </Route>

                {/* Fallback Redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
