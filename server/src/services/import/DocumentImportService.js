// server/src/services/import/DocumentImportService.js
import { DocxParser } from './docx/DocxParser.js';
import { PdfParser } from './pdf/PdfParser.js';
import { DocumentIRToTiptap } from './tiptap/documentIRToTiptap.js';
import { getStorageProvider } from '../storage/storageManager.js';
import { db, isDevMockMode, mockFirestoreDb } from '../../config/firebaseAdmin.js';

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

    // 6. Save to Firestore
    if (isDevMockMode) {
      if (!mockFirestoreDb.has('documents')) {
        mockFirestoreDb.set('documents', new Map());
      }
      mockFirestoreDb.get('documents').set(documentId, newDocumentRecord);
    } else if (db) {
      try {
        await db.collection('documents').doc(documentId).set(newDocumentRecord);
      } catch (dbErr) {
        console.warn('[DocumentImportService] Firestore write fallback:', dbErr.message);
        if (!mockFirestoreDb.has('documents')) {
          mockFirestoreDb.set('documents', new Map());
        }
        mockFirestoreDb.get('documents').set(documentId, newDocumentRecord);
      }
    }

    return newDocumentRecord;
  }
}

export const documentImportService = new DocumentImportService();
export default documentImportService;
