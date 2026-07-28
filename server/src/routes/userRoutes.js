import express from 'express';
import { getAllUsers, updateUserRole } from '../controllers/userController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin-only user directory and role modification
router.get('/', verifyToken, requireRole(['admin']), getAllUsers);
router.patch('/:uid/role', verifyToken, requireRole(['admin']), updateUserRole);

export default router;
