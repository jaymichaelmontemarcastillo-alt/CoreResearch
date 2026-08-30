// server/src/routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { importDocument, serveStorageAsset, updatePageSettings, getPageSettings } from '../controllers/documentController.js';

const router = express.Router();

// Disk storage for large file processing without blowing up RAM
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      cb(null, `import-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'docx' || ext === 'pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .docx and .pdf files are supported.'));
    }
  },
});

// Document Import Endpoint: POST /api/documents/import
router.post('/import', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, errorCode: 'FILE_TOO_LARGE', message: 'File is too large.' });
      }
      return res.status(400).json({ success: false, errorCode: 'INVALID_DOCX', message: err.message });
    } else if (err) {
      if (err.message.includes('Invalid file type')) {
        return res.status(415).json({ success: false, errorCode: 'UNSUPPORTED_FILE_TYPE', message: err.message });
      }
      return res.status(500).json({ success: false, errorCode: 'DOCX_CONVERSION_FAILED', message: err.message });
    }
    next();
  });
}, importDocument);

// Storage Asset Access Endpoint: GET /api/storage/assets/*
router.get('/assets/*', serveStorageAsset);

// Update Page Settings: PUT /api/documents/:id/page-settings
router.put('/:id/page-settings', express.json(), updatePageSettings);
router.get('/:id/page-settings', getPageSettings);

export default router;
