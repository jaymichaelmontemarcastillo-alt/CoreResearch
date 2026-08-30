// src/components/ui/DataTable.jsx
import React from "react";

export const DataTable = ({ columns, children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-[#111218] border-b border-gray-200 dark:border-[#222433]">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`py-3.5 px-4 text-[13px] font-semibold text-gray-500 dark:text-[#9396a8] whitespace-nowrap ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#222433]">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TableRow = ({ children, className = "", ...props }) => (
  <tr
    className={`hover:bg-gray-50 dark:hover:bg-[#1c1d28]/70 transition ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, className = "", ...props }) => (
  <td className={`py-3.5 px-4 text-[13px] text-gray-700 dark:text-[#f3f4f8] ${className}`} {...props}>
    {children}
  </td>
);
