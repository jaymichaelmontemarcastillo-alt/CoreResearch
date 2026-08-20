// server/src/routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
import { importDocument, serveStorageAsset } from '../controllers/documentController.js';

const router = express.Router();

// Memory storage for fast processing without temp files on disk
const upload = multer({
  storage: multer.memoryStorage(),
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
router.post('/import', upload.single('file'), importDocument);

// Storage Asset Access Endpoint: GET /api/storage/assets/*
router.get('/assets/*', serveStorageAsset);

export default router;
