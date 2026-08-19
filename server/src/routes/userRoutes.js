import express from 'express';
import { getAllUsers, updateUserRole, updateUserProfile, updateMyProfile, changeMyPassword } from '../controllers/userController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Current authenticated user profile and password management
router.put('/me', verifyToken, updateMyProfile);
router.patch('/me', verifyToken, updateMyProfile);
router.post('/me/password', verifyToken, changeMyPassword);

// Admin-only user directory and role modification
router.get('/', verifyToken, requireRole(['admin']), getAllUsers);
router.patch('/:uid/role', verifyToken, requireRole(['admin']), updateUserRole);
router.patch('/:uid', verifyToken, requireRole(['admin']), updateUserProfile);

export default router;
