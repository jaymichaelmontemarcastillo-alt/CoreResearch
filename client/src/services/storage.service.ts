import {
  ref,
  uploadBytes,
  uploadBytesResumable,
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
   * Upload a generic file with progress tracking.
   */
  async uploadFileWithProgress(
    file: File,
    folderPath: string,
    onProgress: (progress: number) => void,
    customFileName?: string
  ): Promise<FileUploadResult> {
    const fileName = customFileName || `${Date.now()}_${file.name}`;
    const fullPath = `${folderPath}/${fileName}`;
    const storageRef: StorageReference = ref(storage, fullPath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      // 60-second timeout to prevent UI from hanging if Firebase connection stalls
      const timeoutId = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error(`Upload timed out for file ${fileName}. Please check your connection or file size.`));
      }, 60000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            clearTimeout(timeoutId);
            onProgress(100);
            resolve({
              downloadUrl,
              fullPath,
              fileName,
              fileSize: file.size,
              contentType: file.type,
            });
          } catch (urlError) {
            clearTimeout(timeoutId);
            reject(urlError);
          }
        }
      );
    });
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
