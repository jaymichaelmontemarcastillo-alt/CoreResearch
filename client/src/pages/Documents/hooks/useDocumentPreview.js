// src/pages/Documents/hooks/useDocumentPreview.js
import { useMemo } from 'react';
import { documentPreviewService } from '../services/documentPreviewService';

export const useDocumentPreview = (document) => {
  return useMemo(() => {
    return documentPreviewService.getPreviewModel(document);
  }, [
    document?.id,
    document?.contentHtml,
    document?.plainText,
    document?.previewUrl,
    document?.title,
    document?.sourceType,
  ]);
};
