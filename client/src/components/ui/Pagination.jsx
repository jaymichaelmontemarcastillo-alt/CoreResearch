// src/components/ui/Pagination.jsx
import React from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

export const Pagination = ({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
  className = "",
}) => {
  if (total === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-4 bg-white dark:bg-[#15161e] border-t border-gray-100 dark:border-[#222433] rounded-b-xl text-xs ${className}`}
    >
      {/* Left side: Results Count & Rows Per Page */}
      <div className="flex items-center gap-3 text-gray-500 dark:text-[#9396a8]">
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#2b2d3f] rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
        <span>
          Showing <strong className="text-gray-800 dark:text-gray-200">{startItem}</strong> to{" "}
          <strong className="text-gray-800 dark:text-gray-200">{endItem}</strong> of{" "}
          <strong className="text-gray-800 dark:text-gray-200">{total}</strong> users
        </span>
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#2b2d3f] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c1d28] disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-xs"
          title="Previous Page"
        >
          <HiChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 dark:text-gray-500 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[30px] h-[30px] flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                  page === p
                    ? "bg-primary text-white shadow-sm"
                    : "border border-gray-200 dark:border-[#2b2d3f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c1d28]"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#2b2d3f] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c1d28] disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-xs"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <HiChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
