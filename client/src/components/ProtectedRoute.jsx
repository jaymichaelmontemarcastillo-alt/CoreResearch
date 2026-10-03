import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoPreloader } from './ui/LogoPreloader';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { currentUser, role, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LogoPreloader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Pending or rejected accounts are prevented from accessing any protected routes
  if (userProfile?.role !== 'admin' && (userProfile?.status === 'pending' || userProfile?.status === 'rejected' || userProfile?.is_approved === false)) {
    return <Navigate to="/login?pending=1" replace />;
  }

  // Kung ang profile ay naka-flag for onboarding pero wala sila sa /onboarding page, redirect sila dun.
  if (userProfile?.needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  // Para di sila ma-stuck sa onboarding kung kumpleto na profile nila at gusto nilang pumunta sa /onboarding.
  if (!userProfile?.needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'adviser' || role === 'faculty') {
      return <Navigate to="/advisees" replace />;
    }
    if (role === 'student') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
