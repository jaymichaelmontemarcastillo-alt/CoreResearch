import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  StorageReference,
} from 'firebase/storage';
import { storage } from '../firebase/firebase';
import { FileUploadResult, FileMetadata } from '../types/storage.types';

export const storageService = {
  /**
   * Upload a generic file to Firebase Storage.
   */
  async uploadFile(
    file: File,
    folderPath: string,
    customFileName?: string
  ): Promise<FileUploadResult> {
    const fileName = customFileName || `${Date.now()}_${file.name}`;
    const fullPath = `${folderPath}/${fileName}`;
    const storageRef: StorageReference = ref(storage, fullPath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      downloadUrl,
      fullPath,
      fileName,
      fileSize: file.size,
      contentType: file.type,
    };
  },

  /**
   * Upload a PDF manuscript version document.
   */
  async uploadManuscriptPdf(
    file: File,
    projectId: string,
    versionNumber: string
  ): Promise<FileUploadResult> {
    const folderPath = `manuscripts/${projectId}`;
    const customFileName = `manuscript_${projectId}_${versionNumber}.pdf`;
    return this.uploadFile(file, folderPath, customFileName);
  },

  /**
   * Upload a user profile avatar image.
   */
  async uploadProfileAvatar(
    file: File,
    userId: string
  ): Promise<FileUploadResult> {
    const folderPath = `avatars/${userId}`;
    const customFileName = `avatar_${userId}_${Date.now()}`;
    return this.uploadFile(file, folderPath, customFileName);
  },

  /**
   * Get public download URL for a storage file path.
   */
  async getFileDownloadUrl(fullPath: string): Promise<string> {
    const storageRef = ref(storage, fullPath);
    return getDownloadURL(storageRef);
  },

  /**
   * Delete a file from Firebase Storage.
   */
  async deleteFile(fullPath: string): Promise<void> {
    const storageRef = ref(storage, fullPath);
    await deleteObject(storageRef);
  },
};

export default storageService;
