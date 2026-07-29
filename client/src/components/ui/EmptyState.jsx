// src/components/ui/EmptyState.jsx
import React from "react";

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`py-12 flex flex-col items-center justify-center text-center space-y-3 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
