// server/src/controllers/documentController.js
import fs from 'fs';
import path from 'path';
import { documentImportService } from '../services/import/DocumentImportService.js';
import { localStorageProvider } from '../services/storage/storageManager.js';

export const importDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
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
    return res.status(500).json({
      success: false,
      error: 'Import Failed',
      message: error.message || 'An error occurred while importing the document.',
    });
  }
};

export const serveStorageAsset = (req, res) => {
  try {
    const rawPath = req.params[0] || '';
    const cleanKey = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = localStorageProvider.getFilePath(cleanKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Asset '${cleanKey}' does not exist.`,
      });
    }

    // Determine Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = fs.createReadStream(filePath);
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
