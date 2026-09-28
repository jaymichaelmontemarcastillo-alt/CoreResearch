// src/pages/Documents/DocumentsPage.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Documents gallery route is deprecated and disabled in favor of Research Workspace.
 * Directs all navigation back to the Dashboard.
 */
export const DocumentsPage = () => {
  return <Navigate to="/dashboard" replace />;
};

export default DocumentsPage;
