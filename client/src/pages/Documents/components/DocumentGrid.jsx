// src/pages/Documents/components/DocumentGrid.jsx
import React from 'react';
import { DocumentCard } from './DocumentCard';

export const DocumentGrid = ({
  documents = [],
  onOpen,
  onRename,
  onDelete,
  onToggleFavorite,
  canEdit = true,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 animate-fade-in">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
};
