import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Pre-seed mock proposals if store is empty
const seedMockProposalsIfEmpty = () => {
  if (!mockFirestoreDb.has('proposals')) {
    const initialProposals = [
      {
        id: 'prop-101',
        title: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        abstract: 'This project proposes a sensor-driven micro-irrigation platform to measure real-time soil nitrogen, phosphorus, and moisture levels, dynamically adjusting water delivery in automated indoor greenhouse environments.',
        objectives: '1. Build soil sensor node.\n2. Interface node with MQTT broker.\n3. Implement threshold-based automated irrigation pump triggers.',
        keywords: ['IoT', 'Smart Agriculture', 'Precision Farming', 'Embedded Systems'],
        studentId: 'dev-student-01',
        studentName: 'Alex Rivera',
        department: 'Computer Science',
        status: 'approved',
        adviserComment: 'Excellent proposal. Scope is well-defined for an undergraduate thesis.',
        submittedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'prop-102',
        title: 'Blockchain-Based Credential Verification System for Academic Transcripts',
        abstract: 'A tamper-proof ledger platform enabling university registrars to issue digital diplomas and micro-credentials verifiable by prospective employers via public key cryptography.',
        objectives: '1. Deploy smart contracts for certificate hash storage.\n2. Develop verification portal for recruiters.',
        keywords: ['Blockchain', 'Cryptography', 'Web3', 'Educational Tech'],
        studentId: 'dev-student-02',
        studentName: 'Maria Santos',
        department: 'Information Technology',
        status: 'pending',
        adviserComment: '',
        submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialProposals.forEach(p => map.set(p.id, p));
    mockFirestoreDb.set('proposals', map);
  }
};

/**
 * Submit new title proposal (Student only)
 */
export const createProposal = async (req, res) => {
  try {
    const { title, abstract, objectives, keywords, department } = req.body;
    const user = req.user;

    if (!title || !abstract) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title and Abstract are required.'
      });
    }

    const newProposal = {
      id: `prop-${Date.now()}`,
      title,
      abstract,
      objectives: objectives || '',
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      studentId: user.uid,
      studentName: user.fullName || user.email.split('@')[0],
      department: department || user.department || 'Computer Studies',
      status: 'pending',
      adviserComment: '',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const proposalsMap = mockFirestoreDb.get('proposals');
      proposalsMap.set(newProposal.id, newProposal);
    } else {
      await db.collection('proposals').doc(newProposal.id).set(newProposal);
    }

    return res.status(201).json({
      success: true,
      message: 'Title proposal submitted successfully.',
      data: newProposal
    });
  } catch (error) {
    console.error('[ProposalController] createProposal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get proposals (filtered by role)
 */
export const getProposals = async (req, res) => {
  try {
    const user = req.user;
    let proposalsList = [];

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const proposalsMap = mockFirestoreDb.get('proposals');
      proposalsList = Array.from(proposalsMap.values());
    } else {
      const snapshot = await db.collection('proposals').get();
      proposalsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Role-based filtering
    if (user.role === 'student') {
      proposalsList = proposalsList.filter(p => p.studentId === user.uid);
    }

    return res.status(200).json({
      success: true,
      count: proposalsList.length,
      data: proposalsList
    });
  } catch (error) {
    console.error('[ProposalController] getProposals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get proposal by ID
 */
export const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const proposalsMap = mockFirestoreDb.get('proposals');
      proposal = proposalsMap.get(id);
    } else {
      const doc = await db.collection('proposals').doc(id).get();
      if (doc.exists) {
        proposal = { id: doc.id, ...doc.data() };
      }
    }

    if (!proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    return res.status(200).json({ success: true, data: proposal });
  } catch (error) {
    console.error('[ProposalController] getProposalById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Review proposal status & comments (Adviser & Admin)
 */
export const updateProposalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adviserComment } = req.body;

    const validStatuses = ['pending', 'approved', 'revisions_required', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Allowed: ${validStatuses.join(', ')}`
      });
    }

    let updated = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const proposalsMap = mockFirestoreDb.get('proposals');
      const existing = proposalsMap.get(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      existing.status = status;
      if (adviserComment !== undefined) {
        existing.adviserComment = adviserComment;
      }
      existing.updatedAt = new Date().toISOString();
      proposalsMap.set(id, existing);
      updated = existing;
    } else {
      const ref = db.collection('proposals').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      const updateData = { status, updatedAt: new Date().toISOString() };
      if (adviserComment !== undefined) {
        updateData.adviserComment = adviserComment;
      }

      await ref.update(updateData);
      updated = { id, ...doc.data(), ...updateData };
    }

    return res.status(200).json({
      success: true,
      message: `Proposal status updated to '${status}'.`,
      data: updated
    });
  } catch (error) {
    console.error('[ProposalController] updateProposalStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
