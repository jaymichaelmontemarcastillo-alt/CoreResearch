// src/pages/Documents/components/DocumentViewToggle.jsx
import React from 'react';
import { HiSquares2X2, HiListBullet } from 'react-icons/hi2';
import { VIEW_MODES } from '../constants/documentConstants';

export const DocumentViewToggle = ({ viewMode, onChange }) => {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-md border border-gray-200 dark:border-slate-700 select-none">
      <button
        type="button"
        onClick={() => onChange(VIEW_MODES.GRID)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
          viewMode === VIEW_MODES.GRID
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
        title="Card view"
        aria-label="Card view"
      >
        <HiSquares2X2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Card</span>
      </button>

      <button
        type="button"
        onClick={() => onChange(VIEW_MODES.LIST)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
          viewMode === VIEW_MODES.LIST
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
        title="List view"
        aria-label="List view"
      >
        <HiListBullet className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
};
