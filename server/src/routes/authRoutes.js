import express from 'express';
import { registerUserSync, loginSync, getCurrentUser } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public registration sync endpoint
router.post('/register', registerUserSync);

// Protected routes requiring authentication
router.post('/login-sync', verifyToken, loginSync);
router.get('/me', verifyToken, getCurrentUser);

export default router;
