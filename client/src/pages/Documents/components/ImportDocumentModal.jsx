// src/pages/Documents/components/ImportDocumentModal.jsx
import React from 'react';
import { UploadDropzone } from './UploadDropzone';
import { UploadProgress } from './UploadProgress';
import { UPLOAD_STAGES } from '../constants/documentConstants';
import { X, FileUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const ImportDocumentModal = ({
  isOpen,
  onClose,
  stage,
  progress,
  selectedFile,
  errorMessage,
  createdDocument,
  onUploadFile,
  onOpenDocument,
  onReset,
}) => {
  if (!isOpen) return null;

  const isUploading = stage !== UPLOAD_STAGES.IDLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Portrait-Oriented Modal Box (max-w-md / 420px) */}
      <div 
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-[440px] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Import Document
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Upload a Microsoft Word (.docx) or PDF file
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={stage === UPLOAD_STAGES.UPLOADING || stage === UPLOAD_STAGES.PROCESSING}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isUploading ? (
            <UploadDropzone onFileSelected={onUploadFile} />
          ) : (
            <UploadProgress
              stage={stage}
              progress={progress}
              file={selectedFile}
              errorMessage={errorMessage}
              createdDocument={createdDocument}
              onOpenDocument={onOpenDocument}
              onReset={onReset}
              onClose={onClose}
            />
          )}
        </div>

        {/* Modal Footer (only in idle state) */}
        {!isUploading && (
          <div className="px-6 py-3.5 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Max file size: 25 MB
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
