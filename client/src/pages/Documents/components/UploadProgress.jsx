// src/pages/Documents/components/UploadProgress.jsx
import React, { useState, useEffect } from 'react';
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
  const [conversionProgress, setConversionProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (stage === UPLOAD_STAGES.CONVERTING) {
      setConversionProgress(0);
      interval = setInterval(() => {
        setConversionProgress((prev) => {
          // Fast up to 85%, then slower, then crawl up to 98%
          if (prev < 85) {
            return prev + Math.floor(Math.random() * 8) + 2;
          } else if (prev < 95) {
            return prev + Math.floor(Math.random() * 3) + 1;
          } else if (prev < 99) {
            return prev + 1;
          }
          return prev;
        });
      }, 400);
    } else if (stage === UPLOAD_STAGES.LOADING || stage === UPLOAD_STAGES.COMPLETED) {
      setConversionProgress(100);
    }
    return () => clearInterval(interval);
  }, [stage]);

  const showUpload = stage === UPLOAD_STAGES.UPLOADING || stage === UPLOAD_STAGES.CONVERTING || stage === UPLOAD_STAGES.LOADING || stage === UPLOAD_STAGES.COMPLETED;
  const showConvert = stage === UPLOAD_STAGES.CONVERTING || stage === UPLOAD_STAGES.LOADING || stage === UPLOAD_STAGES.COMPLETED;
  const showLoading = stage === UPLOAD_STAGES.LOADING || stage === UPLOAD_STAGES.COMPLETED;

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

      {/* 1. Uploading State */}
      {showUpload && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              {stage === UPLOAD_STAGES.UPLOADING ? (
                <HiArrowPath className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <HiCheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              {stage === UPLOAD_STAGES.UPLOADING ? 'Uploading document...' : 'Upload complete'}
            </span>
            <span className={`font-bold ${stage === UPLOAD_STAGES.UPLOADING ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stage === UPLOAD_STAGES.UPLOADING ? `${progress}%` : '100%'}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ease-out rounded-full ${stage === UPLOAD_STAGES.UPLOADING ? 'bg-blue-600' : 'bg-emerald-500'}`}
              style={{ width: `${stage === UPLOAD_STAGES.UPLOADING ? progress : 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Converting State */}
      {showConvert && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              {stage === UPLOAD_STAGES.CONVERTING ? (
                <HiArrowPath className="w-3.5 h-3.5 animate-spin text-purple-600" />
              ) : (
                <HiCheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              {stage === UPLOAD_STAGES.CONVERTING 
                ? (isDocx ? 'Converting DOCX content...' : 'Extracting PDF document data...') 
                : 'Conversion complete'}
            </span>
            <span className={`font-bold ${stage === UPLOAD_STAGES.CONVERTING ? 'text-purple-600' : 'text-emerald-600'}`}>
              {stage === UPLOAD_STAGES.CONVERTING ? `${conversionProgress}%` : '100%'}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ease-out rounded-full ${stage === UPLOAD_STAGES.CONVERTING ? 'bg-purple-600' : 'bg-emerald-500'}`}
              style={{ width: `${stage === UPLOAD_STAGES.CONVERTING ? conversionProgress : 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Loading State */}
      {showLoading && stage !== UPLOAD_STAGES.COMPLETED && (
        <div className="space-y-2 animate-fade-in">
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
        <div className="text-center py-3 space-y-3 animate-fade-in">
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

