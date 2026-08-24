// src/pages/Documents/import/docx/DocxImportPipeline.js
import { docxParser } from './DocxParser';
import { documentUploadService } from '../../services/documentUploadService';

/**
 * Coordinated DOCX import pipeline:
 * 1. Uploads original source file to Firebase Storage
 * 2. Parses OpenXML document with style cascade & extracted images
 * 3. Returns canonical DocumentIR
 */
export class DocxImportPipeline {
  /**
   * Execute full DOCX pipeline
   * @param {Object} params
   * @param {File} params.file
   * @param {string} params.documentId
   * @param {Object} params.userProfile
   * @param {Function} params.onProgress
   * @returns {Promise<{ ir: Object, originalUpload: Object }>}
   */
  static async execute({
    file,
    documentId = `doc-${Date.now()}`,
    userProfile = null,
    onProgress = () => {},
  }) {
    if (!file) {
      throw new Error('No DOCX file provided to import pipeline.');
    }

    onProgress(35);
    const userId = userProfile?.uid || 'guest-user';

    // 1. Upload original DOCX file to persistent storage in background
    let originalUpload = null;
    try {
      originalUpload = await documentUploadService.uploadDocumentFile(
        file,
        documentId,
        userId,
        (uploadPercent) => {
          onProgress(35 + Math.round(uploadPercent * 0.25)); // 35% -> 60%
        }
      );
    } catch (uploadErr) {
      console.warn('[DocxImportPipeline] Original file upload notice:', uploadErr.message);
    }

    onProgress(65);

    // 2. Parse DOCX into high-fidelity DocumentIR
    const ir = await docxParser.parse(file, file.name, documentId, userId);

    onProgress(85);

    return {
      ir,
      originalUpload,
    };
  }
}

export default DocxImportPipeline;
