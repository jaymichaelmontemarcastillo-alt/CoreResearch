// src/pages/Documents/components/DocumentSortMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import { HiArrowsUpDown, HiCheck, HiChevronDown } from 'react-icons/hi2';
import { SORT_OPTIONS } from '../constants/documentConstants';

export const DocumentSortMenu = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = SORT_OPTIONS.find((opt) => opt.id === value) || SORT_OPTIONS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
        title="Sort documents"
      >
        <HiArrowsUpDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span className="hidden sm:inline">{currentOption.label}</span>
        <HiChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 animate-fade-in text-xs">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-gray-400 tracking-wider">
            Sort by
          </div>
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <HiCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
