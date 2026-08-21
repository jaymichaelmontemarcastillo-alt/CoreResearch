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
   * Upload a generic file with progress tracking and automatic fallback.
   */
  async uploadFileWithProgress(
    file: File,
    folderPath: string,
    onProgress: (progress: number) => void,
    customFileName?: string
  ): Promise<FileUploadResult> {
    const fileName = customFileName || `${Date.now()}_${file.name}`;
    const fullPath = `${folderPath}/${fileName}`;

    // Helper to generate a local fallback Data URL
    const createFallbackResult = async (): Promise<FileUploadResult> => {
      return new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => {
          onProgress(100);
          res({
            downloadUrl: (reader.result as string) || URL.createObjectURL(file),
            fullPath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || 'application/pdf',
          });
        };
        reader.onerror = () => {
          onProgress(100);
          res({
            downloadUrl: URL.createObjectURL(file),
            fullPath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || 'application/pdf',
          });
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const storageRef: StorageReference = ref(storage, fullPath);

      return await new Promise<FileUploadResult>((resolve) => {
        let isResolved = false;

        const safeResolve = (result: FileUploadResult) => {
          if (!isResolved) {
            isResolved = true;
            resolve(result);
          }
        };

        // 8-second safety timeout so UI never hangs
        const timeoutId = setTimeout(async () => {
          console.warn(`[storageService] Upload timed out for ${fileName}. Using fallback data URL.`);
          try {
            uploadTask.cancel();
          } catch (_) {}
          const fallback = await createFallbackResult();
          safeResolve(fallback);
        }, 8000);

        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'application/pdf',
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.min(95, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
              onProgress(progress);
            }
          },
          async (error) => {
            clearTimeout(timeoutId);
            console.warn('[storageService] uploadBytesResumable error:', error.message);
            const fallback = await createFallbackResult();
            safeResolve(fallback);
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              onProgress(100);
              safeResolve({
                downloadUrl,
                fullPath,
                fileName: file.name,
                fileSize: file.size,
                contentType: file.type || 'application/pdf',
              });
            } catch (urlError) {
              console.warn('[storageService] getDownloadURL error:', urlError);
              const fallback = await createFallbackResult();
              safeResolve(fallback);
            }
          }
        );
      });
    } catch (err) {
      console.warn('[storageService] Top-level upload error:', err);
      return createFallbackResult();
    }
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
