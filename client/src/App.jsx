import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Unauthorized } from './pages/Unauthorized';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { JoinSection } from './pages/JoinSection';

import { UserDirectory } from './pages/UserDirectory';
import { StudentDirectory } from './pages/StudentDirectory';
import { ResearchGroups } from './pages/ResearchGroups';
import { MyGroup } from './pages/MyGroup';
import { Courses } from './pages/Courses';
import { Sections } from './pages/Sections';
import { Proposals } from './pages/Proposals';
import { SubmitProposal } from './pages/SubmitProposal';
import { ProposalDetail } from './pages/ProposalDetail';
import { CoordinatorProposals } from './pages/CoordinatorProposals';
import { CoordinatorProposalReview } from './pages/CoordinatorProposalReview';
import { Projects } from './pages/Projects';
import { Documents } from './pages/Documents';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { Reviews } from './pages/Reviews';
import { Schedules } from './pages/Schedules';
import { Repository } from './pages/Repository';
import { ProfileSettings } from './pages/ProfileSettings';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Public/Shared Routes */}
            <Route path="/join/:inviteId" element={<JoinSection />} />

            {/* Protected Main Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />

              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<ProfileSettings />} />
                <Route path="/profile-settings" element={<ProfileSettings />} />
                <Route path="/settings" element={<ProfileSettings />} />

                {/* Student specific */}
                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                  <Route path="/my-group" element={<MyGroup />} />
                </Route>

                {/* Proposals Routes */}
                <Route path="/proposals" element={<Proposals />} />
                <Route path="/proposals/new" element={<SubmitProposal />} />
                <Route path="/proposals/:id" element={<ProposalDetail />} />

                {/* Coordinator Routes */}
                <Route element={<ProtectedRoute allowedRoles={['research_coordinator', 'admin']} />}>
                  <Route path="/coordinator/proposals" element={<CoordinatorProposals />} />
                  <Route path="/coordinator/proposals/:id" element={<CoordinatorProposalReview />} />
                </Route>

                {/* Research Projects */}
                <Route path="/projects" element={<Projects />} />

                {/* Real-time Documents Editor */}
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:id" element={<DocumentEditorPage />} />

                {/* Reviews */}
                <Route path="/reviews" element={<Reviews />} />

                {/* Schedules */}
                <Route path="/schedules" element={<Schedules />} />

                {/* Repository */}
                <Route path="/repository" element={<Repository />} />

                {/* Student & Groups Management */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'research_coordinator', 'adviser']} />}>
                  <Route path="/students" element={<StudentDirectory />} />
                  <Route path="/admin/students" element={<StudentDirectory />} />
                  <Route path="/research-groups" element={<ResearchGroups />} />
                  <Route path="/groups" element={<ResearchGroups />} />
                  <Route path="/admin/groups" element={<ResearchGroups />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin/users" element={<UserDirectory />} />
                  <Route path="/admin/courses" element={<Courses />} />
                  <Route path="/admin/courses/:courseId/sections" element={<Sections />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
