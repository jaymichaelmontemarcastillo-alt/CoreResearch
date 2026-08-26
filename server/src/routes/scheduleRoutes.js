import express from 'express';
import { 
  createSchedule, 
  getSchedules, 
  updateScheduleStatus,
  updateSchedule,
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

// Update full schedule details (Admin only)
router.put('/:id', verifyToken, requireRole(['admin']), updateSchedule);

// Update status (Admin & Adviser)
router.patch('/:id/status', verifyToken, requireRole(['admin', 'adviser']), updateScheduleStatus);

export default router;
