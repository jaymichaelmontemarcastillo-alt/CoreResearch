// src/components/ui/Divider.jsx
import React from "react";

export const Divider = ({ className = "", text, ...props }) => {
  if (text) {
    return (
      <div
        className={`relative flex items-center py-2 ${className}`}
        {...props}
      >
        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
        <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
          {text}
        </span>
        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
      </div>
    );
  }

  return <hr className={`border-gray-200 dark:border-slate-700 ${className}`} {...props} />;
};
