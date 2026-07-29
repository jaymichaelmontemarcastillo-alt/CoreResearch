// src/components/ui/Textarea.jsx
import React from "react";

export const Textarea = ({
  label,
  error,
  helperText,
  className = "",
  id,
  rows = 4,
  ...props
}) => {
  const textareaId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary 
                   transition-all duration-200 rounded-lg text-sm py-2.5 px-3.5 resize-y ${
                     error
                       ? "border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                       : ""
                   } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helperText}</p>
      )}
    </div>
  );
};
