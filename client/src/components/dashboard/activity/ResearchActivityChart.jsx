import React, { useState } from 'react';

export const ResearchActivityChart = ({ 
  dailyActivity = [], 
  loading = false 
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Compute total actions over the 7-day period
  const total7DayActions = dailyActivity.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count || 0), 1);

  if (!loading && total7DayActions <= 1) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              Research Activity
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
              Last 7 days
            </p>
          </div>
          {total7DayActions > 0 && (
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg shrink-0">
              {total7DayActions} events
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading data...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end">
          {/* Chart area */}
          <div className="h-36 w-full flex items-end justify-between gap-2 relative">
            {/* Subtle horizontal grid */}
            <div className="absolute inset-x-0 bottom-0 border-b border-gray-100 dark:border-[#222433]/50 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-1/2 border-b border-dashed border-gray-100 dark:border-[#222433]/30 pointer-events-none" />

            {dailyActivity.map((day, idx) => {
              const heightPercent = Math.round(((day.count || 0) / maxDailyCount) * 100);
              const isHovered = hoveredDay?.date === day.date;
              const isToday = idx === dailyActivity.length - 1;

              return (
                <div
                  key={day.date || idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative z-10 cursor-pointer"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-8 px-2.5 py-1 rounded-md bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs font-semibold whitespace-nowrap shadow-md pointer-events-none z-30">
                      {day.count} {day.count === 1 ? 'action' : 'actions'}
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-full max-w-[28px] bg-gray-50 dark:bg-[#1c1d28] rounded-t overflow-hidden flex items-end h-full">
                    <div
                      style={{ height: `${Math.max(heightPercent, day.count > 0 ? 8 : 0)}%` }}
                      className={`w-full rounded-t transition-all duration-300 ease-out ${
                        day.count === 0
                          ? 'bg-gray-100 dark:bg-[#222433]/40'
                          : isToday
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : isHovered
                          ? 'bg-blue-500 dark:bg-blue-400'
                          : 'bg-blue-400/70 dark:bg-blue-600/60'
                      }`}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[11px] font-medium mt-2 leading-none transition ${
                    isToday 
                      ? 'text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-[#222433]/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              Research events
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-[#222433]/40" />
              No activity
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchActivityChart;
