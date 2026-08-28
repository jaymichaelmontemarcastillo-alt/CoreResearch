// server/src/controllers/documentController.js
import fs from 'fs';
import path from 'path';
import { documentImportService } from '../services/import/DocumentImportService.js';
import { getStorageProvider, localStorageProvider } from '../services/storage/storageManager.js';

export const importDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_DOCX',
        error: 'Bad Request',
        message: 'No file uploaded. Please select a .docx or .pdf file.',
      });
    }

    const file = req.file;
    const userProfile = req.user || {
      uid: req.headers['x-user-id'] || 'guest-user',
      fullName: req.headers['x-user-name'] || 'Researcher',
      role: req.headers['x-user-role'] || 'student',
      groupId: req.headers['x-group-id'] || '',
    };

    let groupInfo = null;
    if (req.body?.groupInfo) {
      try {
        groupInfo = typeof req.body.groupInfo === 'string' ? JSON.parse(req.body.groupInfo) : req.body.groupInfo;
      } catch (e) {
        // ignore
      }
    }

    const documentRecord = await documentImportService.importDocument({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      userProfile,
      groupInfo,
    });

    return res.status(201).json({
      success: true,
      message: 'Document imported and structured successfully.',
      document: documentRecord,
    });
  } catch (error) {
    console.error('[documentController] Import error:', error);
    
    // Attempt to map error messages to Phase 2 error codes
    let errorCode = 'DOCX_CONVERSION_FAILED';
    if (error.message.includes('Unsupported document format')) errorCode = 'UNSUPPORTED_FILE_TYPE';
    if (error.message.includes('No file data')) errorCode = 'INVALID_DOCX';
    if (error.message.includes('File too large')) errorCode = 'FILE_TOO_LARGE'; // Assuming multer handles this before reaching here usually
    if (error.message.includes('Sanitization failed')) errorCode = 'SANITIZATION_FAILED';
    if (error.message.includes('Tiptap conversion failed')) errorCode = 'TIPTAP_CONVERSION_FAILED';

    return res.status(500).json({
      success: false,
      errorCode,
      error: 'Import Failed',
      message: error.message || 'An error occurred while importing the document.',
    });
  }
};

export const serveStorageAsset = async (req, res) => {
  try {
    const rawPath = decodeURIComponent(req.params[0] || '');
    // Normalize path but ensure we use forward slashes for MongoDB GridFS match
    let cleanKey = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    cleanKey = cleanKey.replace(/\\/g, '/'); // Crucial fix for Windows
    const storageProvider = getStorageProvider();

    // Determine Content-Type
    const ext = path.extname(cleanKey).toLowerCase();
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const stream = await storageProvider.downloadStream(cleanKey);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Asset '${cleanKey}' does not exist.`,
      });
    }

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    stream.pipe(res);
  } catch (err) {
    console.error('[documentController] Serve asset error:', err);
    res.status(500).json({ success: false, message: 'Failed to serve asset.' });
  }
};

export default {
  importDocument,
  serveStorageAsset,
};
