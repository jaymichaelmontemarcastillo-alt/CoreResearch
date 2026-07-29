// src/components/ui/Badge.jsx
import React from "react";

const badgeVariants = {
  blue: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  amber: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  rose: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  purple: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  slate: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/60",
};

export const Badge = ({ children, variant = "blue", className = "" }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        badgeVariants[variant] || badgeVariants.blue
      } ${className}`}
    >
      {children}
    </span>
  );
};
