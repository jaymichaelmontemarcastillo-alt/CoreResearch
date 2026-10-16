import path from 'path';
import { documentImportService } from '../services/import/DocumentImportService.js';
import { getStorageProvider, getReadProviders, localStorageProvider } from '../services/storage/storageManager.js';
import { canAccessProject } from '../middleware/resourceAuthorization.js';
import { Document } from '../models/Document.js';

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
    const userProfile = req.user;

    let groupInfo = null;
    if (req.body?.groupInfo) {
      try {
        groupInfo = typeof req.body.groupInfo === 'string' ? JSON.parse(req.body.groupInfo) : req.body.groupInfo;
      } catch {
        return res.status(400).json({ success: false, message: 'groupInfo must be valid JSON.' });
      }
    }

    const existingDocumentId = req.body?.documentId || null;
    if (existingDocumentId) {
      const existingDocument = await Document.findOne({ id: existingDocumentId }).lean();
      if (!existingDocument) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }
      if (!(await canAccessProject(userProfile, existingDocument.id, existingDocument))) {
        return res.status(403).json({ success: false, message: 'You are not authorized to update this document.' });
      }
    }

    const groupId = groupInfo?.groupId || groupInfo?.id;
    if (groupId && !(await canAccessProject(userProfile, groupId))) {
      return res.status(403).json({ success: false, message: 'You are not a member of this research group.' });
    }

    const documentRecord = await documentImportService.importDocument({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      userProfile,
      groupInfo: groupInfo ? { ...groupInfo, groupId } : null,
      existingDocumentId,
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
    let rawPath;
    try {
      rawPath = decodeURIComponent(req.params[0] || '');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid asset path.' });
    }
    const cleanKey = path.posix.normalize(rawPath.replace(/\\/g, '/')).replace(/^(\.\.[\/\\])+/, '');
    if (cleanKey.startsWith('../') || cleanKey === '..' || path.posix.isAbsolute(cleanKey)) {
      return res.status(400).json({ success: false, message: 'Invalid asset path.' });
    }

    const pathParts = cleanKey.split('/');
    if (pathParts[0] === 'documents' && pathParts[1]) {
      const document = await Document.findOne({ id: pathParts[1] }).lean();
      if (document && !(await canAccessProject(req.user, document.id, document))) {
        return res.status(403).json({ success: false, message: 'You are not authorized to access this asset.' });
      }
    }

    // Role-based Access Control: Restrict students from directly accessing/downloading repository manuscripts
    if (cleanKey.startsWith('repository/') || cleanKey.includes('/repository/')) {
      const userRole = req.user?.role || req.headers['x-user-role'];
      if (userRole === 'student') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Restricted: Student access to repository manuscripts is limited to abstracts and metadata only. Full document access requires faculty or administrative authorization.',
        });
      }
    }

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

    let stream = null;
    for (const provider of getReadProviders()) {
      try {
        stream = await provider.downloadStream(cleanKey);
      } catch (e) {
        stream = null;
      }
      if (stream) break;
    }
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Asset '${cleanKey}' does not exist.`,
      });
    }

    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

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
    const allowedSettings = new Set([
      'size',
      'orientation',
      'marginTop',
      'marginBottom',
      'marginLeft',
      'marginRight',
    ]);
    if (
      typeof pageSettings !== 'object' ||
      Array.isArray(pageSettings) ||
      Object.keys(pageSettings).length === 0 ||
      Object.keys(pageSettings).some((key) => !allowedSettings.has(key))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid page settings.' });
    }
    if (
      (pageSettings.size !== undefined && !['letter', 'a4', 'legal'].includes(pageSettings.size)) ||
      (pageSettings.orientation !== undefined && !['portrait', 'landscape'].includes(pageSettings.orientation)) ||
      Object.entries(pageSettings).some(([key, value]) =>
        key.startsWith('margin') && (typeof value !== 'string' || !/^\d+(?:\.\d+)?(?:in|cm|mm|pt)$/.test(value))
      )
    ) {
      return res.status(400).json({ success: false, message: 'Invalid page settings.' });
    }

    const document = await Document.findOne({ id: documentId }).lean();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    if (!(await canAccessProject(req.user, documentId, document))) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this document.' });
    }

    const updatedDoc = await Document.findOneAndUpdate(
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

export default {
  importDocument,
  serveStorageAsset,
  updatePageSettings,
};
