import express from 'express';
import { registerUserSync, loginSync, getCurrentUser, seedDatabaseEndpoint } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public registration & seeding endpoints
router.post('/register', registerUserSync);
router.post('/seed-db', seedDatabaseEndpoint);

// Protected routes requiring authentication
router.post('/login-sync', verifyToken, loginSync);
router.get('/me', verifyToken, getCurrentUser);

export default router;
