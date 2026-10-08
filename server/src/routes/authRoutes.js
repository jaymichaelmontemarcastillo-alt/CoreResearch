import express from 'express';
import { registerUserSync, loginSync, getCurrentUser, seedDatabaseEndpoint, checkIdentifierAvailability } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public registration & verification endpoints
router.post('/register', registerUserSync);
router.post('/seed-db', seedDatabaseEndpoint);
router.get('/check-id', checkIdentifierAvailability);
router.get('/check-email', checkIdentifierAvailability);

// Protected routes requiring authentication
router.post('/login-sync', verifyToken, loginSync);
router.get('/me', verifyToken, getCurrentUser);

export default router;
