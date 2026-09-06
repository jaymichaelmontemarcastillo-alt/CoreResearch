import { getStorageProvider } from '../storage/storageManager.js';
import mongoose from 'mongoose';

export class DocumentImportService {
  /**
   * Execute full document import pipeline for ONLYOFFICE
   * @param {Object} params
   * @param {Buffer} params.fileBuffer - Raw file buffer
   * @param {string} params.fileName - Original file name
   * @param {string} params.mimeType - MIME type
   * @param {number} params.fileSize - File size in bytes
   * @param {Object} params.userProfile - Authenticated user profile
   * @param {Object} params.groupInfo - Optional research group association
   * @returns {Promise<Object>} Created document record
   */
  async importDocument({
    fileBuffer,
    fileName,
    mimeType,
    fileSize,
    userProfile = null,
    groupInfo = null,
    existingDocumentId = null,
  }) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('No file data received for document import.');
    }

    const documentId = existingDocumentId || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageProvider = getStorageProvider();

    if (ext !== 'docx') {
      throw new Error(`Unsupported document format '.${ext}'. ONLYOFFICE migration currently only supports .docx for direct import.`);
    }

    // 1. Upload original source file to persistent object storage (GridFS)
    const originalFileKey = `documents/${documentId}/original/${cleanFileName}`;
    const originalUpload = await storageProvider.upload(
      originalFileKey,
      fileBuffer,
      mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      { documentId, uploadedBy: userProfile?.uid || 'user' }
    );

    const ownerId = userProfile?.uid || 'guest-user';
    const title = cleanFileName.replace(/\.[^/.]+$/, '');
    
    // 2. Build authoritative document persistence schema for MongoDB
    const documentMetadata = {
      sourceFormat: ext,
      importMethod: 'direct_upload',
      importStatus: 'completed',
      sourceDocument: {
        filename: cleanFileName,
        mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: fileSize || fileBuffer.length,
        url: originalUpload.url,
        storageKey: originalFileKey
      }
    };

    // 3. Save directly to MongoDB as the application source of truth
    try {
      const MongoDocument = mongoose.model('Document');
      
      const updateData = {
        title: title,
        sourceType: 'imported',
        editorType: 'onlyoffice',
        onlyofficeFileKey: originalFileKey,
        updated_at: new Date(), // Important for cache invalidation
        ...documentMetadata
      };

      if (existingDocumentId) {
        await MongoDocument.findOneAndUpdate(
          { id: existingDocumentId },
          { $set: updateData },
          { upsert: true, new: true }
        );
      } else {
        await MongoDocument.create({
          id: documentId,
          abstract: '', 
          status: 'draft',
          authors: [ownerId],
          adviser: null,
          ...updateData
        });
      }
    } catch (mongoErr) {
      console.warn('[DocumentImportService] MongoDB write error:', mongoErr.message);
      throw mongoErr;
    }

    // Return the structure expected by the client API response
    return {
      id: documentId,
      title: title,
      ...documentMetadata
    };
  }
}

export const documentImportService = new DocumentImportService();
export default documentImportService;
