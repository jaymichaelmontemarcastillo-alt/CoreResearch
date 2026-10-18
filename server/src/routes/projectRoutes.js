import express from 'express';
import { getProjects, createProject, assignAdviser } from '../controllers/projectController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get research projects list (filtered by user role)
router.get('/', verifyToken, getProjects);

// Create project (Admin & Research Coordinator)
router.post('/', verifyToken, requireRole(['admin', 'research_coordinator']), createProject);

// Assign Adviser to project (Admin & Research Coordinator)
router.patch('/:id/adviser', verifyToken, requireRole(['admin', 'research_coordinator']), assignAdviser);

export default router;
