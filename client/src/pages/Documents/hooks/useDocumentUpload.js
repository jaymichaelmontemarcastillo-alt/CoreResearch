// src/pages/Documents/hooks/useDocumentUpload.js
import { useState, useCallback } from 'react';
import { UPLOAD_STAGES } from '../constants/documentConstants';
import { validateDocumentFile } from '../utils/documentValidation';
import { documentImportService } from '../services/documentImportService';

export const useDocumentUpload = ({ userProfile, group, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState(UPLOAD_STAGES.IDLE);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [createdDocument, setCreatedDocument] = useState(null);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setStage(UPLOAD_STAGES.IDLE);
    setProgress(0);
    setErrorMessage('');
    setSelectedFile(null);
    setCreatedDocument(null);
  }, []);

  const closeModal = useCallback(() => {
    // Only close if not actively uploading or processing
    if (stage === UPLOAD_STAGES.UPLOADING || stage === UPLOAD_STAGES.PROCESSING || stage === UPLOAD_STAGES.CREATING_RECORD) {
      return;
    }
    setIsOpen(false);
    setStage(UPLOAD_STAGES.IDLE);
    setProgress(0);
    setErrorMessage('');
    setSelectedFile(null);
    setCreatedDocument(null);
  }, [stage]);

  const handleUploadFile = async (file) => {
    if (!file) return;

    // 1. Validate file format and size
    const validation = validateDocumentFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid file format or size.');
      setStage(UPLOAD_STAGES.ERROR);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setStage(UPLOAD_STAGES.UPLOADING);
    setProgress(5);

    try {
      // 2. Dispatch to Document Import Pipeline
      const newDoc = await documentImportService.importDocument({
        file,
        userProfile,
        groupInfo: group,
        onProgress: (pct) => {
          setProgress(pct);
          if (pct >= 90 && stage !== UPLOAD_STAGES.PROCESSING) {
            setStage(UPLOAD_STAGES.PROCESSING);
          }
        },
      });

      setCreatedDocument(newDoc);
      setProgress(100);
      setStage(UPLOAD_STAGES.COMPLETED);

      if (onSuccess) {
        onSuccess(newDoc);
      }
    } catch (err) {
      console.error('[useDocumentUpload] Import error:', err);
      setErrorMessage(err.message || 'An error occurred during document import.');
      setStage(UPLOAD_STAGES.ERROR);
    }
  };

  const resetUpload = useCallback(() => {
    setStage(UPLOAD_STAGES.IDLE);
    setProgress(0);
    setErrorMessage('');
    setSelectedFile(null);
    setCreatedDocument(null);
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
    stage,
    progress,
    errorMessage,
    selectedFile,
    createdDocument,
    handleUploadFile,
    resetUpload,
  };
};
