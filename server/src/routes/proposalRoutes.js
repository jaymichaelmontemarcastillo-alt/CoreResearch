import express from 'express';
import { 
  createProposal, 
  getProposals, 
  getProposalById, 
  updateProposalStatus 
} from '../controllers/proposalController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get list of proposals (accessible to authenticated users)
router.get('/', verifyToken, getProposals);

// Get single proposal details
router.get('/:id', verifyToken, getProposalById);

// Submit proposal (Student only)
router.post('/', verifyToken, requireRole(['student']), createProposal);

// Review proposal decision (Adviser & Admin only)
router.patch('/:id/status', verifyToken, requireRole(['adviser', 'admin']), updateProposalStatus);

export default router;
