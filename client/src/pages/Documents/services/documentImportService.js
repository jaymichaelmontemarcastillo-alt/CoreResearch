// src/pages/Documents/services/documentImportService.js
import api from '../../../services/api';

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
    onProgress(10);
    const formData = new FormData();
    formData.append('file', file);
    if (groupInfo) {
      formData.append('groupInfo', JSON.stringify(groupInfo));
    }

    try {
      const response = await api.post('/documents/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': userProfile?.uid || '',
          'x-user-name': userProfile?.fullName || userProfile?.first_name || '',
          'x-user-role': userProfile?.role || 'student',
          'x-group-id': groupInfo?.id || '',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Report actual upload progress. 
            // 100% means upload is finished, but backend is still converting/saving.
            onProgress(percentCompleted);
          }
        },
      });

      return response.data.document;
    } catch (error) {
      console.error('[documentImportService] Failed to import document via API:', error);
      throw new Error(error.response?.data?.message || 'Failed to import document');
    }
  },
};

export default documentImportService;
