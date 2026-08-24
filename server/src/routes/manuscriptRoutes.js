import express from 'express';
import { 
  uploadManuscriptVersion, 
  getManuscriptVersions, 
  updateManuscriptStatus,
  getAdvisories,
  getManuscriptDraft,
  saveManuscriptDraft,
  getManuscriptComments,
  addManuscriptComment,
  updateManuscriptComment
} from '../controllers/manuscriptController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get list of advisories for Adviser
router.get('/advisories/all', verifyToken, requireRole(['adviser', 'admin']), getAdvisories);

// Get manuscript live draft for a project
router.get('/draft/:projectId', verifyToken, getManuscriptDraft);

// Save / auto-save manuscript live draft
router.put('/draft/:projectId', verifyToken, saveManuscriptDraft);

// Get inline comments / feedback for a project
router.get('/comments/:projectId', verifyToken, getManuscriptComments);

// Add inline comment / feedback
router.post('/comments/:projectId', verifyToken, addManuscriptComment);

// Resolve / reply to a comment
router.patch('/comments/:projectId/:commentId', verifyToken, updateManuscriptComment);

// Get manuscript versions for a project
router.get('/:projectId', verifyToken, getManuscriptVersions);

// Upload manuscript version (Student & Adviser)
router.post('/', verifyToken, requireRole(['student', 'adviser', 'admin']), uploadManuscriptVersion);

// Update manuscript version status (Adviser & Admin)
router.patch('/:id/status', verifyToken, requireRole(['adviser', 'admin']), updateManuscriptStatus);

export default router;
