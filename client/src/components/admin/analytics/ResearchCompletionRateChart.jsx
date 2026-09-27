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
              stroke="#34d399"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Central Rate Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {rate}%
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-[#6b6f84] tracking-wide mt-0.5">
              Completion Rate
            </span>
          </div>
        </div>

        {/* Breakdown Statistics */}
        <div className="flex-1 w-full max-w-xs space-y-4">
          <div>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8]">
              Completion Metric
            </p>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-white mt-0.5">
              {completedCount} out of {totalProjects} Projects Completed
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-[#9396a8]">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>In Progress</span>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                {inProgressCount}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-[#9396a8]">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Under Review</span>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
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
