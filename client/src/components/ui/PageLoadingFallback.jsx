// src/components/ui/PageLoadingFallback.jsx
// Suspense fallback for React.lazy code-split routes.
// Displays while the chunk for a lazy-loaded page is being downloaded.
import React from 'react';

export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-10 h-10 border-[3px] border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
      </div>
      <span className="text-sm font-medium text-gray-400 dark:text-gray-500 tracking-wide">
        Loading...
      </span>
    </div>
  </div>
);

export default PageLoadingFallback;
