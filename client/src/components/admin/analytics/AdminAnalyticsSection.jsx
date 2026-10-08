// src/components/admin/analytics/AdminAnalyticsSection.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import adminAnalyticsService from '../../../services/adminAnalytics.service';
import { AdminSummaryCards } from './AdminSummaryCards';
import { AdminAnalyticsFilters } from './AdminAnalyticsFilters';
import { ResearchStatusDistributionChart } from './ResearchStatusDistributionChart';
import { ResearchTopicsTrendChart } from './ResearchTopicsTrendChart';
import { AdviserWorkloadChart } from './AdviserWorkloadChart';
import { StudentsByProgramChart } from './StudentsByProgramChart';
import { ResearchCompletionRateChart } from './ResearchCompletionRateChart';
import { RecentActivityWidget } from '../../dashboard/activity/RecentActivityWidget';
export const AdminAnalyticsSection = () => {
  const [processed, setProcessed] = useState({
    summary: { totalStudents: 0, activeProjects: 0, pendingReviews: 0, completedProjects: 0 },
    statusDistribution: [],
    progressTrend: [],
    adviserWorkload: [],
    studentsByProgram: [],
    proposalOverview: [],
    completionRate: [],
    availableAcademicYears: [],
    availableSemesters: [],
    availablePrograms: []
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    academicYear: 'all',
    semester: 'all',
    program: 'all',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAnalyticsService.fetchAnalyticsData(filters);
      setProcessed(data);
    } catch (err) {
      console.error('[AdminAnalyticsSection] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.academicYear && filters.academicYear !== 'all') count++;
    if (filters.semester && filters.semester !== 'all') count++;
    if (filters.program && filters.program !== 'all') count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      academicYear: 'all',
      semester: 'all',
      program: 'all',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Summary Statistic Cards */}
      <AdminSummaryCards summary={processed.summary} loading={loading} />

      {/* 2. Global Institutional Filters */}
      <AdminAnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        availableAcademicYears={processed.availableAcademicYears}
        availableSemesters={processed.availableSemesters}
        availablePrograms={processed.availablePrograms}
        totalActiveFilters={activeFiltersCount}
      />

      {/* 3. Analytics Section - Row 1: Topics Trend and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          <ResearchTopicsTrendChart
            data={processed.topicalTrends}
            loading={loading}
          />
        </div>
        <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-6 h-full lg:col-span-1">
          <RecentActivityWidget />
        </div>
      </div>

      {/* 4. Analytics Section - Row 2: Students by Program & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <StudentsByProgramChart
          data={processed.studentsByProgram}
          loading={loading}
        />
        <ResearchStatusDistributionChart
          data={processed.statusDistribution}
          loading={loading}
        />
      </div>

      {/* 5. Analytics Section - Row 3: Completion Rate & Adviser Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <ResearchCompletionRateChart
          data={processed.completionRate}
          loading={loading}
        />
        <AdviserWorkloadChart
          data={processed.adviserWorkload}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AdminAnalyticsSection;
