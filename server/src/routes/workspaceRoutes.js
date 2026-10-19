import express from 'express';
import {
  getWorkspace,
  getWorkspacesByAdviser,
  createTask,
  updateTask,
  createFeedback,
  updateFeedbackStatus,
  restartWorkspace,
  getAdviserWorkloads,
} from '../controllers/workspaceController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Adviser workloads summary (for directory cards, student pages, admin)
router.get('/adviser-workloads', verifyToken, getAdviserWorkloads);

// Workspace fetch & lifecycle
router.get('/:id', verifyToken, getWorkspace);
router.post('/:id/restart', verifyToken, restartWorkspace);
router.get('/adviser/:adviserId', verifyToken, getWorkspacesByAdviser);

// Task Management
router.post('/tasks', verifyToken, requireRole(['adviser', 'admin', 'research_coordinator']), createTask);
router.put('/tasks/:id', verifyToken, updateTask);

// Advisory Feedback
router.post('/feedback', verifyToken, requireRole(['adviser', 'panelist', 'research_coordinator', 'admin']), createFeedback);
router.patch('/feedback/:id/status', verifyToken, updateFeedbackStatus);

export default router;
