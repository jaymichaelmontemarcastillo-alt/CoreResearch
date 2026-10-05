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
  const getIconColor = () => {
    if (trendType === "positive") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
    if (trendType === "negative") return "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    if (trendType === "neutral" && valueColor?.includes("amber")) return "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
  };

  return (
    <div
      className={`bg-white dark:bg-[#15161e] rounded-2xl sm:rounded-[20px] border border-gray-100 dark:border-[#222433] p-3 sm:p-5 lg:p-6 flex flex-col transition-all duration-200 hover:shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4">
        {showIcon && Icon && (
          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${getIconColor()}`}>
            <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        )}
        <span className="text-[11px] sm:text-[13px] font-semibold text-gray-500 dark:text-[#9396a8] leading-tight line-clamp-2">
          {label}
        </span>
      </div>

      <div className="mt-auto">
        <div className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${valueColor || "text-gray-900 dark:text-white"}`}>
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-xs leading-tight">
            {trend && (
              <span
                className={`font-semibold sm:font-medium truncate ${
                  trendType === "positive"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : trendType === "negative"
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {trend}
              </span>
            )}
            {subtitle && (
              <span className="text-gray-600 dark:text-[#8387a1] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
