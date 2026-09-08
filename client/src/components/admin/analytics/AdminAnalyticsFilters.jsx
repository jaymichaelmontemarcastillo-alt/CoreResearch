// src/components/admin/analytics/AdminAnalyticsFilters.jsx
import React from 'react';
import { HiFunnel, HiArrowPath } from 'react-icons/hi2';

export const AdminAnalyticsFilters = ({
  filters,
  onChange,
  onReset,
  availableAcademicYears = [],
  availableSemesters = [],
  availablePrograms = [],
  totalActiveFilters = 0,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] shadow-sm transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Filter Icon */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
            <HiFunnel className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Institutional Filters
              {totalActiveFilters > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-600 text-white">
                  {totalActiveFilters} active
                </span>
              )}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-[#9396a8]">
              Filter metrics, status distributions, and research trends dynamically.
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Academic Year */}
          <div className="flex-1 sm:flex-initial min-w-[150px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84] mb-1">
              Academic Year
            </label>
            <select
              value={filters.academicYear || 'all'}
              onChange={(e) => onChange({ ...filters, academicYear: e.target.value })}
              className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-[#333649] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
            >
              <option value="all">All Academic Years</option>
              {availableAcademicYears.map((ay) => (
                <option key={ay} value={ay}>
                  AY {ay}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div className="flex-1 sm:flex-initial min-w-[140px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84] mb-1">
              Semester
            </label>
            <select
              value={filters.semester || 'all'}
              onChange={(e) => onChange({ ...filters, semester: e.target.value })}
              className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-[#333649] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
            >
              <option value="all">All Semesters</option>
              {availableSemesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.label}
                </option>
              ))}
            </select>
          </div>

          {/* Program */}
          <div className="flex-1 sm:flex-initial min-w-[160px]">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84] mb-1">
              Program
            </label>
            <select
              value={filters.program || 'all'}
              onChange={(e) => onChange({ ...filters, program: e.target.value })}
              className="w-full h-9 px-3 rounded-xl text-xs font-medium bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-[#333649] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
            >
              <option value="all">All Programs</option>
              {availablePrograms.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.code || prog.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {totalActiveFilters > 0 && (
            <div className="self-end pt-1">
              <button
                type="button"
                onClick={onReset}
                className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 text-gray-600 hover:text-red-600 dark:text-[#9396a8] dark:hover:text-red-400 bg-gray-100 dark:bg-[#1c1d28] hover:bg-red-50 dark:hover:bg-red-950/20 border border-gray-200 dark:border-[#222433] transition-all"
                title="Reset all filters"
              >
                <HiArrowPath className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsFilters;
