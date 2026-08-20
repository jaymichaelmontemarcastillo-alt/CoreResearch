// src/pages/Documents/components/DocumentSearch.jsx
import React from 'react';
import { Search, X } from 'lucide-react';

export const DocumentSearch = ({ value, onChange, placeholder = 'Search documents...' }) => {
  return (
    <div className="relative w-full max-w-xl">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-2 bg-[#f1f3f4] dark:bg-slate-800 hover:bg-[#eaecee] dark:hover:bg-slate-700/80 focus:bg-white dark:focus:bg-slate-900 border border-transparent rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:outline-none focus:ring-0 focus:border-transparent transition-all shadow-xs focus:shadow-md"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
