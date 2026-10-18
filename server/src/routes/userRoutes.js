import express from 'express';
import { getAllUsers, updateUserRole, updateUserProfile, updateMyProfile, changeMyPassword, deleteUser, getClassmates } from '../controllers/userController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Current authenticated user profile and password management
router.put('/me', verifyToken, updateMyProfile);
router.patch('/me', verifyToken, updateMyProfile);
router.post('/me/password', verifyToken, changeMyPassword);

// Classmates directory for authenticated student
router.get('/classmates', verifyToken, getClassmates);

// User directory and role modification (Admin & Research Coordinator)
router.get('/', verifyToken, requireRole(['admin', 'research_coordinator']), getAllUsers);
router.patch('/:uid/role', verifyToken, requireRole(['admin', 'research_coordinator']), updateUserRole);
router.patch('/:uid', verifyToken, requireRole(['admin', 'research_coordinator']), updateUserProfile);
router.delete('/:uid', verifyToken, requireRole(['admin', 'research_coordinator']), deleteUser);

export default router;
