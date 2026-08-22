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
 * Submit new title proposal or save draft (Student only)
 */
export const createProposal = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      abstract, 
      rationale, 
      objectives, 
      scopeAndDelimitation, 
      methodology, 
      attachments,
      groupId,
      groupName,
      courseId,
      courseName,
      sectionId,
      sectionName,
      keywords, 
      department,
      status = 'submitted'
    } = req.body;
    const user = req.user;

    const proposalTitle = (title || '').trim();
    const proposalDesc = (description || rationale || abstract || '').trim();

    // Validation
    if (!proposalTitle || proposalTitle.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Research title is required and must be at least 5 characters long.'
      });
    }

    if (status === 'submitted' && (!proposalDesc || proposalDesc.length < 15)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Research description / rationale is required (minimum 15 characters) before submission.'
      });
    }

    const initialStatus = status === 'draft' ? 'draft' : 'submitted';
    const now = new Date().toISOString();

    // Duplicate Active Proposal Check on submission
    if (initialStatus === 'submitted') {
      let existingActive = null;
      if (isDevMockMode) {
        seedMockProposalsIfEmpty();
        const map = mockFirestoreDb.get('proposals');
        for (const p of map.values()) {
          if ((p.studentId === user.uid || p.submittedByUid === user.uid || (groupId && p.groupId === groupId)) &&
              ['submitted', 'under_review', 'approved'].includes(p.status)) {
            existingActive = p;
            break;
          }
        }
      } else {
        const querySnap = await db.collection('proposals')
          .where('submittedByUid', '==', user.uid)
          .where('status', 'in', ['submitted', 'under_review', 'approved'])
          .get();
        if (!querySnap.empty) {
          existingActive = querySnap.docs[0].data();
        }
      }

      if (existingActive) {
        return res.status(400).json({
          success: false,
          error: 'Active Proposal Exists',
          message: `You already have an active proposal titled "${existingActive.title}" with status "${existingActive.status}". You cannot submit another proposal while one is active.`,
          existingProposal: existingActive
        });
      }
    }

    const newProposal = {
      id: `prop-${Date.now()}`,
      title: proposalTitle,
      description: proposalDesc,
      rationale: rationale || proposalDesc,
      objectives: objectives || '',
      scopeAndDelimitation: scopeAndDelimitation || '',
      methodology: methodology || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      groupId: groupId || user.groupId || '',
      groupName: groupName || '',
      courseId: courseId || user.courseId || '',
      courseName: courseName || '',
      sectionId: sectionId || user.sectionId || '',
      sectionName: sectionName || '',
      keywords: Array.isArray(keywords) ? keywords : (keywords ? keywords.split(',').map(k => k.trim()) : []),
      studentId: user.uid,
      studentName: user.fullName || user.email.split('@')[0],
      submittedByUid: user.uid,
      submittedByName: user.fullName || user.email.split('@')[0],
      department: department || user.department || 'Computer Studies',
      status: initialStatus,
      revisionCount: 0,
      createdAt: now,
      updatedAt: now,
      ...(initialStatus === 'submitted' ? { submittedAt: now, lastSubmittedAt: now } : {})
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
      message: initialStatus === 'draft' ? 'Proposal draft saved successfully.' : 'Title proposal submitted successfully.',
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
      proposalsList = proposalsList.filter(p => p.studentId === user.uid || p.submittedByUid === user.uid || (user.groupId && p.groupId === user.groupId));
    } else if (user.role === 'adviser') {
      // Advisers see submitted, under_review, approved proposals for their groups or department
      proposalsList = proposalsList.filter(p => p.status !== 'draft');
    } else if (['research_coordinator', 'admin'].includes(user.role)) {
      // Coordinators & Admins see all non-draft proposals (or drafts if querying directly)
      proposalsList = proposalsList.filter(p => p.status !== 'draft' || req.query.includeDrafts === 'true');
    }

    // Sort newest first
    proposalsList.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

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
    const user = req.user;
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

    // Authorization check: Students can only view their own drafts
    if (user.role === 'student' && proposal.status === 'draft') {
      const isOwner = proposal.studentId === user.uid || proposal.submittedByUid === user.uid || (user.groupId && proposal.groupId === user.groupId);
      if (!isOwner) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: 'You are not authorized to view this draft proposal.' });
      }
    }

    return res.status(200).json({ success: true, data: proposal });
  } catch (error) {
    console.error('[ProposalController] getProposalById error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update proposal draft / edits (Student only)
 */
export const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    let existing = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const map = mockFirestoreDb.get('proposals');
      existing = map.get(id);
    } else {
      const docRef = db.collection('proposals').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) existing = { id: docSnap.id, ...docSnap.data() };
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    // Ownership check
    const isOwner = existing.studentId === user.uid || existing.submittedByUid === user.uid || (user.groupId && existing.groupId === user.groupId);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You can only edit your own proposals.' });
    }

    // Only editable in 'draft' or 'needs_revision'
    if (!['draft', 'needs_revision'].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: 'Locked Proposal',
        message: `This proposal is '${existing.status}' and cannot be edited until returned for revision.`
      });
    }

    const now = new Date().toISOString();
    const allowedFields = [
      'title', 'description', 'rationale', 'objectives', 
      'scopeAndDelimitation', 'methodology', 'attachments', 'keywords'
    ];

    const safeUpdates = { updatedAt: now };
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) safeUpdates[field] = updates[field];
    });

    let updatedRecord = null;
    if (isDevMockMode) {
      const map = mockFirestoreDb.get('proposals');
      updatedRecord = { ...existing, ...safeUpdates };
      map.set(id, updatedRecord);
    } else {
      const ref = db.collection('proposals').doc(id);
      await ref.update(safeUpdates);
      updatedRecord = { ...existing, ...safeUpdates };
    }

    return res.status(200).json({
      success: true,
      message: 'Proposal updated successfully.',
      data: updatedRecord
    });
  } catch (error) {
    console.error('[ProposalController] updateProposal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Submit an existing draft proposal to the review queue
 */
export const submitExistingProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let existing = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const map = mockFirestoreDb.get('proposals');
      existing = map.get(id);
    } else {
      const docRef = db.collection('proposals').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) existing = { id: docSnap.id, ...docSnap.data() };
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const isOwner = existing.studentId === user.uid || existing.submittedByUid === user.uid || (user.groupId && existing.groupId === user.groupId);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You can only submit your own proposals.' });
    }

    if (!['draft', 'needs_revision'].includes(existing.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Action',
        message: `Proposal is already in '${existing.status}' state.`
      });
    }

    // Validation before submission
    if (!existing.title || existing.title.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Title is required (min 5 characters).' });
    }

    const desc = (existing.description || existing.rationale || '').trim();
    if (!desc || desc.length < 15) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Description / Rationale is required (min 15 characters).' });
    }

    const now = new Date().toISOString();
    const isResubmission = existing.status === 'needs_revision';
    const submitUpdates = {
      status: 'submitted',
      submittedByUid: user.uid,
      submittedByName: user.fullName || user.email.split('@')[0],
      lastSubmittedAt: now,
      updatedAt: now,
      ...(existing.submittedAt ? {} : { submittedAt: now }),
      ...(isResubmission ? { revisionCount: (existing.revisionCount || 0) + 1, coordinatorFeedback: '', reviewedAt: null } : {})
    };

    let updatedRecord = null;
    if (isDevMockMode) {
      const map = mockFirestoreDb.get('proposals');
      updatedRecord = { ...existing, ...submitUpdates };
      map.set(id, updatedRecord);
    } else {
      const ref = db.collection('proposals').doc(id);
      await ref.update(submitUpdates);
      updatedRecord = { ...existing, ...submitUpdates };
    }

    return res.status(200).json({
      success: true,
      message: isResubmission ? 'Proposal resubmitted for review.' : 'Proposal submitted successfully.',
      data: updatedRecord
    });
  } catch (error) {
    console.error('[ProposalController] submitExistingProposal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete draft proposal (Student only)
 */
export const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let existing = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const map = mockFirestoreDb.get('proposals');
      existing = map.get(id);
    } else {
      const docRef = db.collection('proposals').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) existing = { id: docSnap.id, ...docSnap.data() };
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const isOwner = existing.studentId === user.uid || existing.submittedByUid === user.uid || (user.groupId && existing.groupId === user.groupId);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You can only delete your own proposals.' });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Cannot Delete', message: 'Only draft proposals can be deleted.' });
    }

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('proposals');
      map.delete(id);
    } else {
      await db.collection('proposals').doc(id).delete();
    }

    return res.status(200).json({ success: true, message: 'Draft proposal deleted successfully.' });
  } catch (error) {
    console.error('[ProposalController] deleteProposal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Review proposal status & comments (Coordinator, Adviser, Admin)
 */
export const updateProposalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, coordinatorFeedback, adviserComment } = req.body;
    const reviewer = req.user;

    const validStatuses = ['submitted', 'under_review', 'approved', 'needs_revision', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Allowed: ${validStatuses.join(', ')}`
      });
    }

    const now = new Date().toISOString();
    const feedback = coordinatorFeedback !== undefined ? coordinatorFeedback : adviserComment;

    const updateData = {
      status,
      updatedAt: now,
      reviewedAt: now,
      coordinatorId: reviewer.uid,
      coordinatorName: reviewer.fullName || reviewer.email.split('@')[0],
      ...(feedback !== undefined ? { coordinatorFeedback: feedback, adviserComment: feedback } : {}),
      ...(status === 'approved' ? { approvedAt: now } : {})
    };

    let updated = null;

    if (isDevMockMode) {
      seedMockProposalsIfEmpty();
      const proposalsMap = mockFirestoreDb.get('proposals');
      const existing = proposalsMap.get(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      const merged = { ...existing, ...updateData };
      proposalsMap.set(id, merged);
      updated = merged;
    } else {
      const ref = db.collection('proposals').doc(id);
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      await ref.update(updateData);
      updated = { id, ...doc.data(), ...updateData };
    }

    return res.status(200).json({
      success: true,
      message: `Proposal evaluation updated to '${status}'.`,
      data: updated
    });
  } catch (error) {
    console.error('[ProposalController] updateProposalStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
