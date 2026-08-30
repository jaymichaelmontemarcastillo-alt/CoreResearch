// src/components/ui/Select.jsx
import React from "react";
import { HiChevronDown } from "react-icons/hi2";

export const Select = ({
  label,
  error,
  icon: Icon,
  className = "",
  id,
  children,
  ...props
}) => {
  const selectId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
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
        <select
          id={selectId}
          className={`w-full bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8]
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500
                     transition-all duration-200 rounded-lg text-sm py-2.5 pr-10 appearance-none ${Icon ? "pl-10" : "pl-3.5"} ${
                       error
                         ? "border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                         : ""
                     } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-[#6b6f84]">
          <HiChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">{error}</p>
      )}
    </div>
  );
};
