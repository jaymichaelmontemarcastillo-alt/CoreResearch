import React from 'react';
import { DocumentCardMenu } from './DocumentCardMenu';
import { formatGoogleDocsDate, getDocumentTypeInfo } from '../utils/documentHelpers';
import { HiStar } from 'react-icons/hi2';

export const DocumentList = ({
  documents = [],
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  canEdit = true,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[5px] shadow-2xs animate-fade-in overflow-visible relative">
      <table className="cr-doc-table w-full">
        <thead>
          <tr className="bg-gray-50/70 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <th className="py-3 px-4 text-left font-medium">Name</th>
            <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Owner</th>
            <th className="py-3 px-4 text-left font-medium hidden sm:table-cell">Group</th>
            <th className="py-3 px-4 text-left font-medium">Last opened</th>
            <th className="py-3 px-4 text-center font-medium w-10"></th>
            <th className="py-3 px-4 text-right font-medium w-12"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => {
            const typeInfo = getDocumentTypeInfo(doc.sourceType, doc.contentType);
            const formattedDate = formatGoogleDocsDate(
              doc.lastOpenedAt || doc.updatedAt || doc.createdAt,
              'Opened'
            );

            const handleStarClick = (e) => {
              e.stopPropagation();
              if (onToggleFavorite) {
                onToggleFavorite(doc.id, Boolean(doc.isFavorite));
              }
            };

            // If it's the very first row with only 1-2 items, top or bottom:
            // but opening upwards or with high z-index works cleanly
            const placement = idx === 0 && documents.length === 1 ? 'bottom' : 'top';

            return (
              <tr
                key={doc.id}
                onClick={() => onOpen(doc)}
                className="cr-doc-table-row group border-b border-gray-100 dark:border-slate-800/80 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Document Name + Type Icon */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-xs flex items-center justify-center shrink-0 ${typeInfo.iconColor}`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-xs sm:max-w-sm md:max-w-md">
                      {doc.title || doc.fileName || 'Untitled Document'}
                    </span>
                  </div>
                </td>

                {/* Owner */}
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300 hidden md:table-cell">
                  {doc.ownerName || 'Researcher'}
                </td>

                {/* Group */}
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  {doc.groupName || '—'}
                </td>

                {/* Last Opened / Modified */}
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formattedDate}
                </td>

                {/* Favorite Star */}
                <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={handleStarClick}
                    className={`p-1 rounded transition-colors ${
                      doc.isFavorite 
                        ? 'text-amber-500 hover:text-amber-600' 
                        : 'text-gray-300 dark:text-gray-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <HiStar className="w-4 h-4" />
                  </button>
                </td>

                {/* Three-dot menu */}
                <td className="py-3 px-4 text-right overflow-visible relative" onClick={(e) => e.stopPropagation()}>
                  <DocumentCardMenu
                    document={doc}
                    onOpen={onOpen}
                    onRename={onRename}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    canEdit={canEdit && doc.isEditorDraft}
                    placement={placement}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
