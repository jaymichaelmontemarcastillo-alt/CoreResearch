// src/pages/Documents/components/DocumentCard.jsx
import React from 'react';
import { DocumentPreview } from './DocumentPreview';
import { DocumentCardMenu } from './DocumentCardMenu';
import { formatGoogleDocsDate, getDocumentTypeInfo } from '../utils/documentHelpers';
import { Star } from 'lucide-react';

export const DocumentCard = ({
  document,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  canEdit = true,
}) => {
  const typeInfo = getDocumentTypeInfo(document.sourceType, document.contentType);
  const formattedDate = formatGoogleDocsDate(
    document.lastOpenedAt || document.updatedAt || document.createdAt,
    'Opened'
  );

  const handleStarClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(document.id, Boolean(document.isFavorite));
    }
  };

  return (
    <div
      className="cr-doc-card cr-doc-card-radius group bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 flex flex-col cursor-pointer shadow-2xs hover:shadow-md"
      onClick={() => onOpen(document)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(document);
        }
      }}
      title={`Open ${document.title || 'Document'}`}
    >
      {/* Larger Miniature Document Preview */}
      <DocumentPreview document={document} />

      {/* Document Card Footer Information */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-b-[5px] flex flex-col justify-between flex-1 border-t border-gray-100 dark:border-slate-800/80">
        <div>
          {/* Document Title - Bold and Legible */}
          <h4
            className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            title={document.title || document.fileName || 'Untitled Document'}
          >
            {document.title || document.fileName || 'Untitled Document'}
          </h4>
        </div>

        {/* Bottom Metadata & Controls */}
        <div className="flex items-center justify-between mt-2.5 text-xs text-gray-500 dark:text-gray-400">
          {/* Left info: File Type Icon + Date */}
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            {/* CoreResearch Document / Word / PDF type icon */}
            <div className={`w-4 h-4 rounded-xs flex items-center justify-center shrink-0 ${typeInfo.iconColor}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>

            <span className="truncate text-xs text-gray-600 dark:text-gray-300 font-medium" title={formattedDate}>
              {formattedDate}
            </span>
          </div>

          {/* Right Controls: Star Toggle & 3-dot Menu */}
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Favorite Star Button */}
            <button
              type="button"
              onClick={handleStarClick}
              className={`p-1 rounded transition-colors ${
                document.isFavorite 
                  ? 'text-amber-500 hover:text-amber-600' 
                  : 'text-gray-300 dark:text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
              }`}
              title={document.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${document.isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Three-dot context menu (Opens Upward) */}
            <DocumentCardMenu
              document={document}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              canEdit={canEdit && document.isEditorDraft}
              placement="top"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
