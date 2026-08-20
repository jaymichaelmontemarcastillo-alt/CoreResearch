// src/pages/Documents/components/ImportDocumentCard.jsx
import React from 'react';
import { UploadCloud } from 'lucide-react';

export const ImportDocumentCard = ({ onClick, disabled = false }) => {
  return (
    <div className="flex flex-col items-start w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="cr-blank-template-card cr-doc-card-radius group relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-2xs hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Import a Microsoft Word (.docx) or PDF document"
      >
        <div className="flex flex-col items-center justify-center p-3 text-center transition-transform duration-200 group-hover:scale-105">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 border border-blue-100 dark:border-blue-900/60 shadow-2xs">
            <UploadCloud className="w-6 h-6 stroke-[1.75]" />
          </div>
          <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 tracking-tight">
            Import Document
          </span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
            Word / PDF
          </span>
        </div>
      </button>

      {/* Label underneath */}
      <div className="mt-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
        Import document
      </div>
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        DOCX, PDF
      </div>
    </div>
  );
};
