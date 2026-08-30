// server/src/services/import/DocumentImportService.js
import { DocxParser } from './docx/DocxParser.js';
import { LibreOfficeParser } from './docx/LibreOfficeParser.js';
import { PdfParser } from './pdf/PdfParser.js';
import { DocumentIRToTiptap, getTiptapExtensions } from './tiptap/documentIRToTiptap.js';
import { getStorageProvider } from '../storage/storageManager.js';
import mongoose from 'mongoose';
import { TiptapTransformer } from '@hocuspocus/transformer';
import * as Y from 'yjs';

export class DocumentImportService {
  constructor() {
    this.docxParser = new DocxParser();
    this.libreOfficeParser = new LibreOfficeParser();
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

    let parseResult;
    let parserName = '';

    // 1. Parse document to HTML and extract assets
    if (ext === 'docx') {
      if (process.env.USE_LIBREOFFICE_IMPORT === 'true') {
        parserName = 'libreoffice';
        parseResult = await this.libreOfficeParser.parse(fileBuffer, fileName);
      } else {
        parserName = 'mammoth';
        parseResult = await this.docxParser.parse(fileBuffer, fileName);
      }
    } else if (ext === 'pdf') {
      parserName = 'pdf-parser';
      parseResult = await this.pdfParser.parse(fileBuffer, fileName);
    } else {
      throw new Error(`Unsupported document format '.${ext}'. Supported formats are .docx and .pdf`);
    }

    // 2. Upload original source file to persistent object storage (GridFS)
    const originalFileKey = `documents/${documentId}/original/${cleanFileName}`;
    const originalUpload = await storageProvider.upload(
      originalFileKey,
      fileBuffer,
      mimeType || 'application/octet-stream',
      { documentId, uploadedBy: userProfile?.uid || 'user' }
    );

    // 3. Upload extracted image assets to persistent storage (GridFS)
    const assetUrlMap = new Map();
    if (Array.isArray(parseResult.assets) && parseResult.assets.length > 0) {
      for (const asset of parseResult.assets) {
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

    // 4. Convert to authoritative Tiptap JSON schema
    const { tiptapJson, contentHtml, plainText } = this.tiptapConverter.convert(parseResult, assetUrlMap);

    if (!tiptapJson || !tiptapJson.content || tiptapJson.content.length === 0) {
      throw new Error('Tiptap conversion failed: Generated document is empty.');
    }

    const now = new Date().toISOString();
    const ownerId = userProfile?.uid || 'guest-user';
    
    // 5. Build authoritative document persistence schema for MongoDB
    const warnings = parseResult.metadata?.warnings || [];
    const unsupportedElements = [...new Set(warnings.map(w => {
      const msg = w.message || '';
      if (msg.includes('m:oMath')) return 'Equations (OMML)';
      if (msg.includes('w:drawing')) return 'Floating Shapes/WordArt';
      if (msg.includes('w:pict')) return 'VML Shapes';
      if (msg.includes('w:footnote') || msg.includes('w:endnote')) return 'Footnotes/Endnotes';
      if (msg.includes('w:hdr') || msg.includes('w:ftr')) return 'Headers/Footers';
      if (msg.includes('w:txbxContent')) return 'Text Boxes';
      if (msg.includes('unrecognised element')) return 'Unsupported XML Elements';
      return null;
    }).filter(Boolean))];

    const documentMetadata = {
      sourceFormat: ext,
      importMethod: parserName,
      importStatus: 'completed',
      sourceDocument: {
        filename: cleanFileName,
        mimeType: mimeType || 'application/octet-stream',
        size: fileSize || fileBuffer.length,
        url: originalUpload.url,
        storageKey: originalFileKey
      },
      content: {
        tiptap: tiptapJson,
        plainText,
        html: contentHtml
      },
      conversion: {
        parser: parserName,
        warnings: warnings,
        unsupportedElements: unsupportedElements,
        features: {
          tables: "supported",
          images: "supported",
          captions: "supported",
          equations: unsupportedElements.includes('Equations (OMML)') ? "unsupported" : "not present",
          pageBreaks: "supported"
        }
      },
      ...(parseResult.metadata?.pageSettings ? { pageSettings: parseResult.metadata.pageSettings } : {})
    };

    // Generate deterministic Yjs state so Hocuspocus initializes correctly
    let yjsBinaryState = null;
    try {
      const ydoc = TiptapTransformer.toYdoc(tiptapJson, 'default', getTiptapExtensions());
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      yjsBinaryState = Buffer.from(stateUpdate);
    } catch (transformerErr) {
      console.error('[DocumentImportService] Failed to generate Yjs binary state:', transformerErr);
      throw new Error('Document processing failed during Yjs generation.');
    }

    // 6. Save directly to MongoDB as the application source of truth
    try {
      const MongoDocument = mongoose.model('Document');
      
      await MongoDocument.create({
        id: documentId,
        title: parseResult.metadata?.title || cleanFileName.replace(/\.[^/.]+$/, ''),
        abstract: '', 
        status: 'draft',
        authors: [ownerId],
        adviser: null,
        plainText: plainText,
        yjsBinaryState, // Prevent race condition when Hocuspocus connects!
        // Extra structured metadata per Persistence Requirement
        ...documentMetadata
      });
    } catch (mongoErr) {
      console.warn('[DocumentImportService] MongoDB write error:', mongoErr.message);
      throw mongoErr;
    }

    // Return the structure expected by the client API response
    return {
      id: documentId,
      title: parseResult.metadata?.title || cleanFileName.replace(/\.[^/.]+$/, ''),
      content: tiptapJson,
      ...documentMetadata
    };
  }
}

export const documentImportService = new DocumentImportService();
export default documentImportService;
