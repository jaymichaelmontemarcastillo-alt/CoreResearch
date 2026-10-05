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
  updateManuscriptComment,
  getAllAdminManuscripts,
  adminUpdateManuscript,
  updateManuscriptGrade,
  toggleArchiveManuscript,
  toggleBestThesis,
  addManuscriptFeedback,
  publishManuscriptToRepository
} from '../controllers/manuscriptController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin: Get all manuscripts across all stages
router.get('/admin/all', verifyToken, requireRole(['admin', 'research_coordinator']), getAllAdminManuscripts);

// Admin: Update manuscript metadata & status
router.patch('/:id/admin-update', verifyToken, requireRole(['admin', 'research_coordinator']), adminUpdateManuscript);

// Admin / Faculty: Edit or submit manuscript grade
router.patch('/:id/grade', verifyToken, requireRole(['admin', 'research_coordinator', 'panelist']), updateManuscriptGrade);

// Admin: Archive or restore manuscript
router.patch('/:id/archive', verifyToken, requireRole(['admin', 'research_coordinator']), toggleArchiveManuscript);

// Admin: Select / toggle Best Thesis
router.patch('/:id/best-thesis', verifyToken, requireRole(['admin', 'research_coordinator']), toggleBestThesis);

// Admin / Faculty: Add feedback / comments to manuscript
router.post('/:id/feedback', verifyToken, requireRole(['admin', 'research_coordinator', 'adviser', 'panelist']), addManuscriptFeedback);

// Admin: Publish manuscript to Institutional Repository
router.post('/:id/publish-repository', verifyToken, requireRole(['admin', 'research_coordinator']), publishManuscriptToRepository);

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
