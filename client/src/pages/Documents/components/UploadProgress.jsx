// src/pages/Documents/components/UploadProgress.jsx
import React from 'react';
import { UPLOAD_STAGES } from '../constants/documentConstants';
import { HiCheckCircle, HiExclamationCircle, HiArrowPath, HiDocumentText, HiDocument } from 'react-icons/hi2';
import { Button } from '../../../components/ui/Button';

export const UploadProgress = ({
  stage,
  progress,
  file,
  errorMessage,
  createdDocument,
  onOpenDocument,
  onReset,
  onClose,
}) => {
  const isDocx = file?.name?.toLowerCase().endsWith('.docx');

  return (
    <div className="py-4 space-y-4">
      {/* File Info Header */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
          isDocx ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
        }`}>
          {isDocx ? <HiDocument className="w-5 h-5" /> : <HiDocumentText className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
            {file?.name || 'Document'}
          </h5>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {file?.size ? `${(file.size / 1024).toFixed(1)} KB` : ''} • {isDocx ? 'Microsoft Word' : 'PDF Document'}
          </span>
        </div>
      </div>

      {/* Progress Bar & Status Text */}
      {stage === UPLOAD_STAGES.UPLOADING && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              <HiArrowPath className="w-3.5 h-3.5 animate-spin text-blue-600" />
              Uploading document...
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Converting State */}
      {stage === UPLOAD_STAGES.CONVERTING && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              <HiArrowPath className="w-3.5 h-3.5 animate-spin text-purple-600" />
              {isDocx ? 'Converting DOCX content...' : 'Extracting PDF document data...'}
            </span>
            <span className="font-bold text-purple-600">Processing</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 animate-pulse w-full rounded-full" />
          </div>
        </div>
      )}

      {/* Loading State */}
      {stage === UPLOAD_STAGES.LOADING && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              <HiArrowPath className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              Loading document into editor...
            </span>
            <span className="font-bold text-indigo-600">Finalizing</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 animate-pulse w-full rounded-full" />
          </div>
        </div>
      )}

      {/* Completed Success State */}
      {stage === UPLOAD_STAGES.COMPLETED && (
        <div className="text-center py-3 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <HiCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Document Imported Successfully!
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Your document is ready and added to Recent Documents.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
            {createdDocument && onOpenDocument && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenDocument(createdDocument)}
              >
                Open in Editor
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {stage === UPLOAD_STAGES.ERROR && (
        <div className="text-center py-3 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-xs">
            <HiExclamationCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
              Import Failed
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              {errorMessage || 'Failed to upload or convert the document. Please try again.'}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              Try Again
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
