import express from 'express';
import { getProjects, createProject, assignAdviser } from '../controllers/projectController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get research projects list (filtered by user role)
router.get('/', verifyToken, getProjects);

// Create project (Admin only)
router.post('/', verifyToken, requireRole(['admin']), createProject);

// Assign Adviser to project (Admin only)
router.patch('/:id/adviser', verifyToken, requireRole(['admin']), assignAdviser);

export default router;
