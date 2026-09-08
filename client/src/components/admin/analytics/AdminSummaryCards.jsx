// src/components/admin/analytics/AdminSummaryCards.jsx
import React from 'react';
import { StatCard } from '../../ui/StatCard';
import { HiUsers, HiFolder, HiClock, HiCheckBadge } from 'react-icons/hi2';

export const AdminSummaryCards = ({
  summary = {
    totalStudents: 0,
    activeProjects: 0,
    pendingReviews: 0,
    completedProjects: 0,
  },
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      <StatCard
        icon={HiUsers}
        showIcon
        label="Total Registered Students"
        value={loading ? '...' : summary.totalStudents.toLocaleString()}
        trend="Active Student Accounts"
        trendType="positive"
        subtitle="Across all departments"
      />
      <StatCard
        icon={HiFolder}
        showIcon
        label="Total Active Research Projects"
        value={loading ? '...' : summary.activeProjects.toLocaleString()}
        trend="In Progress & Milestones"
        trendType="neutral"
        valueColor="text-blue-600 dark:text-blue-400"
        subtitle="Workspaces & Drafts"
      />
      <StatCard
        icon={HiClock}
        showIcon
        label="Pending Reviews"
        value={loading ? '...' : summary.pendingReviews.toLocaleString()}
        trend={summary.pendingReviews > 0 ? 'Requires Attention' : 'Queue Clear'}
        trendType={summary.pendingReviews > 0 ? 'neutral' : 'positive'}
        valueColor={summary.pendingReviews > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-900 dark:text-white'}
        subtitle="Proposals & Manuscripts"
      />
      <StatCard
        icon={HiCheckBadge}
        showIcon
        label="Completed Research Projects"
        value={loading ? '...' : summary.completedProjects.toLocaleString()}
        trend="Archived & Defended"
        trendType="positive"
        valueColor="text-emerald-500 dark:text-emerald-400"
        subtitle="Institutional Repository"
      />
    </div>
  );
};

export default AdminSummaryCards;
