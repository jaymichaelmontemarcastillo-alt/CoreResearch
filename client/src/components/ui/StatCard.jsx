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
      className={`bg-white dark:bg-[#15161e] rounded-[20px] border border-gray-100 dark:border-[#222433] p-6 flex flex-col transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-[#1c1d27] ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        {showIcon && Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconColor()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <span className="text-[13px] font-semibold text-gray-600 dark:text-[#a1a4b5]">
          {label}
        </span>
      </div>

      <div className="mt-auto">
        <div className={`text-3xl font-bold tracking-tight ${valueColor || "text-gray-900 dark:text-white"}`}>
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={`font-medium ${
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
