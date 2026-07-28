import express from 'express';
import { submitEvaluation, getEvaluations } from '../controllers/evaluationController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get evaluations & composite grade summary for a project
router.get('/:projectId', verifyToken, getEvaluations);

// Panelist submit digital rubric evaluation
router.post('/', verifyToken, requireRole(['panelist', 'admin']), submitEvaluation);

export default router;
