// src/components/admin/analytics/ProposalStatusOverviewChart.jsx
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
} from 'recharts';
import { ChartCard } from './ChartCard';
import { HiDocumentText } from 'react-icons/hi2';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] shadow-lg text-xs space-y-1.5 min-w-[160px]">
        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
        <div className="pt-1 border-t border-gray-100 dark:border-[#222433] space-y-1 text-gray-600 dark:text-[#9396a8]">
          <div className="flex justify-between">
            <span>Total Proposals:</span>
            <span className="font-bold text-gray-900 dark:text-white">{item.count}</span>
          </div>
          <div className="flex justify-between">
            <span>Share:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{item.percentage}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const ProposalStatusOverviewChart = ({ data = [], loading = false }) => {
  const totalCount = data.reduce((acc, item) => acc + item.count, 0);
  const isEmpty = !loading && (!data || data.length === 0 || totalCount === 0);

  return (
    <ChartCard
      title="Proposal Status Overview"
      subtitle="Evaluation progress and outcomes of submitted research title proposals"
      icon={HiDocumentText}
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No title proposals submitted yet"
      badge={
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-[#1c1d28] dark:text-[#9396a8]">
          {totalCount} Total
        </span>
      }
    >
      <div className="w-full h-[260px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-[#222433]"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
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
            <Bar dataKey="count" name="Proposals" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

export default ProposalStatusOverviewChart;
