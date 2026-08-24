// src/pages/Documents/utils/documentValidation.js
import { MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from '../constants/documentConstants';

/**
 * Validates an uploaded file for allowed types (.pdf, .docx) and file size.
 * Returns { isValid: boolean, error: string | null, fileType: 'pdf' | 'docx' | null }
 */
export const validateDocumentFile = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file selected.', fileType: null };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type) || hasValidExt;

  if (!hasValidExt && !hasValidMime) {
    return {
      isValid: false,
      error: 'Invalid file format. Only Microsoft Word (.docx) and PDF (.pdf) documents are supported.',
      fileType: null,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds the ${sizeInMb}MB maximum limit.`,
      fileType: null,
    };
  }

  let fileType = 'docx';
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    fileType = 'pdf';
  }

  return { isValid: true, error: null, fileType };
};
