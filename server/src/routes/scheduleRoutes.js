import express from 'express';
import { 
  createSchedule, 
  getSchedules, 
  updateScheduleStatus,
  updateSchedule,
  generateSchedulePreview,
  bulkCreateSchedules,
  deleteSchedule
} from '../controllers/scheduleController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get defense schedules (accessible to all authenticated users)
router.get('/', verifyToken, getSchedules);

// Create schedule (Admin & Research Coordinator)
router.post('/', verifyToken, requireRole(['admin', 'research_coordinator']), createSchedule);

// Generate schedule preview (Admin & Research Coordinator)
router.post('/preview', verifyToken, requireRole(['admin', 'research_coordinator']), generateSchedulePreview);

// Bulk create schedules (Admin & Research Coordinator)
router.post('/bulk', verifyToken, requireRole(['admin', 'research_coordinator']), bulkCreateSchedules);

// Update full schedule details (Admin & Research Coordinator)
router.put('/:id', verifyToken, requireRole(['admin', 'research_coordinator']), updateSchedule);

// Update status (Admin, Adviser & Research Coordinator)
router.patch('/:id/status', verifyToken, requireRole(['admin', 'adviser', 'research_coordinator']), updateScheduleStatus);

// Delete schedule (Admin & Research Coordinator)
router.delete('/:id', verifyToken, requireRole(['admin', 'research_coordinator']), deleteSchedule);

export default router;
