/**
 * Adviser Matching Routes — CoreResearch Phase 6
 * 
 * Routes:
 *   POST /api/adviser-matching/match   — Run adviser matching for authenticated student
 *   GET  /api/adviser-matching/health  — Check NLP service availability
 */

import express from 'express';
import multer from 'multer';
import { matchAdvisers, extractDocument } from '../controllers/adviserMatchingController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import adviserMatchingService from '../services/adviserMatchingService.js';

const router = express.Router();

// Memory storage for temporary document extraction
const upload = multer({ storage: multer.memoryStorage() });

// Extract metadata from a student's uploaded document
router.post('/extract-document', verifyToken, requireRole(['student']), upload.single('document'), extractDocument);

// Run adviser matching — requires authenticated student
router.post('/match', verifyToken, requireRole(['student']), matchAdvisers);

// NLP service health check — no auth required (for monitoring/debugging)
router.get('/health', async (req, res) => {
  try {
    const status = await adviserMatchingService.checkHealth();
    const httpStatus = status.healthy ? 200 : 503;
    return res.status(httpStatus).json({
      service: 'adviser-matching',
      provider: adviserMatchingService.getProviderName(),
      ...status,
    });
  } catch (error) {
    return res.status(503).json({
      service: 'adviser-matching',
      healthy: false,
      error: error.message,
    });
  }
});

export default router;
