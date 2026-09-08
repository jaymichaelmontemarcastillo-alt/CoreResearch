// src/components/admin/analytics/AdviserWorkloadChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { HiUserGroup } from 'react-icons/hi2';
import { RECOMMENDED_ADVISER_LIMIT } from '../../../services/adminAnalytics.service';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] shadow-lg text-xs space-y-1.5 min-w-[180px]">
        <div className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
          <span>{item.adviserName}</span>
          {item.exceedsLimit && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-semibold">
              Limit Exceeded
            </span>
          )}
        </div>
        {item.department && (
          <div className="text-gray-400 dark:text-[#6b6f84] text-[11px]">
            {item.department}
          </div>
        )}
        <div className="pt-1 border-t border-gray-100 dark:border-[#222433] space-y-1 text-gray-600 dark:text-[#9396a8]">
          <div className="flex justify-between">
            <span>Assigned Projects / Groups:</span>
            <span className="font-bold text-gray-900 dark:text-white">{item.assignedProjects}</span>
          </div>
          {item.studentCount > 0 && (
            <div className="flex justify-between">
              <span>Advised Students:</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{item.studentCount} students</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const AdviserWorkloadChart = ({ data = [], loading = false }) => {
  // Only display advisers that have at least 1 assignment or limit to top 10 for readability
  const activeAdvisers = data.filter((a) => a.assignedProjects > 0 || a.assignedGroups > 0);
  const displayData = activeAdvisers.length > 0 ? activeAdvisers.slice(0, 8) : data.slice(0, 5);
  const isEmpty = !loading && (!displayData || displayData.length === 0);

  return (
    <ChartCard
      title="Adviser Workload Distribution"
      subtitle="Active research groups and projects mentored per faculty adviser"
      icon={HiUserGroup}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No adviser mentorship assignments found"
      badge={
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-[#1c1d28] dark:text-[#9396a8]">
          Max Capacity: {RECOMMENDED_ADVISER_LIMIT}
        </span>
      }
    >
      <div className="w-full h-[260px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-[#222433]"
              horizontal={false}
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="adviserName"
              width={110}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={RECOMMENDED_ADVISER_LIMIT}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: 'Limit',
                position: 'top',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="assignedProjects" name="Assigned Projects" radius={[0, 6, 6, 0]}>
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.exceedsLimit ? '#f43f5e' : '#3b82f6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

export default AdviserWorkloadChart;
