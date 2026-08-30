// src/components/ui/Input.jsx
import React from "react";

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = "",
  id,
  ...props
}) => {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] 
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500
                     transition-all duration-200 rounded-lg text-sm py-2.5 px-3.5 ${Icon ? "pl-10" : ""} ${
                       error
                         ? "border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                         : ""
                     } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1">{helperText}</p>
      )}
    </div>
  );
};
