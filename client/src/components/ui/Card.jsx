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
      className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-card ${padding ? "p-6" : ""} ${hover ? "card-hover cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
