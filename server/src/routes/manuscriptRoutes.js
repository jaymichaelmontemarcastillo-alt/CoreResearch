import express from 'express';
import { 
  uploadManuscriptVersion, 
  getManuscriptVersions, 
  updateManuscriptStatus 
} from '../controllers/manuscriptController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get manuscript versions for a project
router.get('/:projectId', verifyToken, getManuscriptVersions);

// Upload manuscript version (Student & Adviser)
router.post('/', verifyToken, requireRole(['student', 'adviser', 'admin']), uploadManuscriptVersion);

// Update manuscript version status (Adviser & Admin)
router.patch('/:id/status', verifyToken, requireRole(['adviser', 'admin']), updateManuscriptStatus);

export default router;
