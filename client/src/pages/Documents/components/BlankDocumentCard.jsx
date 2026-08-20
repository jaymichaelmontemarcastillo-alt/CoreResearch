// src/pages/Documents/components/BlankDocumentCard.jsx
import React from 'react';
import { Plus, FileText } from 'lucide-react';

export const BlankDocumentCard = ({ onClick, disabled = false }) => {
  return (
    <div className="flex flex-col items-start w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="cr-blank-template-card cr-doc-card-radius group relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-2xs hover:shadow-md transition-all duration-200"
        title="Create a new blank manuscript document"
      >
        {/* CoreResearch Minimalist Blank Document Symbol */}
        <div className="flex flex-col items-center justify-center p-3 text-center transition-transform duration-200 group-hover:scale-105">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 border border-blue-100 dark:border-blue-900/60 shadow-2xs">
            <div className="relative flex items-center justify-center">
              <FileText className="w-6 h-6 stroke-[1.75]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 tracking-tight">
            Blank Document
          </span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
            New manuscript
          </span>
        </div>

        {/* Faint document watermark corner decoration */}
        <div className="absolute top-2.5 right-2.5 opacity-20 pointer-events-none">
          <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-blue-500" />
        </div>
      </button>

      {/* Label underneath card */}
      <div className="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
        Blank document
      </div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        Start from scratch
      </div>
    </div>
  );
};
