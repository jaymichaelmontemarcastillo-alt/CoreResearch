import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

export const DEFAULT_RUBRIC = {
  id: 'rubric-v1',
  version: 1,
  title: 'Standard Oral Defense & Manuscript Evaluation Rubric',
  description: 'Institutional digital rubric for research proposals, oral defense evaluations, and manuscript assessment.',
  isActive: true,
  totalMaxScore: 100,
  criteria: [
    {
      id: 'crit-presentation',
      key: 'presentation',
      label: 'Presentation & Defense Delivery',
      description: 'Clarity of presentation, mastery of subject matter, and technical defense Q&A.',
      maxScore: 20
    },
    {
      id: 'crit-methodology',
      key: 'methodology',
      label: 'Research Methodology & Technical Soundness',
      description: 'Soundness of research design, data collection, and algorithmic/experimental procedures.',
      maxScore: 30
    },
    {
      id: 'crit-results',
      key: 'results',
      label: 'Results, Analysis & System Demonstration',
      description: 'Depth of analysis, findings, hardware/software implementation, and statistical validation.',
      maxScore: 30
    },
    {
      id: 'crit-manuscript',
      key: 'manuscriptQuality',
      label: 'Manuscript Quality & Documentation',
      description: 'Organization, academic formatting, citation integrity, and overall document completeness.',
      maxScore: 20
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const seedMockRubricsIfEmpty = () => {
  if (!mockFirestoreDb.has('rubrics')) {
    const map = new Map();
    map.set(DEFAULT_RUBRIC.id, { ...DEFAULT_RUBRIC });
    mockFirestoreDb.set('rubrics', map);
  }
};

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
        rubricId: 'rubric-v1',
        rubricVersion: 1,
        criteriaSnapshot: DEFAULT_RUBRIC.criteria,
        scores: {
          presentation: 18,
          methodology: 27,
          results: 26,
          manuscriptQuality: 18
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
        rubricId: 'rubric-v1',
        rubricVersion: 1,
        criteriaSnapshot: DEFAULT_RUBRIC.criteria,
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
 * Helper to fetch active rubric from storage or fallback to DEFAULT_RUBRIC
 */
export const fetchActiveRubricHelper = async () => {
  if (isDevMockMode) {
    seedMockRubricsIfEmpty();
    const map = mockFirestoreDb.get('rubrics');
    const rubrics = Array.from(map.values());
    const active = rubrics.find(r => r.isActive);
    return active || DEFAULT_RUBRIC;
  } else {
    try {
      const snap = await db.collection('evaluation_rubrics').where('isActive', '==', true).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.warn('[EvaluationController] fetchActiveRubricHelper fallback:', e.message);
    }
    return DEFAULT_RUBRIC;
  }
};

/**
 * Get active rubric definition
 */
export const getActiveRubric = async (req, res) => {
  try {
    const rubric = await fetchActiveRubricHelper();
    return res.status(200).json({
      success: true,
      data: rubric
    });
  } catch (error) {
    console.error('[EvaluationController] getActiveRubric error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all rubric versions (Admin audit/history)
 */
export const getRubrics = async (req, res) => {
  try {
    let list = [];
    if (isDevMockMode) {
      seedMockRubricsIfEmpty();
      const map = mockFirestoreDb.get('rubrics');
      list = Array.from(map.values()).sort((a, b) => (b.version || 0) - (a.version || 0));
    } else {
      const snap = await db.collection('evaluation_rubrics').get();
      list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.version || 0) - (a.version || 0));
      if (list.length === 0) {
        list = [DEFAULT_RUBRIC];
      }
    }
    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[EvaluationController] getRubrics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create or update active evaluation rubric (Admin only)
 * Strictly verifies that criteria max scores total 100.
 */
export const saveRubric = async (req, res) => {
  try {
    const { title, description, criteria } = req.body;

    if (!Array.isArray(criteria) || criteria.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Rubric must contain at least one evaluation criterion.'
      });
    }

    let calculatedTotal = 0;
    const validatedCriteria = [];

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      const maxScore = Number(c.maxScore);
      if (isNaN(maxScore) || maxScore <= 0) {
        return res.status(400).json({
          success: false,
          message: `Criterion "${c.label || 'Item ' + (i + 1)}" must have a positive max score.`
        });
      }
      calculatedTotal += maxScore;

      const key = (c.key || c.id || c.label || `crit_${i}`)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '') || `crit_${i}`;

      validatedCriteria.push({
        id: c.id || `crit-${Date.now()}-${i}`,
        key,
        label: String(c.label || `Criterion ${i + 1}`).trim(),
        description: String(c.description || '').trim(),
        maxScore
      });
    }

    if (calculatedTotal !== 100) {
      return res.status(400).json({
        success: false,
        message: `Rubric criteria max scores must sum to exactly 100. Current total is ${calculatedTotal}.`
      });
    }

    let nextVersion = 1;
    if (isDevMockMode) {
      seedMockRubricsIfEmpty();
      const map = mockFirestoreDb.get('rubrics');
      for (const [id, r] of map.entries()) {
        if (r.version >= nextVersion) nextVersion = r.version + 1;
        r.isActive = false;
        map.set(id, r);
      }
      const newRubric = {
        id: `rubric-v${nextVersion}`,
        version: nextVersion,
        title: title || `Evaluation Rubric v${nextVersion}`,
        description: description || 'Custom research evaluation rubric configured by administrator.',
        isActive: true,
        totalMaxScore: 100,
        criteria: validatedCriteria,
        updatedBy: req.user?.uid || '',
        updatedByName: req.user?.fullName || 'Administrator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      map.set(newRubric.id, newRubric);
      return res.status(201).json({
        success: true,
        message: `Rubric v${nextVersion} saved and activated successfully.`,
        data: newRubric
      });
    } else {
      const snapshot = await db.collection('evaluation_rubrics').get();
      const batch = db.batch();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.version >= nextVersion) nextVersion = data.version + 1;
        if (data.isActive) {
          batch.update(docSnap.ref, { isActive: false, updatedAt: new Date().toISOString() });
        }
      });
      const newRubricId = `rubric-v${nextVersion}`;
      const newRubricRef = db.collection('evaluation_rubrics').doc(newRubricId);
      const newRubric = {
        id: newRubricId,
        version: nextVersion,
        title: title || `Evaluation Rubric v${nextVersion}`,
        description: description || 'Custom research evaluation rubric configured by administrator.',
        isActive: true,
        totalMaxScore: 100,
        criteria: validatedCriteria,
        updatedBy: req.user?.uid || '',
        updatedByName: req.user?.fullName || 'Administrator',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(newRubricRef, newRubric);
      await batch.commit();

      return res.status(201).json({
        success: true,
        message: `Rubric v${nextVersion} saved and activated successfully.`,
        data: newRubric
      });
    }
  } catch (error) {
    console.error('[EvaluationController] saveRubric error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Submit digital rubric evaluation (Panelist only)
 * Dynamically binds and validates against active rubric criteria and records snapshot.
 */
export const submitEvaluation = async (req, res) => {
  try {
    const projectId = req.body.projectId || req.params.projectId;
    const { projectTitle, studentName, scores, remarks } = req.body;
    const user = req.user;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'projectId is required.'
      });
    }

    const activeRubric = await fetchActiveRubricHelper();
    const evaluatedScores = {};
    let totalScore = 0;

    // Accept scores object or fallback to top-level fields
    const scoreSource = scores && typeof scores === 'object' ? scores : req.body;

    for (const crit of activeRubric.criteria) {
      const rawVal = scoreSource[crit.key] ?? scoreSource[crit.id] ?? 0;
      const parsed = Math.min(crit.maxScore, Math.max(0, Number(rawVal) || 0));
      evaluatedScores[crit.key] = parsed;
      totalScore += parsed;
    }

    const newEval = {
      id: `eval-${Date.now()}`,
      projectId,
      projectTitle: projectTitle || 'Research Project',
      studentName: studentName || 'Student Researcher',
      panelistId: user.uid,
      panelistName: user.fullName || user.email?.split('@')[0] || 'Panelist',
      rubricId: activeRubric.id,
      rubricVersion: activeRubric.version,
      criteriaSnapshot: activeRubric.criteria,
      scores: evaluatedScores,
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
 * Preserves historical criteriaSnapshot so past evaluations render accurately.
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

    // Attach criteriaSnapshot if legacy evaluation lacked it
    list = list.map(item => {
      if (!item.criteriaSnapshot || !Array.isArray(item.criteriaSnapshot)) {
        return {
          ...item,
          criteriaSnapshot: DEFAULT_RUBRIC.criteria
        };
      }
      return item;
    });

    const activeRubric = await fetchActiveRubricHelper();

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
      activeRubric,
      data: list
    });
  } catch (error) {
    console.error('[EvaluationController] getEvaluations error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
