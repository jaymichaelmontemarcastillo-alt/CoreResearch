// src/components/admin/analytics/ResearchProgressTrendChart.jsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { HiArrowTrendingUp } from 'react-icons/hi2';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] shadow-lg text-xs space-y-1.5 min-w-[150px]">
        <div className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#222433] pb-1">
          {label}
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 dark:text-[#9396a8]">{entry.name}:</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ResearchProgressTrendChart = ({ data = [], loading = false }) => {
  const isEmpty = !loading && (!data || data.length === 0);

  return (
    <ChartCard
      title="Research Progress Trend"
      subtitle="Monthly research activities, approved titles, and completed milestones"
      icon={HiArrowTrendingUp}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No historical timeline data available"
    >
      <div className="w-full h-[260px] pt-2">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-[#222433]"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="progressing"
              name="In Progress"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="approved"
              name="Approved"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#10b981' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#8b5cf6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

export default ResearchProgressTrendChart;
