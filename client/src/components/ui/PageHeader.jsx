// src/components/ui/PageHeader.jsx
import React from "react";

export const PageHeader = ({
  icon: Icon,
  title,
  description,
  actions,
  className = "",
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          {Icon && <Icon className="w-6 h-6 text-primary" />}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};
