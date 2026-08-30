import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { documentImportService } from '../services/import/DocumentImportService.js';
import { getStorageProvider, localStorageProvider } from '../services/storage/storageManager.js';

export const importDocument = async (req, res) => {
  try {
    console.log(`\n\n========================================`);
    console.log(`[Import] Received DOCX import request!`);
    console.log(`[Import] Headers Origin:`, req.headers.origin);
    
    if (!req.file) {
      console.log(`[Import] FAILED: No file uploaded.`);
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_DOCX',
        error: 'Bad Request',
        message: 'No file uploaded. Please select a .docx or .pdf file.',
      });
    }

    console.log(`[Import] File accepted: ${req.file.originalname} (${req.file.size} bytes)`);

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
        console.warn(`[Import] Failed to parse groupInfo:`, e.message);
      }
    }

    console.log(`[Import] Starting DocumentImportService for ${file.originalname}...`);
    const startTime = Date.now();

    const documentRecord = await documentImportService.importDocument({
      filePath: file.path,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      userProfile,
      groupInfo,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[Import] DocumentImportService COMPLETED in ${elapsed}ms.`);
    console.log(`[Import] Generated Document ID: ${documentRecord.id}`);

    // Clean up temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
      console.log(`[Import] Cleaned up temp file: ${file.path}`);
    }

    console.log(`[Import] Sending SUCCESS response (201).`);
    console.log(`========================================\n\n`);
    return res.status(201).json({
      success: true,
      message: 'Document imported and structured successfully.',
      document: documentRecord,
    });
  } catch (error) {
    console.error('\n\n========================================');
    console.error('[documentController] Import error CAUGHT:');
    console.error(error);
    console.error('========================================\n\n');
    
    // Attempt to map error messages to Phase 2 error codes
    let errorCode = 'DOCX_CONVERSION_FAILED';
    if (error.message.includes('Unsupported document format')) errorCode = 'UNSUPPORTED_FILE_TYPE';
    if (error.message.includes('No file data') || error.message.includes('No file path')) errorCode = 'INVALID_DOCX';
    if (error.message.includes('File too large')) errorCode = 'FILE_TOO_LARGE'; // Assuming multer handles this before reaching here usually
    if (error.message.includes('Sanitization failed')) errorCode = 'SANITIZATION_FAILED';
    if (error.message.includes('Tiptap conversion failed')) errorCode = 'TIPTAP_CONVERSION_FAILED';

    // Clean up temp file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }

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

export const updatePageSettings = async (req, res) => {
  try {
    const documentId = req.params.id;
    const { pageSettings } = req.body;

    if (!documentId || !pageSettings) {
      return res.status(400).json({ success: false, message: 'Missing documentId or pageSettings' });
    }

    const DocumentModel = mongoose.model('Document');
    
    // Find the document and update pageSettings
    const updatedDoc = await DocumentModel.findOneAndUpdate(
      { id: documentId },
      { $set: { pageSettings: pageSettings } },
      { new: true } // Return updated doc
    );

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Page settings updated successfully.',
      pageSettings: updatedDoc.pageSettings,
    });
  } catch (error) {
    console.error('[documentController] updatePageSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update page settings' });
  }
};

export const getPageSettings = async (req, res) => {
  try {
    const documentId = req.params.id;

    if (!documentId) {
      return res.status(400).json({ success: false, message: 'Missing documentId' });
    }

    const DocumentModel = mongoose.model('Document');
    const doc = await DocumentModel.findOne({ id: documentId }).lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Return pageSettings from MongoDB (authoritative source of truth)
    // Also return widthMm/heightMm from the import metadata if available
    const pageSettings = doc.pageSettings || {};
    
    // Check if widthMm/heightMm were stored in the flat metadata during import
    if (!pageSettings.widthMm && doc.widthMm) {
      pageSettings.widthMm = doc.widthMm;
    }
    if (!pageSettings.heightMm && doc.heightMm) {
      pageSettings.heightMm = doc.heightMm;
    }

    return res.status(200).json({
      success: true,
      pageSettings,
    });
  } catch (error) {
    console.error('[documentController] getPageSettings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch page settings' });
  }
};

export default {
  importDocument,
  serveStorageAsset,
  updatePageSettings,
  getPageSettings,
};

