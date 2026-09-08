// src/components/admin/analytics/ChartCard.jsx
import React from 'react';
import { Card } from '../../ui/Card';

export const ChartCard = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data available yet.',
  children,
  headerAction,
  className = '',
}) => {
  return (
    <Card className={`p-5 sm:p-6 flex flex-col justify-between transition-all ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-[#222433]">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight truncate">
              {title}
            </h3>
            {badge && <span>{badge}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Body Content */}
      <div className="flex-1 w-full min-h-[260px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 text-gray-400 py-12">
            <div className="w-7 h-7 border-2 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500 dark:text-[#9396a8]">Loading data...</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1c1d28] border border-gray-200/60 dark:border-[#222433] flex items-center justify-center text-gray-400 dark:text-[#6b6f84] mb-1">
              {Icon ? <Icon className="w-6 h-6 opacity-60" /> : <span className="text-lg">∅</span>}
            </div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {emptyMessage}
            </h4>
            <p className="text-xs text-gray-400 dark:text-[#6b6f84] max-w-xs">
              Records will appear automatically once new data is recorded for this filter selection.
            </p>
          </div>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </Card>
  );
};

export default ChartCard;
