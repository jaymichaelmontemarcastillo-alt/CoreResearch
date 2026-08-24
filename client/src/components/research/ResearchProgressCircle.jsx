// src/components/research/ResearchProgressCircle.jsx
import React from 'react';

export const ResearchProgressCircle = ({
  progress = 0,
  size = 120,
  strokeWidth = 10,
  completedTasks = 0,
  totalTasks = 0,
  subtitle = 'Overall Progress',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const strokeDashoffset = circumference - (validProgress / 100) * circumference;

  // Determine stroke color based on progress tier
  let progressColor = 'text-blue-500';
  if (validProgress >= 80) progressColor = 'text-emerald-500';
  else if (validProgress >= 40) progressColor = 'text-indigo-500';
  else if (validProgress >= 20) progressColor = 'text-amber-500';

  return (
    <div className="flex flex-col items-center justify-center text-center p-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background Track */}
          <circle
            className="text-gray-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Indicator */}
          <circle
            className={`${progressColor} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {validProgress}%
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Done
          </span>
        </div>
      </div>

      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-2">
        {subtitle}
      </p>

      {totalTasks > 0 && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          {completedTasks} of {totalTasks} tasks completed
        </p>
      )}
    </div>
  );
};

export default ResearchProgressCircle;
