// src/pages/Documents/import/DocumentImportService.js
import { DocxImportPipeline } from './docx/DocxImportPipeline';
import { PdfImportPipeline } from './pdf/PdfImportPipeline';
import { documentIRToTiptap } from './tiptap/documentIRToTiptap';
import { documentService } from '../services/documentService';
import { SupportedFormats } from './DocumentImportTypes';

/**
 * Isolated Document Import Service
 * Handles format detection, pipeline routing (DOCX / PDF), DocumentIR normalization,
 * asset persistence, Tiptap JSON schema generation, and Firestore document initialization.
 */
export class DocumentImportService {
  /**
   * Main entry point to import DOCX or PDF files with high fidelity
   * @param {Object} params
   * @param {File} params.file - Selected .docx or .pdf File
   * @param {Object} params.userProfile - Current user profile
   * @param {Object} params.groupInfo - Optional research group association
   * @param {Function} params.onProgress - Progress callback (0 to 100)
   * @returns {Promise<Object>} Created document record in Firestore
   */
  async importDocument({
    file,
    userProfile = null,
    groupInfo = null,
    onProgress = () => {},
  }) {
    if (!file) {
      throw new Error('No file provided for document import.');
    }

    onProgress(10);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    console.info(`[DocumentImportService] Starting high-fidelity import for: ${file.name} (format: .${ext})`);

    let pipelineResult;

    if (ext === SupportedFormats.DOCX) {
      pipelineResult = await DocxImportPipeline.execute({
        file,
        documentId,
        userProfile,
        onProgress,
      });
    } else if (ext === SupportedFormats.PDF) {
      pipelineResult = await PdfImportPipeline.execute({
        file,
        documentId,
        userProfile,
        onProgress,
      });
    } else {
      throw new Error(`Unsupported document format '.${ext}'. Please upload a valid .docx or .pdf document.`);
    }

    const { ir, originalUpload } = pipelineResult;
    onProgress(88);

    // 2. Convert DocumentIR into canonical Tiptap JSON schema
    const { tiptapJson, contentHtml, plainText } = documentIRToTiptap.convert(ir);

    // 3. Validation
    if (!plainText && (!tiptapJson.content || tiptapJson.content.length === 0)) {
      throw new Error('The document does not contain readable content.');
    }

    onProgress(93);

    // 4. Save to Firestore as an Authoritative Document Draft
    const newDoc = await documentService.createImportedDocument({
      id: documentId,
      title: ir.metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      sourceType: ext,
      content: tiptapJson,
      contentHtml,
      plainText,
      originalFileUrl: originalUpload?.downloadUrl || null,
      storagePath: originalUpload?.fullPath || null,
      pageSettings: ir.pageSettings,
      fileSize: file.size,
      contentType: file.type,
      userProfile,
      groupInfo,
    });

    console.info(`[DocumentImportService] Successfully imported document "${newDoc.title}" (ID: ${newDoc.id})`);
    onProgress(100);

    return newDoc;
  }
}

export const documentImportService = new DocumentImportService();
export default documentImportService;
