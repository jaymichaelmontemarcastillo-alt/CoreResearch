// src/components/ui/StatCard.jsx
import React from "react";

export const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendType = "positive",
  color = "blue",
  valueColor,
  className = "",
  showIcon = false,
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#15161e] rounded-xl border border-gray-200/90 dark:border-[#222433] p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:border-gray-300 dark:hover:border-[#333649] ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] sm:text-xs font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider truncate">
          {label}
        </span>
        {showIcon && Icon && (
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className={`text-lg sm:text-xl font-bold tracking-tight ${valueColor || "text-gray-900 dark:text-white"}`}>
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          {trend && (
            <span
              className={`font-semibold flex items-center gap-0.5 ${
                trendType === "positive"
                  ? "text-emerald-500 dark:text-emerald-400"
                  : trendType === "negative"
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-blue-500 dark:text-blue-400"
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-gray-400 dark:text-[#6b6f84] truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
