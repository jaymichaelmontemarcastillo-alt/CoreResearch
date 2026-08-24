// src/pages/Documents/components/DocumentTabs.jsx
import React from 'react';
import { HiStar, HiClock } from 'react-icons/hi2';

export const DocumentTabs = ({
  activeTab = 'recent',
  onTabChange,
  recentCount = 0,
  favoritesCount = 0,
}) => {
  return (
    <div className="flex items-center gap-6 border-b border-gray-200 dark:border-slate-800 mb-4 select-none">
      {/* Recent Tab */}
      <button
        type="button"
        onClick={() => onTabChange('recent')}
        className={`pb-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
          activeTab === 'recent'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
      >
        <HiClock className="w-4 h-4" />
        <span>Recent</span>
        {recentCount > 0 && (
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 ml-1">
            {recentCount}
          </span>
        )}
        {/* Subtle Blue Indicator */}
        {activeTab === 'recent' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
        )}
      </button>

      {/* Favorites Tab */}
      <button
        type="button"
        onClick={() => onTabChange('favorites')}
        className={`pb-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
          activeTab === 'favorites'
            ? 'text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        }`}
      >
        <HiStar className="w-4 h-4" />
        <span>Favorites</span>
        {favoritesCount > 0 && (
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-medium ml-1">
            {favoritesCount}
          </span>
        )}
        {/* Subtle Blue Indicator */}
        {activeTab === 'favorites' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
        )}
      </button>
    </div>
  );
};
