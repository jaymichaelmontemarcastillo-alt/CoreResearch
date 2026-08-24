// src/pages/Documents/services/documentUploadService.js
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage';
import { app, storage } from '../../../firebase/firebase';

/**
 * Helper to get a storage instance with bucket fallback if default bucket encounters 404/CORS
 */
const getStorageInstance = (useAppspotFallback = false) => {
  if (!useAppspotFallback) return storage;
  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'coreresearch-33a17';
    return getStorage(app, `gs://${projectId}.appspot.com`);
  } catch {
    return storage;
  }
};

export const documentUploadService = {
  /**
   * Upload a document file (.docx, .pdf) to Firebase Storage with single-attempt lifecycle,
   * progress tracking, fail-fast timeout, and detailed error reporting.
   * Target Path: documents/{documentId}/source/{cleanFileName}
   */
  uploadDocumentFile: async (file, documentId = `doc-${Date.now()}`, userId = 'general', onProgress = () => {}) => {
    if (!file) {
      throw new Error('No file selected for upload.');
    }

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fullPath = `documents/${documentId}/source/${timestamp}_${cleanFileName}`;

    const executeUpload = (storageInst) => {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storageInst, fullPath);
        const metadata = {
          contentType: file.type || (file.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
          customMetadata: {
            originalName: file.name,
            uploadedBy: userId,
            documentId: documentId,
            uploadedAt: new Date().toISOString(),
          },
        };

        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        // Fail-fast timeout (30 seconds) to prevent permanent hang
        const timeoutId = setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch (e) {
            // ignore
          }
          reject(new Error('Upload timed out. Please check your network connection or Firebase Storage rules.'));
        }, 30000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(Math.min(percent, 99));
            }
          },
          (error) => {
            clearTimeout(timeoutId);
            let userMessage = error.message || 'Upload failed.';
            if (error.code === 'storage/unauthorized') {
              userMessage = 'Permission denied. Please ensure you are logged in.';
            } else if (error.code === 'storage/canceled') {
              userMessage = 'Upload was cancelled.';
            } else if (error.code === 'storage/retry-limit-exceeded' || error.message?.includes('CORS') || error.message?.includes('preflight')) {
              userMessage = 'Firebase Storage preflight/CORS error. Bucket unreachable or origin not permitted.';
            }
            reject(new Error(userMessage));
          },
          async () => {
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              onProgress(100);
              resolve({
                downloadUrl,
                fullPath,
                fileName: file.name,
                fileSize: file.size,
                contentType: file.type,
              });
            } catch (urlErr) {
              reject(new Error(`Failed to retrieve download URL: ${urlErr.message}`));
            }
          }
        );
      });
    };

    try {
      // 1. First attempt with default configured storage instance
      return await executeUpload(getStorageInstance(false));
    } catch (firstErr) {
      console.warn('[documentUploadService] Primary upload attempt failed:', firstErr.message);
      
      // 2. If primary failed with CORS / bucket error, attempt with .appspot.com fallback bucket
      try {
        console.info('[documentUploadService] Attempting fallback bucket (.appspot.com)...');
        return await executeUpload(getStorageInstance(true));
      } catch (fallbackErr) {
        console.error('[documentUploadService] Fallback upload also failed:', fallbackErr.message);
        throw new Error(firstErr.message || fallbackErr.message || 'Firebase Storage upload failed.');
      }
    }
  },
};

export default documentUploadService;
