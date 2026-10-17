import express from 'express';
import multer from 'multer';
import {
  publishToRepository,
  getRepositoryPublications,
  updateRepositoryPublication,
  deleteRepositoryPublication,
  approveRepositoryPublication,
  rejectRepositoryPublication
} from '../controllers/repositoryController.js';
import { verifyToken, requireRole, optionalVerifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const MAX_PDF_MB = 50;
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf')) cb(null, true);
    else cb(new Error('Only PDF files are supported.'));
  },
});

const handlePdfUpload = (req, res, next) => {
  pdfUpload.single('pdfFile')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: `PDF exceeds the ${MAX_PDF_MB}MB limit.` });
    }
    return res.status(400).json({ success: false, message: err.message });
  });
};

// Search & Browse Public Research Repository (Public/Authenticated with role-based document access)
router.get('/', optionalVerifyToken, getRepositoryPublications);

// Publish approved paper to repository (Admin and Student)
router.post('/publish', verifyToken, requireRole(['admin', 'student']), handlePdfUpload, publishToRepository);

// Approve repository publication (Admin & Research Coordinator)
router.patch('/:id/approve', verifyToken, requireRole(['admin', 'research_coordinator']), approveRepositoryPublication);

// Reject repository publication (Admin & Research Coordinator)
router.patch('/:id/reject', verifyToken, requireRole(['admin', 'research_coordinator']), rejectRepositoryPublication);

// Update repository publication department (Admin only)
router.put('/:id', verifyToken, requireRole(['admin']), updateRepositoryPublication);

// Delete repository publication (Admin only)
router.delete('/:id', verifyToken, requireRole(['admin']), deleteRepositoryPublication);

export default router;
