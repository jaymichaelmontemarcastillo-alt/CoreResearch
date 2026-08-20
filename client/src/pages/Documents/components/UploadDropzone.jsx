// src/pages/Documents/components/UploadDropzone.jsx
import React, { useState, useRef } from 'react';
import { UploadCloud, FileUp, FileText, AlertCircle } from 'lucide-react';
import { ALLOWED_EXTENSIONS } from '../constants/documentConstants';

export const UploadDropzone = ({ onFileSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
    // Reset file input value so same file can be re-selected if needed
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled && fileInputRef.current) {
          fileInputRef.current.click();
        }
      }}
      className={`cr-dropzone p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
          : 'bg-gray-50/60 dark:bg-slate-900/60 hover:bg-gray-50 dark:hover:bg-slate-900'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 shadow-xs">
        <UploadCloud className="w-7 h-7" />
      </div>

      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
        Drag & Drop your document here
      </h4>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3.5">
        or <span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">Browse Files</span> from your computer
      </p>

      <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700">
        <FileText className="w-3.5 h-3.5 text-blue-500" />
        <span>Supported: <strong>PDF (.pdf)</strong> and <strong>Word (.docx)</strong></span>
      </div>
    </div>
  );
};
