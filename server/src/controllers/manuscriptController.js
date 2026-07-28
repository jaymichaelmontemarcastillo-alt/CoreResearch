import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Pre-seed mock manuscript version history if empty
const seedMockManuscriptsIfEmpty = () => {
  if (!mockFirestoreDb.has('manuscripts')) {
    const initialManuscripts = [
      {
        id: 'ms-v1.0',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        versionNumber: 'v1.0',
        fileName: 'CoreResearch_Draft_v1.0.pdf',
        fileSize: 4829100, // ~4.8 MB
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploadedBy: 'dev-student-01',
        uploaderName: 'Alex Rivera',
        notes: 'Initial Chapter 1 to 3 manuscript draft submission.',
        status: 'revisions_requested',
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'ms-v1.1',
        projectId: 'proj-501',
        projectTitle: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        versionNumber: 'v1.1',
        fileName: 'CoreResearch_Revision_v1.1.pdf',
        fileSize: 5210400, // ~5.2 MB
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploadedBy: 'dev-student-01',
        uploaderName: 'Alex Rivera',
        notes: 'Revised methodology diagram and expanded related work literature review.',
        status: 'under_review',
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialManuscripts.forEach(m => map.set(m.id, m));
    mockFirestoreDb.set('manuscripts', map);
  }
};

/**
 * Upload manuscript version record
 */
export const uploadManuscriptVersion = async (req, res) => {
  try {
    const { projectId, projectTitle, fileName, fileSize, versionTag, fileUrl, notes } = req.body;
    const user = req.user;

    if (!projectId || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'projectId and fileName are required.'
      });
    }

    const versionNumber = versionTag || 'v1.0';

    const newManuscript = {
      id: `ms-${Date.now()}`,
      projectId,
      projectTitle: projectTitle || 'Research Project',
      versionNumber,
      fileName,
      fileSize: fileSize || 1048576,
      fileUrl: fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      uploadedBy: user.uid,
      uploaderName: user.fullName || user.email.split('@')[0],
      notes: notes || '',
      status: 'under_review',
      createdAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      map.set(newManuscript.id, newManuscript);
    } else {
      await db.collection('manuscript_versions').doc(newManuscript.id).set(newManuscript);
    }

    return res.status(201).json({
      success: true,
      message: `Manuscript version ${versionNumber} uploaded successfully.`,
      data: newManuscript
    });
  } catch (error) {
    console.error('[ManuscriptController] uploadManuscriptVersion error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get manuscript version history for a project
 */
export const getManuscriptVersions = async (req, res) => {
  try {
    const { projectId } = req.params;
    let list = [];

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      list = Array.from(map.values());
    } else {
      const snapshot = await db.collection('manuscript_versions').get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (projectId && projectId !== 'all') {
      list = list.filter(m => m.projectId === projectId);
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[ManuscriptController] getManuscriptVersions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update manuscript status (Adviser & Admin)
 */
export const updateManuscriptStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['under_review', 'revisions_requested', 'approved'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status '${status}'` });
    }

    let updated = null;

    if (isDevMockMode) {
      seedMockManuscriptsIfEmpty();
      const map = mockFirestoreDb.get('manuscripts');
      const ms = map.get(id);
      if (!ms) {
        return res.status(404).json({ success: false, error: 'Manuscript not found' });
      }
      ms.status = status;
      map.set(id, ms);
      updated = ms;
    } else {
      const ref = db.collection('manuscript_versions').doc(id);
      await ref.update({ status });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    return res.status(200).json({
      success: true,
      message: `Manuscript version status updated to '${status}'.`,
      data: updated
    });
  } catch (error) {
    console.error('[ManuscriptController] updateManuscriptStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
