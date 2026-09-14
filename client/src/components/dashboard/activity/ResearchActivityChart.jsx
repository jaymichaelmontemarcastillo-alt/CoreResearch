// src/components/dashboard/activity/ResearchActivityChart.jsx
import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { 
  HiChartBar, 
  HiArrowTrendingUp, 
  HiClock,
  HiCheckCircle 
} from 'react-icons/hi2';

export const ResearchActivityChart = ({ 
  dailyActivity = [], 
  loading = false 
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Compute total actions over the 7-day period
  const total7DayActions = dailyActivity.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const maxDailyCount = Math.max(...dailyActivity.map((d) => d.count || 0), 1);

  return (
    <Card padding={false} className="p-4 sm:p-5 flex flex-col justify-between h-full border border-gray-200/90 dark:border-[#222433] bg-white dark:bg-[#15161e] shadow-xs space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-[#222433] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <HiChartBar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
              Recent Research Activity
            </h3>
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9396a8]">
              Daily Manuscript Edits, Task Completions &amp; Revisions (Last 7 Days)
            </p>
          </div>
        </div>

        {total7DayActions > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Total 7-Day Actions:
            </span>
            <Badge variant="blue" size="sm" className="font-semibold text-[10px] py-0.5 px-2">
              {total7DayActions} events
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
          <span className="text-xs">Calculating 7-day research telemetry...</span>
        </div>
      ) : total7DayActions === 0 ? (
        /* Empty State */
        <div className="py-6 px-4 text-center flex flex-col items-center justify-center space-y-1.5">
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1c1d28] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-0.5">
            <HiChartBar className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            No recent research activity
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-[#9396a8] max-w-sm leading-relaxed">
            Your group has not recorded manuscript edits or completed tasks in the last 7 days. As you collaborate in ONLYOFFICE and update tasks, telemetry will chart here.
          </p>
        </div>
      ) : (
        /* 7-Day Bar Chart */
        <div className="space-y-2 pt-1">
          <div className="h-28 sm:h-32 w-full flex items-end justify-between gap-1.5 sm:gap-4 px-2 sm:px-6 pt-3 pb-1 relative">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-x-0 top-0 border-b border-gray-100 dark:border-[#222433]/60 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 border-b border-gray-100 dark:border-[#222433]/40 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 border-b border-gray-200 dark:border-[#222433] pointer-events-none" />

            {/* Bars */}
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
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-8 px-2 py-0.5 rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-semibold whitespace-nowrap shadow-md pointer-events-none animate-fade-in z-30">
                      {day.count} {day.count === 1 ? 'action' : 'actions'} ({day.fullDate || day.day})
                    </div>
                  )}

                  {/* Value on top of bar if count > 0 */}
                  <span className={`text-[10px] font-mono font-bold mb-0.5 transition ${
                    isHovered 
                      ? 'text-indigo-600 dark:text-indigo-400 scale-110' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {day.count > 0 ? day.count : ''}
                  </span>

                  {/* Bar Body */}
                  <div className="w-full max-w-[16px] sm:max-w-[20px] bg-gray-100/60 dark:bg-[#1f212e]/50 rounded-t-md overflow-hidden flex items-end h-full">
                    <div
                      style={{ height: `${Math.max(heightPercent, day.count > 0 ? 10 : 0)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ease-out ${
                        day.count === 0
                          ? 'bg-transparent'
                          : isToday
                          ? 'bg-gradient-to-t from-indigo-600 to-blue-500 shadow-xs'
                          : isHovered
                          ? 'bg-gradient-to-t from-blue-600 to-indigo-400'
                          : 'bg-gradient-to-t from-blue-500/80 to-indigo-500/70 hover:from-blue-600 hover:to-indigo-500'
                      }`}
                    />
                  </div>

                  {/* Day Label (Mon, Tue, etc.) */}
                  <div className="mt-1.5 text-center">
                    <span className={`text-[11px] font-semibold block leading-tight transition ${
                      isToday 
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                        : isHovered 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {day.day}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 block leading-none">
                      {day.shortDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer legend */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#222433] flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-gradient-to-t from-indigo-600 to-blue-500" />
                Active Research Events
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-gray-200 dark:bg-slate-700" />
                No Activity
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Telemetry updated live from manuscript &amp; workspace logs</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ResearchActivityChart;
