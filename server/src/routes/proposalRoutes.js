import express from 'express';
import { 
  createProposal, 
  getProposals, 
  getProposalById, 
  updateProposal,
  submitExistingProposal,
  deleteProposal,
  updateProposalStatus 
} from '../controllers/proposalController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get list of proposals (accessible to authenticated users, filtered by role)
router.get('/', verifyToken, getProposals);

// Get single proposal details
router.get('/:id', verifyToken, getProposalById);

// Create proposal draft or submit (Student only)
router.post('/', verifyToken, requireRole(['student']), createProposal);

// Update existing proposal draft / revisions (Student only)
router.put('/:id', verifyToken, requireRole(['student']), updateProposal);

// Submit existing draft to review queue (Student only)
router.post('/:id/submit', verifyToken, requireRole(['student']), submitExistingProposal);

// Delete draft proposal (Student only)
router.delete('/:id', verifyToken, requireRole(['student']), deleteProposal);

// Review proposal decision & feedback (Coordinator, Adviser, Admin)
router.patch('/:id/status', verifyToken, requireRole(['research_coordinator', 'adviser', 'admin']), updateProposalStatus);

export default router;
