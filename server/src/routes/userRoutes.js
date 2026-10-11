import express from 'express';
import { getAllUsers, updateUserRole, updateUserProfile, updateMyProfile, changeMyPassword, deleteUser } from '../controllers/userController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Current authenticated user profile and password management
router.put('/me', verifyToken, updateMyProfile);
router.patch('/me', verifyToken, updateMyProfile);
router.post('/me/password', verifyToken, changeMyPassword);

// User directory (Admin & Research Coordinator) and role modification (Admin only)
router.get('/', verifyToken, requireRole(['admin', 'research_coordinator']), getAllUsers);
router.patch('/:uid/role', verifyToken, requireRole(['admin']), updateUserRole);
router.patch('/:uid', verifyToken, requireRole(['admin']), updateUserProfile);
router.delete('/:uid', verifyToken, requireRole(['admin']), deleteUser);

export default router;
