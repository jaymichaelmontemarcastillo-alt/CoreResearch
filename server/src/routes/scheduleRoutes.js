import express from 'express';
import { 
  createSchedule, 
  getSchedules, 
  updateScheduleStatus,
  generateSchedulePreview,
  bulkCreateSchedules
} from '../controllers/scheduleController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get defense schedules (accessible to all authenticated users)
router.get('/', verifyToken, getSchedules);

// Create schedule (Admin only)
router.post('/', verifyToken, requireRole(['admin']), createSchedule);

// Generate schedule preview (Admin only)
router.post('/preview', verifyToken, requireRole(['admin']), generateSchedulePreview);

// Bulk create schedules (Admin only)
router.post('/bulk', verifyToken, requireRole(['admin']), bulkCreateSchedules);

// Update status (Admin & Adviser)
router.patch('/:id/status', verifyToken, requireRole(['admin', 'adviser']), updateScheduleStatus);

export default router;
