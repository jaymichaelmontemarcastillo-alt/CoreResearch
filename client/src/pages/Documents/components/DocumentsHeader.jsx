// src/pages/Documents/components/DocumentsHeader.jsx
import React from 'react';
import { DocumentSearch } from './DocumentSearch';

export const DocumentsHeader = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-8 py-3 sticky top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Document Icon & Clean Documents Heading */}
        <div className="flex items-center gap-3 shrink-0 min-w-[140px]">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-none">
            Documents
          </h1>
        </div>

        {/* Center: Centered Clean Search Bar */}
        <div className="flex-1 max-w-2xl mx-auto flex justify-center">
          <DocumentSearch
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search documents by name, group, or content..."
          />
        </div>

        {/* Right: Balanced Spacer for Symmetrical Alignment */}
        <div className="hidden md:block min-w-[140px]" />
      </div>
    </header>
  );
};
