// src/pages/Documents/DocumentsPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from './hooks/useDocuments';
import { useDocumentSearch } from './hooks/useDocumentSearch';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { DocumentsHeader } from './components/DocumentsHeader';
import { NewDocumentSection } from './components/NewDocumentSection';
import { RecentDocuments } from './components/RecentDocuments';
import { ImportDocumentModal } from './components/ImportDocumentModal';
import { RenameDocumentModal } from './components/RenameDocumentModal';
import { DeleteDocumentModal } from './components/DeleteDocumentModal';
import { VIEW_MODES } from './constants/documentConstants';
import { documentService } from './services/documentService';
import './DocumentsPage.css';

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);

  // Modal states for Rename & Delete
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  // 1. Documents data & mutation hook
  const {
    allDocuments,
    isLoading,
    group,
    role,
    userProfile,
    currentUser,
    noGroupAssigned,
    createBlankDocument,
    renameDocument,
    deleteDocument,
    toggleFavorite,
    onDocumentCreated,
  } = useDocuments();

  // 2. Search, filter & sort hook
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    activeTab,
    setActiveTab,
    favoritesCount,
    filteredDocuments,
    totalCount,
  } = useDocumentSearch(allDocuments, currentUser?.uid || userProfile?.uid);

  // 3. Document import hook
  const {
    isOpen: isImportModalOpen,
    openModal: openImportModal,
    closeModal: closeImportModal,
    stage: uploadStage,
    progress: uploadProgress,
    selectedFile,
    errorMessage: uploadErrorMessage,
    createdDocument: importedDoc,
    handleUploadFile,
    resetUpload,
  } = useDocumentUpload({
    userProfile,
    group,
    onSuccess: (newDoc) => {
      onDocumentCreated(newDoc);
    },
  });

  const isStudent = role === 'student';
  const canEdit = isStudent || role === 'admin';

  // Navigation handlers
  const handleOpenDocument = async (doc) => {
    if (doc.isProposalAttachment && (doc.downloadUrl || doc.originalFileUrl)) {
      window.open(doc.downloadUrl || doc.originalFileUrl, '_blank');
    } else if (doc.id) {
      // Record last opened timestamp asynchronously
      documentService.recordLastOpened(doc.id);
      navigate(`/documents/${doc.id}`);
    }
  };

  const handleCreateBlank = async () => {
    try {
      const newDoc = await createBlankDocument();
      navigate(`/documents/${newDoc.id}`);
    } catch (e) {
      navigate(`/documents/doc-${Date.now()}`);
    }
  };

  return (
    <div className="cr-docs-workspace flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* 1. Header Bar with Search & Quick Actions */}
      <DocumentsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateBlank={handleCreateBlank}
        onImportDocument={openImportModal}
        totalCount={totalCount}
        canEdit={canEdit}
      />

      {/* 2. "Start a new document" Template Gallery Section */}
      <NewDocumentSection
        onCreateBlank={handleCreateBlank}
        onImportDocument={openImportModal}
        disabled={noGroupAssigned && isStudent}
        isStudent={isStudent}
      />

      {/* 3. "Recent documents" Section */}
      <main className="flex-1 bg-white dark:bg-slate-950">
        <RecentDocuments
          documents={filteredDocuments}
          isLoading={isLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recentCount={totalCount}
          favoritesCount={favoritesCount}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchQuery={searchQuery}
          onOpen={handleOpenDocument}
          onRename={(doc) => setRenamingDoc(doc)}
          onDelete={(doc) => setDeletingDoc(doc)}
          onToggleFavorite={toggleFavorite}
          onCreateBlank={handleCreateBlank}
          onImportDocument={openImportModal}
          canEdit={canEdit}
        />
      </main>

      {/* 4. Import Document Modal (Portrait Oriented) */}
      <ImportDocumentModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        stage={uploadStage}
        progress={uploadProgress}
        selectedFile={selectedFile}
        errorMessage={uploadErrorMessage}
        createdDocument={importedDoc}
        onUploadFile={handleUploadFile}
        onOpenDocument={(doc) => {
          closeImportModal();
          handleOpenDocument(doc);
        }}
        onReset={resetUpload}
      />

      {/* 5. Rename Document Modal */}
      <RenameDocumentModal
        isOpen={Boolean(renamingDoc)}
        document={renamingDoc}
        onClose={() => setRenamingDoc(null)}
        onRename={renameDocument}
      />

      {/* 6. Delete Document Modal */}
      <DeleteDocumentModal
        isOpen={Boolean(deletingDoc)}
        document={deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onDelete={deleteDocument}
      />
    </div>
  );
};

export default DocumentsPage;
