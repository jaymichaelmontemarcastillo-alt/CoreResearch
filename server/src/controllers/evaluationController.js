import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Pre-seed mock rubric evaluations if empty
const seedMockEvaluationsIfEmpty = () => {
  if (!mockFirestoreDb.has('evaluations')) {
    const initialEvaluations = [
      {
        id: 'eval-401',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        studentName: 'Alex Rivera',
        panelistId: 'dev-panelist-01',
        panelistName: 'Prof. Marcus Chen',
        scores: {
          presentation: 18, // max 20
          methodology: 27,   // max 30
          results: 26,       // max 30
          manuscriptQuality: 18 // max 20
        },
        totalScore: 89,
        remarks: 'Strong technical delivery. Hardware prototype demonstrated live during defense.',
        submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'eval-402',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        studentName: 'Alex Rivera',
        panelistId: 'dev-panelist-02',
        panelistName: 'Prof. Sofia Gomez',
        scores: {
          presentation: 19,
          methodology: 28,
          results: 28,
          manuscriptQuality: 19
        },
        totalScore: 94,
        remarks: 'Exceptional methodology. Well-structured statistical validation.',
        submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialEvaluations.forEach(e => map.set(e.id, e));
    mockFirestoreDb.set('evaluations', map);
  }
};

/**
 * Submit digital rubric evaluation (Panelist only)
 */
export const submitEvaluation = async (req, res) => {
  try {
    const { projectId, projectTitle, studentName, presentation, methodology, results, manuscriptQuality, remarks } = req.body;
    const user = req.user;

    if (!projectId || presentation === undefined || methodology === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'projectId and score criteria are required.'
      });
    }

    // Server-side Score Computation & Validation
    const presScore = Math.min(20, Math.max(0, Number(presentation) || 0));
    const methScore = Math.min(30, Math.max(0, Number(methodology) || 0));
    const resScore = Math.min(30, Math.max(0, Number(results) || 0));
    const msScore = Math.min(20, Math.max(0, Number(manuscriptQuality) || 0));

    const totalScore = presScore + methScore + resScore + msScore;

    const newEval = {
      id: `eval-${Date.now()}`,
      projectId,
      projectTitle: projectTitle || 'Research Project',
      studentName: studentName || 'Student Researcher',
      panelistId: user.uid,
      panelistName: user.fullName || user.email.split('@')[0],
      scores: {
        presentation: presScore,
        methodology: methScore,
        results: resScore,
        manuscriptQuality: msScore
      },
      totalScore,
      remarks: remarks || '',
      submittedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockEvaluationsIfEmpty();
      const map = mockFirestoreDb.get('evaluations');
      map.set(newEval.id, newEval);
    } else {
      await db.collection('evaluations').doc(newEval.id).set(newEval);
    }

    return res.status(201).json({
      success: true,
      message: `Evaluation submitted successfully. Score: ${totalScore}/100`,
      data: newEval
    });
  } catch (error) {
    console.error('[EvaluationController] submitEvaluation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get rubric evaluations & compute panel average grade summary
 */
export const getEvaluations = async (req, res) => {
  try {
    const { projectId } = req.params;
    let list = [];

    if (isDevMockMode) {
      seedMockEvaluationsIfEmpty();
      const map = mockFirestoreDb.get('evaluations');
      list = Array.from(map.values());
    } else {
      const snapshot = await db.collection('evaluations').get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (projectId && projectId !== 'all') {
      list = list.filter(e => e.projectId === projectId);
    }

    // Compute composite panel score average
    const totalSum = list.reduce((sum, item) => sum + (item.totalScore || 0), 0);
    const averageScore = list.length > 0 ? (totalSum / list.length).toFixed(2) : 0;

    let gradeLetter = 'N/A';
    if (averageScore >= 95) gradeLetter = '1.00 (Excellence)';
    else if (averageScore >= 90) gradeLetter = '1.25 (Very Superior)';
    else if (averageScore >= 85) gradeLetter = '1.50 (Superior)';
    else if (averageScore >= 80) gradeLetter = '1.75 (High Average)';
    else if (averageScore >= 75) gradeLetter = '2.00 (Average)';
    else if (averageScore > 0) gradeLetter = 'Conditional Re-defense';

    return res.status(200).json({
      success: true,
      count: list.length,
      averageScore: Number(averageScore),
      gradeLetter,
      data: list
    });
  } catch (error) {
    console.error('[EvaluationController] getEvaluations error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
