// src/components/admin/analytics/ResearchStatusDistributionChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';
import { HiChartPie } from 'react-icons/hi2';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] shadow-lg text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-bold text-gray-900 dark:text-white">{data.name}</span>
        </div>
        <div className="text-gray-600 dark:text-[#9396a8] flex justify-between gap-4">
          <span>Count:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.value} projects</span>
        </div>
        <div className="text-gray-600 dark:text-[#9396a8] flex justify-between gap-4">
          <span>Share:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{data.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ResearchStatusDistributionChart = ({ data = [], loading = false }) => {
  const totalCount = data.reduce((acc, item) => acc + item.value, 0);
  const isEmpty = !loading && (!data || data.length === 0 || totalCount === 0);

  return (
    <ChartCard
      title="Research Status Distribution"
      subtitle="Lifecycle distribution of active and submitted research projects"
      icon={HiChartPie}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No research project data available"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full h-full py-2">
        {/* Donut Chart */}
        <div className="w-full md:w-1/2 h-[220px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%" debounce={200}>
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Central Total Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {totalCount}
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-[#6b6f84]">
              Projects
            </span>
          </div>
        </div>

        {/* Interactive Legend List */}
        <div className="w-full md:w-1/2 space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1c1d28] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {item.value}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-[#6b6f84] w-8 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
};

export default ResearchStatusDistributionChart;
