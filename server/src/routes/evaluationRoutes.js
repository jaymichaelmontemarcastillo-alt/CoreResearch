import express from 'express';
import {
  submitEvaluation,
  getEvaluations,
  getActiveRubric,
  getRubrics,
  saveRubric
} from '../controllers/evaluationController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rubric configuration endpoints (Must be declared before :projectId parameter)
router.get('/rubrics/active', verifyToken, getActiveRubric);
router.get('/rubrics', verifyToken, requireRole(['admin', 'research_coordinator']), getRubrics);
router.post('/rubrics', verifyToken, requireRole(['admin', 'research_coordinator']), saveRubric);

// Panelist submit digital rubric evaluation
router.post('/', verifyToken, requireRole(['panelist', 'admin', 'research_coordinator']), submitEvaluation);

// Get evaluations & composite grade summary for a project
router.get('/project/:projectId', verifyToken, getEvaluations);
router.get('/:projectId', verifyToken, getEvaluations);

export default router;
