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
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight">
              Research Activity
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-[#9396a8] mt-0.5">
              Last 7 days
            </p>
          </div>
          {total7DayActions > 0 && (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md shrink-0">
              {total7DayActions} events
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-xs">Loading data...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between min-h-[120px]">
          {/* Chart area — fills available vertical space without excess gap */}
          <div className="flex-1 w-full min-h-[96px] flex items-end justify-between gap-2.5 relative pt-2">
            {/* Subtle horizontal grid lines */}
            <div className="absolute inset-x-0 bottom-5 border-b border-gray-100 dark:border-[#222433]/50 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-[calc(50%+6px)] border-b border-dashed border-gray-100 dark:border-[#222433]/30 pointer-events-none" />

            {dailyActivity.map((day, idx) => {
              const rawRatio = (day.count || 0) / maxDailyCount;
              // Scale from 25% to 100% on active days so bars stand tall and use available space
              const heightPercent = day.count > 0 
                ? Math.round(25 + rawRatio * 75)
                : 0;

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
                    <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-semibold whitespace-nowrap shadow-md pointer-events-none z-30">
                      {day.count} {day.count === 1 ? 'event' : 'events'}
                    </div>
                  )}

                  {/* Bar Column Track */}
                  <div className="w-full max-w-[28px] bg-gray-50/70 dark:bg-[#1c1d28]/70 rounded-t overflow-hidden flex items-end h-[calc(100%-18px)]">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all duration-300 ease-out ${
                        day.count === 0
                          ? 'bg-transparent'
                          : isToday
                          ? 'bg-blue-600 dark:bg-blue-500 shadow-sm shadow-blue-500/20'
                          : isHovered
                          ? 'bg-blue-500 dark:bg-blue-400'
                          : 'bg-blue-500/80 dark:bg-blue-600/70'
                      }`}
                    />
                  </div>

                  {/* Day label */}
                  <span className={`text-[11px] font-medium mt-1 leading-none transition ${
                    isToday 
                      ? 'text-blue-600 dark:text-blue-400 font-bold' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 mt-2.5 pt-2 border-t border-gray-100 dark:border-[#222433]/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              Research events
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-gray-200 dark:bg-[#222433]" />
              No activity
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchActivityChart;
