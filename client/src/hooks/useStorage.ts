import { useState } from 'react';
import storageService from '../services/storage.service';
import { FileUploadResult } from '../types/storage.types';

export const useStorage = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const uploadManuscript = async (
    file: File,
    projectId: string,
    versionNumber: string
  ): Promise<FileUploadResult> => {
    setUploading(true);
    setError(null);
    try {
      return await storageService.uploadManuscriptPdf(file, projectId, versionNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to upload manuscript');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const uploadAvatar = async (
    file: File,
    userId: string
  ): Promise<FileUploadResult> => {
    setUploading(true);
    setError(null);
    try {
      return await storageService.uploadProfileAvatar(file, userId);
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar image');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fullPath: string): Promise<void> => {
    try {
      await storageService.deleteFile(fullPath);
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
      throw err;
    }
  };

  return {
    uploading,
    error,
    uploadManuscript,
    uploadAvatar,
    deleteFile,
  };
};

export default useStorage;
