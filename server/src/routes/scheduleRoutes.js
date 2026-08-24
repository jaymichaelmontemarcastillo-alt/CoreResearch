import express from 'express';
import { 
  createSchedule, 
  getSchedules, 
  updateScheduleStatus 
} from '../controllers/scheduleController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get defense schedules (accessible to all authenticated users)
router.get('/', verifyToken, getSchedules);

// Create schedule (Admin only)
router.post('/', verifyToken, requireRole(['admin']), createSchedule);

// Update status (Admin & Adviser)
router.patch('/:id/status', verifyToken, requireRole(['admin', 'adviser']), updateScheduleStatus);

export default router;
