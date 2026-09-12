import express from 'express';
import multer from 'multer';
import { uploadDocument, getMyDocuments, deleteDocument, reprocessDocument } from '../controllers/adviserResearchController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

// All routes require authentication
router.use(verifyToken);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/me', getMyDocuments);
router.post('/:documentId/reprocess', reprocessDocument);
router.delete('/:documentId', deleteDocument);

export default router;
