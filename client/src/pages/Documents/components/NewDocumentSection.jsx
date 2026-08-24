// src/pages/Documents/components/NewDocumentSection.jsx
import React, { useState } from 'react';
import { BlankDocumentCard } from './BlankDocumentCard';
import { ImportDocumentCard } from './ImportDocumentCard';
import { Button } from '../../../components/ui/Button';
import { HiPlus, HiChevronDown, HiChevronRight, HiArrowUpTray } from 'react-icons/hi2';

export const NewDocumentSection = ({
  onCreateBlank,
  onImportDocument,
  disabled = false,
  isStudent = true,
}) => {
  // Collapsible state (stored in localStorage for persistent preference)
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('coreresearch_doc_template_expanded');
      return saved !== null ? saved === 'true' : false; // Default collapsed for clean view
    } catch {
      return false;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('coreresearch_doc_template_expanded', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  return (
    <section className="cr-template-section bg-white dark:bg-slate-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        {/* Top Control Bar: [ > / v ] + (New Blank & Import buttons ONLY when collapsed) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Collapse / Expand Toggle Button placed BEFORE the action buttons */}
            <button
              type="button"
              onClick={toggleExpanded}
              className="w-8 h-8 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/80 flex items-center justify-center transition-all duration-150 shadow-2xs"
              title={isExpanded ? 'Collapse template gallery' : 'Expand template gallery'}
              aria-label={isExpanded ? 'Collapse templates' : 'Expand templates'}
            >
              {isExpanded ? (
                <HiChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <HiChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* When COLLAPSED: Show New blank document & Import Document buttons */}
            {!isExpanded && (
              <div className="flex items-center gap-2.5 animate-fade-in">
                {/* CoreResearch Primary Blue New Blank Document Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onCreateBlank}
                  disabled={disabled}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs px-3.5 py-1.5 rounded-md shadow-2xs flex items-center gap-2 transition-all duration-150"
                >
                  <HiPlus className="w-4 h-4" />
                  <span>New blank document</span>
                </Button>

                {/* Import Document Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onImportDocument}
                  disabled={disabled}
                  className="text-xs border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md"
                >
                  <HiArrowUpTray className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                  <span>Import document</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Expanded Template Grid with Smooth Transition (No dividing borders) */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-96 opacity-100 mt-4 pt-1' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Start a new document
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pb-2">
            {/* 1. Blank Document Card */}
            <BlankDocumentCard onClick={onCreateBlank} disabled={disabled} />

            {/* 2. Import Document Card */}
            <ImportDocumentCard onClick={onImportDocument} disabled={disabled} />
          </div>
        </div>
      </div>
    </section>
  );
};
