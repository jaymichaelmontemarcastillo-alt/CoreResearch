// server/src/services/import/DocumentImportService.js
import { DocxParser } from './docx/DocxParser.js';
import { PdfParser } from './pdf/PdfParser.js';
import { DocumentIRToTiptap } from './tiptap/documentIRToTiptap.js';
import { getStorageProvider } from '../storage/storageManager.js';
import { db, isDevMockMode, mockFirestoreDb } from '../../config/firebaseAdmin.js';
import mongoose from 'mongoose';

export class DocumentImportService {
  constructor() {
    this.docxParser = new DocxParser();
    this.pdfParser = new PdfParser();
    this.tiptapConverter = new DocumentIRToTiptap();
  }

  /**
   * Execute full document import pipeline
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
  }) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('No file data received for document import.');
    }

    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageProvider = getStorageProvider();

    // 1. Select appropriate parser and parse to Document IR
    let ir;
    if (ext === 'docx') {
      ir = await this.docxParser.parse(fileBuffer, fileName);
    } else if (ext === 'pdf') {
      ir = await this.pdfParser.parse(fileBuffer, fileName);
    } else {
      throw new Error(`Unsupported document format '.${ext}'. Supported formats are .docx and .pdf`);
    }

    // 2. Upload original source file to persistent object storage
    const originalFileKey = `documents/${documentId}/original/${cleanFileName}`;
    const originalUpload = await storageProvider.upload(
      originalFileKey,
      fileBuffer,
      mimeType || 'application/octet-stream',
      { documentId, uploadedBy: userProfile?.uid || 'user' }
    );

    // 3. Upload extracted image assets to persistent storage
    const assetUrlMap = new Map();
    if (Array.isArray(ir.assets) && ir.assets.length > 0) {
      for (const asset of ir.assets) {
        const assetKey = `documents/${documentId}/assets/${asset.fileName}`;
        try {
          const assetUpload = await storageProvider.upload(
            assetKey,
            asset.buffer,
            asset.mimeType,
            { documentId, assetId: asset.id }
          );
          assetUrlMap.set(asset.id, assetUpload.url);
        } catch (assetErr) {
          console.warn(`[DocumentImportService] Asset upload warning for ${asset.fileName}:`, assetErr.message);
        }
      }
    }

    // 4. Convert Document IR into authoritative Tiptap JSON schema
    const { tiptapJson, contentHtml, plainText } = this.tiptapConverter.convert(ir, assetUrlMap);

    const now = new Date().toISOString();
    const ownerId = userProfile?.uid || 'guest-user';
    const ownerName = userProfile?.fullName || userProfile?.first_name || 'Researcher';
    const ownerRole = userProfile?.role || 'student';
    const groupId = groupInfo?.id || userProfile?.groupId || '';
    const groupName = groupInfo?.name || (groupId ? `Group ${groupId}` : '');

    // 5. Construct Firestore Document Schema
    const newDocumentRecord = {
      id: documentId,
      title: ir.metadata.title || cleanFileName.replace(/\.[^/.]+$/, ''),
      fileName: cleanFileName,
      ownerId,
      ownerName,
      ownerRole,
      groupId,
      groupName,
      projectId: '',
      content: tiptapJson,
      contentHtml,
      plainText,
      sourceType: ext,
      originalFile: {
        storageProvider: originalUpload.storageProvider,
        storageKey: originalUpload.storageKey,
        fileName: cleanFileName,
        mimeType: mimeType || 'application/octet-stream',
        size: fileSize || fileBuffer.length,
        url: originalUpload.url,
      },
      editorSettings: {
        fontFamily: 'Inter',
        fontSize: '11pt',
        lineSpacing: '1.5',
        page: ir.pageSettings,
      },
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      updatedBy: ownerId,
      collaboratorCount: 1,
      isEditorDraft: true,
      importStatus: 'completed',
      importVersion: '1.0.0',
    };

    // 6. Save to MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        // Need to import MongoDocument at the top of the file
        // For now, let's dynamically import or use the model
        const MongoDocument = mongoose.model('Document');
        
        await MongoDocument.create({
          id: documentId,
          title: newDocumentRecord.title,
          abstract: '', // Default abstract
          status: 'draft',
          authors: [ownerId],
          adviser: null,
          plainText: newDocumentRecord.plainText,
          // We won't save yjsBinaryState here yet, as the initial import doesn't produce binary state
          // The client will load the Tiptap JSON and push the binary state via Hocuspocus
        });
        
        // Also save original file metadata into the document (requires schema update if needed)
      } else {
        throw new Error('MongoDB not connected');
      }
    } catch (mongoErr) {
      console.warn('[DocumentImportService] MongoDB write error:', mongoErr.message);
      throw mongoErr;
    }

    return newDocumentRecord;
  }
}

export const documentImportService = new DocumentImportService();
export default documentImportService;
