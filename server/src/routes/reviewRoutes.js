import express from 'express';
import { 
  addReviewComment, 
  getReviewComments, 
  updateReviewStatus 
} from '../controllers/reviewController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get review comments list
router.get('/:manuscriptId', verifyToken, getReviewComments);

// Add review comment (Adviser, Panelist, Admin)
router.post('/', verifyToken, requireRole(['adviser', 'panelist', 'admin']), addReviewComment);

// Respond to review or update status (Student, Adviser, Admin)
router.patch('/:id/status', verifyToken, updateReviewStatus);

export default router;
