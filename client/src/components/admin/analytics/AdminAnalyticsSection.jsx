// src/components/admin/analytics/AdminAnalyticsSection.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import adminAnalyticsService from '../../../services/adminAnalytics.service';
import { AdminSummaryCards } from './AdminSummaryCards';
import { AdminAnalyticsFilters } from './AdminAnalyticsFilters';
import { ResearchStatusDistributionChart } from './ResearchStatusDistributionChart';
import { ResearchProgressTrendChart } from './ResearchProgressTrendChart';
import { AdviserWorkloadChart } from './AdviserWorkloadChart';
import { StudentsByProgramChart } from './StudentsByProgramChart';
import { ProposalStatusOverviewChart } from './ProposalStatusOverviewChart';
import { ResearchCompletionRateChart } from './ResearchCompletionRateChart';

export const AdminAnalyticsSection = () => {
  const [rawData, setRawData] = useState({
    users: [],
    proposals: [],
    workspaces: [],
    groups: [],
    courses: [],
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
      const data = await adminAnalyticsService.fetchRawData();
      setRawData(data);
    } catch (err) {
      console.error('[AdminAnalyticsSection] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Process data in-memory dynamically when rawData or filters change
  const processed = useMemo(() => {
    return adminAnalyticsService.processAnalytics(rawData, filters);
  }, [rawData, filters]);

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

      {/* 3. Analytics Section - Row 1: Status Distribution & Progress Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <ResearchStatusDistributionChart
          data={processed.statusDistribution}
          loading={loading}
        />
        <ResearchProgressTrendChart
          data={processed.progressTrend}
          loading={loading}
        />
      </div>

      {/* 4. Analytics Section - Row 2: Adviser Workload & Students by Program */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <AdviserWorkloadChart
          data={processed.adviserWorkload}
          loading={loading}
        />
        <StudentsByProgramChart
          data={processed.studentsByProgram}
          loading={loading}
        />
      </div>

      {/* 5. Analytics Section - Row 3: Proposal Status Overview & Completion Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <ProposalStatusOverviewChart
          data={processed.proposalOverview}
          loading={loading}
        />
        <ResearchCompletionRateChart
          data={processed.completionRate}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AdminAnalyticsSection;
