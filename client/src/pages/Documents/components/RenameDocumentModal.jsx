// src/pages/Documents/components/RenameDocumentModal.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Edit3, X } from 'lucide-react';

export const RenameDocumentModal = ({
  isOpen,
  document,
  onClose,
  onRename,
}) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || document.fileName || '');
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onRename(document.id, title.trim());
      onClose();
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Rename Document
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Document Name
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter new document name..."
              autoFocus
              className="w-full text-sm"
            />
          </div>

          <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!title.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Rename'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
