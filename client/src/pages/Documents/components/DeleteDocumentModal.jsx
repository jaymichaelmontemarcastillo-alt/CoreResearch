// src/pages/Documents/components/DeleteDocumentModal.jsx
import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { HiTrash, HiExclamationTriangle, HiXMark } from 'react-icons/hi2';

export const DeleteDocumentModal = ({
  isOpen,
  document,
  onClose,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !document) return null;

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(document.id);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <HiExclamationTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold">Delete Document</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <HiXMark className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">"{document.title || document.fileName}"</strong>?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            This will permanently remove the document record and collaborative manuscript notes. This action cannot be undone.
          </p>
        </div>

        <div className="px-6 py-3.5 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        </div>
      </div>
    </div>
  );
};
