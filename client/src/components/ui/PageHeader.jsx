// src/components/ui/PageHeader.jsx
import React from "react";

export const PageHeader = ({
  icon: Icon,
  title,
  description,
  actions,
  className = "",
}) => {
  if (!actions) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-end gap-4 ${className}`}>
      {actions && <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>}
    </div>
  );
};
