import express from 'express';
import multer from 'multer';
import { 
  uploadDocument, 
  getMyDocuments, 
  getAllDocuments,
  getAdviserDocuments,
  deleteDocument, 
  reprocessDocument 
} from '../controllers/adviserResearchController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read routes for published research works (available for directory & repository)
router.get('/all', getAllDocuments);
router.get('/adviser/:adviserId', getAdviserDocuments);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const isDoc = ext === 'pdf' || ext === 'docx' || ext === 'doc';
    const isMime = file.mimetype?.includes('pdf') || file.mimetype?.includes('word') || file.mimetype === 'application/octet-stream';
    if (isDoc || isMime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

// Protected routes (adviser management)
router.use(verifyToken);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/me', getMyDocuments);
router.post('/:documentId/reprocess', reprocessDocument);
router.delete('/:documentId', deleteDocument);

export default router;
