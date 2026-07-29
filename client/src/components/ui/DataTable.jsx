// src/components/ui/DataTable.jsx
import React from "react";

export const DataTable = ({ columns, children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ children, className = "", ...props }) => (
  <tr
    className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 transition ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", ...props }) => (
  <td className={`py-3.5 px-4 text-gray-700 dark:text-gray-300 ${className}`} {...props}>
    {children}
  </td>
);
