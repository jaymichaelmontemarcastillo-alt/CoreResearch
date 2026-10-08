// src/components/admin/analytics/StudentsByProgramChart.jsx
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
import { HiAcademicCap } from 'react-icons/hi2';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const specializations = item.specializations || [];

    return (
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#11121d] border border-gray-200 dark:border-[#2a2c42] shadow-2xl text-xs space-y-2.5 min-w-[220px] pointer-events-none transition-all">
        {/* Header: Program & Total */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-[#24263b] pb-2">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-extrabold tracking-tight text-gray-900 dark:text-white">
              {item.courseCode}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50">
            {item.studentCount} Students
          </span>
        </div>

        {/* Program Full Title */}
        <div className="text-gray-600 dark:text-gray-300 text-[11px] font-medium leading-snug">
          {item.courseName}
        </div>

        {/* Specialization Breakdown Section */}
        {specializations.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-[#24263b] space-y-1.5">
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Specialization Breakdown</span>
              <span>Count</span>
            </div>
            <div className="space-y-1 pt-0.5">
              {specializations.map((spec) => (
                <div
                  key={spec.code}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c2b] border border-gray-200/60 dark:border-[#2a2c42] text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-gray-900 dark:text-white truncate">
                      {spec.code}
                    </span>
                    {spec.name && spec.name !== spec.code && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-300 truncate hidden sm:inline">
                        • {spec.name}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-gray-900 dark:text-white shrink-0 tabular-nums text-xs">
                    {spec.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share & Proportion */}
        <div className="pt-1.5 border-t border-gray-100 dark:border-[#24263b] flex justify-between items-center text-[11px] text-gray-600 dark:text-gray-300">
          <span className="font-medium">Program Share:</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400">{item.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const StudentsByProgramChart = ({ data = [], loading = false }) => {
  // Strictly filter to only undergraduate programs (BSIT & BSCS), completely excluding unassigned
  const filteredData = (data || []).filter(
    (item) => item.courseCode === 'BSIT' || item.courseCode === 'BSCS'
  );

  const totalStudents = filteredData.reduce((acc, item) => acc + item.studentCount, 0);
  const isEmpty = !loading && (!filteredData || filteredData.length === 0 || totalStudents === 0);

  return (
    <ChartCard
      title="Students by Program"
      subtitle="Registered undergraduate student researchers in BSIT and BSCS degree programs"
      loading={loading}
      isEmpty={isEmpty}
      emptyMessage="No student enrollment records found"
      badge={
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
          {totalStudents} Enrolled Students
        </span>
      }
    >
      <div className="w-full h-[260px] pt-1">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <BarChart
            data={filteredData}
            margin={{ top: 15, right: 25, left: -15, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#f3f4f6"
              className="dark:stroke-[#222433]"
              vertical={false}
            />
            <XAxis
              dataKey="courseCode"
              tick={{ fontSize: 12, fontWeight: 600, fill: '#6b7280' }}
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
            <Bar
              dataKey="studentCount"
              name="Students"
              radius={[6, 6, 0, 0]}
              barSize={44}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

export default StudentsByProgramChart;
