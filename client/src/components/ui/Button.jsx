// src/components/ui/Button.jsx
import React from "react";

const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md transition-all",
  secondary:
    "bg-gray-100 dark:bg-[#1c1d28] text-gray-700 dark:text-[#f3f4f8] hover:bg-gray-200 dark:hover:bg-[#252738] border border-transparent dark:border-[#222433] transition-all",
  outline:
    "bg-transparent border border-gray-300 dark:border-[#222433] text-gray-700 dark:text-[#f3f4f8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:border-gray-400 dark:hover:border-[#333649] transition-all",
  ghost:
    "bg-transparent text-gray-600 dark:text-[#9396a8] hover:bg-gray-100 dark:hover:bg-[#1c1d28] dark:hover:text-white transition-all",
  danger: "bg-red-500 text-white hover:bg-red-600 transition-all",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 transition-all",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl font-semibold",
};

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled = false,
  fullWidth = false,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
