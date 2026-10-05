import express from 'express';
import { publishToRepository, getRepositoryPublications, updateRepositoryPublication, deleteRepositoryPublication } from '../controllers/repositoryController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Search & Browse Public Research Repository (Public/Authenticated)
router.get('/', getRepositoryPublications);

// Publish approved paper to repository (Admin and Student)
router.post('/publish', verifyToken, requireRole(['admin', 'student']), publishToRepository);

// Update repository publication department (Admin only)
router.put('/:id', verifyToken, requireRole(['admin']), updateRepositoryPublication);

// Delete repository publication (Admin only)
router.delete('/:id', verifyToken, requireRole(['admin']), deleteRepositoryPublication);

export default router;
