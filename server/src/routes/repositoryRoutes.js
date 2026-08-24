import express from 'express';
import { publishToRepository, getRepositoryPublications } from '../controllers/repositoryController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Search & Browse Public Research Repository (Public/Authenticated)
router.get('/', getRepositoryPublications);

// Publish approved paper to repository (Admin only)
router.post('/publish', verifyToken, requireRole(['admin']), publishToRepository);

export default router;
