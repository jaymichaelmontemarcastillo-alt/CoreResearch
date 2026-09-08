// src/components/admin/analytics/ResearchCompletionRateChart.jsx
import React from 'react';
import { ChartCard } from './ChartCard';
import { HiCheckBadge } from 'react-icons/hi2';

export const ResearchCompletionRateChart = ({
  data = {
    rate: 0,
    completedCount: 0,
    totalProjects: 0,
    inProgressCount: 0,
    underReviewCount: 0,
  },
  loading = false,
}) => {
  const { rate, completedCount, totalProjects, inProgressCount, underReviewCount } = data;
  const isEmpty = !loading && totalProjects === 0;

  // SVG Gauge calculations
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <ChartCard
      title="Overall Research Completion Rate"
      subtitle="Institutional research success rate based on successfully completed manuscripts"
      icon={HiCheckBadge}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No research projects initiated yet"
    >
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 w-full h-full py-2">
        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-gray-100 dark:text-[#222433]"
            />
            {/* Animated Progress Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#completionGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Rate Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {rate}%
            </span>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-[#6b6f84] tracking-wider">
              Completion Rate
            </span>
          </div>
        </div>

        {/* Breakdown Statistics */}
        <div className="flex-1 w-full max-w-xs space-y-3">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433]">
            <p className="text-xs font-medium text-gray-500 dark:text-[#9396a8]">
              Completion Metric
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {completedCount} out of {totalProjects} Projects Completed
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e]">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>In Progress</span>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                {inProgressCount}
              </p>
            </div>

            <div className="p-2.5 rounded-lg border border-gray-100 dark:border-[#222433] bg-white dark:bg-[#15161e]">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Under Review</span>
              </div>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                {underReviewCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
};

export default ResearchCompletionRateChart;
