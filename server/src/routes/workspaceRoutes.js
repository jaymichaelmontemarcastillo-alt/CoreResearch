import express from 'express';
import {
  getWorkspace,
  getWorkspacesByAdviser,
  createTask,
  updateTask,
  createFeedback,
  updateFeedbackStatus,
} from '../controllers/workspaceController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Workspace fetch
router.get('/:id', verifyToken, getWorkspace);
router.get('/adviser/:adviserId', verifyToken, getWorkspacesByAdviser);

// Task Management
router.post('/tasks', verifyToken, requireRole(['adviser', 'admin', 'research_coordinator']), createTask);
router.put('/tasks/:id', verifyToken, updateTask);

// Advisory Feedback
router.post('/feedback', verifyToken, requireRole(['adviser', 'panelist', 'research_coordinator', 'admin']), createFeedback);
router.patch('/feedback/:id/status', verifyToken, updateFeedbackStatus);

export default router;
