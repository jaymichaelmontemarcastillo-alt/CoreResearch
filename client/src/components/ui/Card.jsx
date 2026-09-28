// src/components/ui/Card.jsx
import React from "react";

export const Card = ({
  children,
  className = "",
  hover = false,
  padding = true,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#15161e] rounded-[20px] border border-gray-100 dark:border-[#222433] ${padding ? "p-5 sm:p-6" : ""} ${hover ? "transition-all duration-200 hover:shadow-sm cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
