// src/pages/Documents/services/documentImportService.js
import { documentImportService as isolatedImportService } from '../import/DocumentImportService';

export const documentImportService = {
  /**
   * Import DOCX / PDF with full high-fidelity text, structure, tables, images, and pages
   * @param {Object} params
   * @param {File} params.file - Selected .docx or .pdf
   * @param {Object} params.userProfile - Current user profile
   * @param {Object} params.groupInfo - Optional research group
   * @param {Function} params.onProgress - Progress callback (0 - 100)
   * @returns {Promise<Object>} Created document record
   */
  importDocument: async ({
    file,
    userProfile = null,
    groupInfo = null,
    onProgress = () => {},
  }) => {
    return isolatedImportService.importDocument({
      file,
      userProfile,
      groupInfo,
      onProgress,
    });
  },
};

export default documentImportService;
