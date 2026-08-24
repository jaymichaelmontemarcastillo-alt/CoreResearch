// src/pages/Documents/components/RecentDocuments.jsx
import React from 'react';
import { DocumentTabs } from './DocumentTabs';
import { DocumentFilterMenu } from './DocumentFilterMenu';
import { DocumentSortMenu } from './DocumentSortMenu';
import { DocumentViewToggle } from './DocumentViewToggle';
import { DocumentGrid } from './DocumentGrid';
import { DocumentList } from './DocumentList';
import { VIEW_MODES } from '../constants/documentConstants';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { HiDocumentText, HiPlus, HiArrowUpTray, HiMagnifyingGlass, HiStar } from 'react-icons/hi2';

export const RecentDocuments = ({
  documents = [],
  isLoading = false,
  viewMode = VIEW_MODES.GRID,
  onViewModeChange,
  activeTab = 'recent',
  onTabChange,
  recentCount = 0,
  favoritesCount = 0,
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange,
  searchQuery,
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  onCreateBlank,
  onImportDocument,
  canEdit = true,
}) => {
  return (
    <div className="py-6 px-4 sm:px-8 max-w-7xl mx-auto bg-white dark:bg-slate-950">
      {/* 1. Recent vs. Favorites Tabs */}
      <DocumentTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        recentCount={recentCount}
        favoritesCount={favoritesCount}
      />

      {/* 2. Controls Row: [ Title / Filter ] and [ Sort | Grid/List ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {activeTab === 'favorites' ? 'Favorite documents' : 'Recent documents'}
          </h3>
          <DocumentFilterMenu value={filterBy} onChange={onFilterChange} />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Sorting */}
          <DocumentSortMenu value={sortBy} onChange={onSortChange} />

          {/* Grid / List Switcher */}
          <DocumentViewToggle viewMode={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      {/* 3. Document Dataset View Area with Smooth Card ↔ Table Transition */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs">Loading documents...</span>
        </div>
      ) : documents.length === 0 ? (
        searchQuery ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[5px] border border-gray-200 dark:border-slate-800 p-6">
            <HiMagnifyingGlass className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No matching documents
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              No documents matched your search query "{searchQuery}".
            </p>
          </div>
        ) : activeTab === 'favorites' ? (
          <div className="py-16 bg-white dark:bg-slate-900 rounded-[5px] border border-gray-200 dark:border-slate-800 border-dashed text-center p-8">
            <HiStar className="w-10 h-10 text-amber-400 mx-auto mb-2.5" />
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              No Favorite Documents
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Star your important research manuscripts or documents to quickly access them here.
            </p>
          </div>
        ) : (
          <div className="py-16 bg-white dark:bg-slate-900 rounded-[5px] border border-gray-200 dark:border-slate-800 border-dashed">
            <EmptyState
              icon={HiDocumentText}
              title="No Documents Yet"
              description="Create a blank manuscript or import an existing Word (.docx) or PDF file."
              action={
                canEdit ? (
                  <div className="flex items-center gap-3 mt-4 justify-center">
                    <Button variant="outline" size="sm" onClick={onCreateBlank}>
                      <HiPlus className="w-3.5 h-3.5 mr-1.5" />
                      Blank Document
                    </Button>
                    <Button variant="primary" size="sm" onClick={onImportDocument}>
                      <HiArrowUpTray className="w-3.5 h-3.5 mr-1.5" />
                      Import Document
                    </Button>
                  </div>
                ) : null
              }
            />
          </div>
        )
      ) : (
        <div className="transition-opacity duration-200 ease-out">
          {viewMode === VIEW_MODES.LIST ? (
            <DocumentList
              documents={documents}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              canEdit={canEdit}
            />
          ) : (
            <DocumentGrid
              documents={documents}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              canEdit={canEdit}
            />
          )}
        </div>
      )}
    </div>
  );
};
