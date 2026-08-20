// src/pages/Documents/services/documentImportService.js
import api from '../../../services/api';
import { clientDocxParser } from '../import/docx/ClientDocxParser';
import { clientPdfParser } from '../import/pdf/ClientPdfParser';
import { clientDocumentIRToTiptap } from '../import/tiptap/documentIRToTiptap';
import { documentService } from './documentService';

export const documentImportService = {
  /**
   * Import DOCX / PDF with full high-fidelity text, structure, tables, and pages
   * @param {File} file - Selected .docx or .pdf
   * @param {Object} userProfile - Current user profile
   * @param {Object} groupInfo - Optional research group
   * @param {Function} onProgress - Progress callback (0 - 100)
   * @returns {Promise<Object>} Created document record
   */
  importDocument: async ({
    file,
    userProfile = null,
    groupInfo = null,
    onProgress = () => {},
  }) => {
    if (!file) {
      throw new Error('No file provided for import.');
    }

    console.log('[IMPORT] File received:', file.name);
    console.log('[IMPORT] File type:', file.type);
    console.log('[IMPORT] File size:', file.size, 'bytes');

    onProgress(15);

    // 1. Attempt Backend API import first if available
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (groupInfo) {
        formData.append('groupInfo', JSON.stringify(groupInfo));
      }

      const response = await api.post('/documents/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': userProfile?.uid || 'guest-user',
          'x-user-name': userProfile?.fullName || userProfile?.first_name || 'Researcher',
          'x-user-role': userProfile?.role || 'student',
          'x-group-id': groupInfo?.id || '',
        },
        timeout: 5000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total > 0) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(Math.min(percentCompleted, 90));
          }
        },
      });

      if (response.data?.document) {
        console.log('[IMPORT] Backend import successful for:', response.data.document.id);
        onProgress(100);
        return response.data.document;
      }
    } catch (apiError) {
      console.log('[IMPORT] Backend endpoint unreachable, running in-browser high-fidelity parser:', apiError.message);
    }

    // 2. Client-Side High-Fidelity Import (Full PDF/DOCX Parsing into DocumentIR -> Tiptap JSON -> Firestore)
    return await documentImportService.parseAndCreateDocument({
      file,
      userProfile,
      groupInfo,
      onProgress,
    });
  },

  /**
   * Parse File into DocumentIR, convert to Tiptap JSON, and save directly to Firestore
   */
  parseAndCreateDocument: async ({ file, userProfile, groupInfo, onProgress }) => {
    onProgress(30);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Parse File into canonical DocumentIR
    let ir;
    if (ext === 'pdf') {
      onProgress(45);
      ir = await clientPdfParser.parse(file, file.name);
      console.log('[PDF PARSER] Page count:', ir.metadata?.pageCount);
    } else if (ext === 'docx') {
      onProgress(45);
      ir = await clientDocxParser.parse(file, file.name);
      console.log('[DOCX PARSER] Document parsed successfully');
    } else {
      throw new Error(`Unsupported document format '.${ext}'. Supported formats are .docx and .pdf`);
    }

    console.log('[DOCUMENT IR] Block count:', ir.nodes?.length);

    onProgress(70);

    // 2. Convert DocumentIR into Tiptap ProseMirror JSON
    const { tiptapJson, contentHtml, plainText } = clientDocumentIRToTiptap.convert(ir);

    console.log('[TIPTAP] Node count:', tiptapJson.content?.length);
    console.log('[TIPTAP] Text character length:', plainText.length);

    // Validate that document actually contains text (scanned PDF check)
    if (!plainText || plainText.trim().length === 0) {
      throw new Error('This document contains no selectable text characters. Scanned image PDFs require OCR.');
    }

    onProgress(85);

    // 3. Save directly to Firestore with complete Tiptap JSON content & page settings
    const newDoc = await documentService.createImportedDocument({
      id: docId,
      title: ir.metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      sourceType: ext,
      content: tiptapJson,
      contentHtml,
      plainText,
      pageSettings: ir.pageSettings,
      fileSize: file.size,
      contentType: file.type,
      userProfile,
      groupInfo,
    });

    console.log('[FIRESTORE] Document ID:', newDoc.id);
    console.log('[FIRESTORE] Content exists:', Boolean(newDoc.content));
    console.log('[FIRESTORE] Text length:', newDoc.plainText?.length);

    onProgress(100);
    return newDoc;
  },
};

export default documentImportService;
