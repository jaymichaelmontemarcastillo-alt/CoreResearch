// src/pages/Documents/components/DocumentCardMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  ExternalLink, 
  Edit3, 
  FileDown, 
  Trash2, 
  Download,
  Star,
  FileCode
} from 'lucide-react';
import { documentService } from '../services/documentService';

export const DocumentCardMenu = ({ 
  document, 
  onOpen, 
  onRename, 
  onDelete, 
  onToggleFavorite,
  canEdit = true,
  placement = 'top' // 'top' | 'bottom'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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

  const handleExportDocx = async (e) => {
    e.stopPropagation();
    setIsOpen(false);
    try {
      await documentService.exportDocx(document);
    } catch (err) {
      console.error('Export DOCX failed:', err);
    }
  };

  const handleExportPdf = async (e) => {
    e.stopPropagation();
    setIsOpen(false);
    try {
      await documentService.exportPdf(document);
    } catch (err) {
      console.error('Export PDF failed:', err);
    }
  };

  const handleDownloadOriginal = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (document.originalFileUrl || document.downloadUrl) {
      window.open(document.originalFileUrl || document.downloadUrl, '_blank');
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onToggleFavorite) {
      onToggleFavorite(document.id, Boolean(document.isFavorite));
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded transition-colors ${
          isOpen 
            ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' 
            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
        title="Document actions"
        aria-label="Document actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 w-52 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-2xl py-1 z-50 animate-fade-in text-xs ${
            placement === 'top' ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
          }`}
        >
          {/* Open in Editor */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpen(document);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-blue-500" />
            <span>Open in Editor</span>
          </button>

          {/* Add / Remove Favorite */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Star className={`w-4 h-4 ${document.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
              <span>{document.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
          )}

          {/* Rename (if native/editable) */}
          {canEdit && onRename && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRename(document);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-gray-400" />
              <span>Rename</span>
            </button>
          )}

          <div className="my-1 border-t border-gray-100 dark:border-slate-800" />

          {/* Export to Word (.docx) */}
          <button
            type="button"
            onClick={handleExportDocx}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FileCode className="w-4 h-4 text-blue-600" />
            <span>Export as Word (.docx)</span>
          </button>

          {/* Export to PDF (.pdf) */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FileDown className="w-4 h-4 text-red-500" />
            <span>Export as PDF (.pdf)</span>
          </button>

          {/* Download Original File if available */}
          {(document.originalFileUrl || document.downloadUrl) && (
            <button
              type="button"
              onClick={handleDownloadOriginal}
              className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Download Original</span>
            </button>
          )}

          {/* Delete (if permitted) */}
          {canEdit && onDelete && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete(document);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
