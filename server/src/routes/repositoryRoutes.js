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
import { repositorySmartSearch } from '../controllers/repositorySmartSearchController.js';
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

// Smart Search: Semantic relevance ranking for repository publications
router.post('/smart-search', optionalVerifyToken, repositorySmartSearch);

// Publish approved paper to repository (Admin, Research Coordinator, and Student)
router.post('/publish', verifyToken, requireRole(['admin', 'research_coordinator', 'student']), handlePdfUpload, publishToRepository);

// Approve repository publication (Admin & Research Coordinator)
router.patch('/:id/approve', verifyToken, requireRole(['admin', 'research_coordinator']), approveRepositoryPublication);

// Reject repository publication (Admin & Research Coordinator)
router.patch('/:id/reject', verifyToken, requireRole(['admin', 'research_coordinator']), rejectRepositoryPublication);

// Update repository publication department (Admin & Research Coordinator)
router.put('/:id', verifyToken, requireRole(['admin', 'research_coordinator']), updateRepositoryPublication);

// Delete repository publication (Admin & Research Coordinator)
router.delete('/:id', verifyToken, requireRole(['admin', 'research_coordinator']), deleteRepositoryPublication);

export default router;
