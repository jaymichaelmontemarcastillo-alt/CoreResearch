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

import { UserDirectory } from './pages/UserDirectory';
import { Proposals } from './pages/Proposals';
import { SubmitProposal } from './pages/SubmitProposal';
import { ProposalDetail } from './pages/ProposalDetail';
import { Projects } from './pages/Projects';
import { Manuscripts } from './pages/Manuscripts';
import { Reviews } from './pages/Reviews';
import { Schedules } from './pages/Schedules';
import { Grading } from './pages/Grading';
import { Repository } from './pages/Repository';

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

            {/* Protected Main Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />

              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Proposals Routes */}
                <Route path="/proposals" element={<Proposals />} />
                <Route path="/proposals/new" element={<SubmitProposal />} />
                <Route path="/proposals/:id" element={<ProposalDetail />} />

                {/* Research Projects */}
                <Route path="/projects" element={<Projects />} />

                {/* Manuscripts */}
                <Route path="/manuscripts" element={<Manuscripts />} />

                {/* Reviews */}
                <Route path="/reviews" element={<Reviews />} />

                {/* Schedules */}
                <Route path="/schedules" element={<Schedules />} />

                {/* Grading */}
                <Route path="/grading" element={<Grading />} />

                {/* Repository */}
                <Route path="/repository" element={<Repository />} />

                {/* Admin User Management */}
                <Route path="/admin/users" element={<UserDirectory />} />
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
