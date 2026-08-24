// src/components/ui/StatCard.jsx
import React from "react";

const colorMap = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

export const StatCard = ({
  icon: Icon,
  label,
  value,
  color = "blue",
  valueColor,
  className = "",
}) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-card p-4 flex items-center gap-3 ${className}`}>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className={`text-base font-semibold truncate ${valueColor || "text-gray-900 dark:text-white"}`}>
          {value}
        </div>
      </div>
    </div>
  );
};
