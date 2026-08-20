// src/pages/Documents/import/pdf/PdfImportPipeline.js
import { pdfParser } from './PdfParser';
import { documentUploadService } from '../../services/documentUploadService';

/**
 * Coordinated PDF import pipeline:
 * 1. Uploads original source PDF file to Firebase Storage
 * 2. Parses layout, fonts, text blocks, images, and tables into DocumentIR
 * 3. Returns canonical DocumentIR & storage references
 */
export class PdfImportPipeline {
  /**
   * Execute full PDF pipeline
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
      throw new Error('No PDF file provided to import pipeline.');
    }

    onProgress(35);
    const userId = userProfile?.uid || 'guest-user';

    // 1. Upload original PDF file to persistent storage in background
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
      console.warn('[PdfImportPipeline] Original PDF upload notice:', uploadErr.message);
    }

    onProgress(65);

    // 2. Parse PDF into high-fidelity DocumentIR
    const ir = await pdfParser.parse(file, file.name, documentId, userId);

    onProgress(85);

    return {
      ir,
      originalUpload,
    };
  }
}

export default PdfImportPipeline;
