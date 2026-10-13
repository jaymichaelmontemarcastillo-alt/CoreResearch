import {
  publishToRepository,
  getRepositoryPublications,
  updateRepositoryPublication,
  deleteRepositoryPublication,
  approveRepositoryPublication,
  rejectRepositoryPublication
} from '../controllers/repositoryController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Search & Browse Public Research Repository (Public/Authenticated)
router.get('/', getRepositoryPublications);

// Publish approved paper to repository (Admin and Student)
router.post('/publish', verifyToken, requireRole(['admin', 'student']), publishToRepository);

// Approve repository publication (Admin & Research Coordinator)
router.patch('/:id/approve', verifyToken, requireRole(['admin', 'research_coordinator']), approveRepositoryPublication);

// Reject repository publication (Admin & Research Coordinator)
router.patch('/:id/reject', verifyToken, requireRole(['admin', 'research_coordinator']), rejectRepositoryPublication);

// Update repository publication department (Admin only)
router.put('/:id', verifyToken, requireRole(['admin']), updateRepositoryPublication);

// Delete repository publication (Admin only)
router.delete('/:id', verifyToken, requireRole(['admin']), deleteRepositoryPublication);

export default router;
