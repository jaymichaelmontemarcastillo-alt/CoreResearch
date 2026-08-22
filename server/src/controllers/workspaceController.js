import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

const SEED_DEFAULT_SECTIONS = [
  { id: 'chapter_1', name: 'Chapter 1: Introduction & Background', order: 1, status: 'in_progress', progress: 25 },
  { id: 'chapter_2', name: 'Chapter 2: Review of Related Literature', order: 2, status: 'pending', progress: 0 },
  { id: 'chapter_3', name: 'Chapter 3: Methodology & System Architecture', order: 3, status: 'pending', progress: 0 },
  { id: 'chapter_4', name: 'Chapter 4: Results, Implementation & Discussion', order: 4, status: 'pending', progress: 0 },
  { id: 'chapter_5', name: 'Chapter 5: Summary, Conclusions & Recommendations', order: 5, status: 'pending', progress: 0 },
  { id: 'references', name: 'References & Appendices', order: 6, status: 'pending', progress: 0 },
  { id: 'final_manuscript', name: 'Final Integrated Manuscript', order: 7, status: 'pending', progress: 0 },
];

/**
 * Get or create workspace for a student / proposal
 */
export const getWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    let workspace = null;

    if (isDevMockMode) {
      if (!mockFirestoreDb.has('manuscript_workspaces')) {
        mockFirestoreDb.set('manuscript_workspaces', new Map());
      }
      const map = mockFirestoreDb.get('manuscript_workspaces');
      workspace = map.get(id);
    } else {
      const docSnap = await db.collection('manuscript_workspaces').doc(id).get();
      if (docSnap.exists) {
        workspace = { id: docSnap.id, ...docSnap.data() };
      }
    }

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    console.error('[workspaceController] getWorkspace error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Fetch workspaces by adviser ID
 */
export const getWorkspacesByAdviser = async (req, res) => {
  try {
    const { adviserId } = req.params;
    let list = [];

    if (isDevMockMode) {
      if (!mockFirestoreDb.has('manuscript_workspaces')) {
        mockFirestoreDb.set('manuscript_workspaces', new Map());
      }
      const map = mockFirestoreDb.get('manuscript_workspaces');
      list = Array.from(map.values()).filter((w) => w.adviserId === adviserId);
    } else {
      const snap = await db.collection('manuscript_workspaces')
        .where('adviserId', '==', adviserId)
        .get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    return res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    console.error('[workspaceController] getWorkspacesByAdviser error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create research task (Adviser only)
 */
export const createTask = async (req, res) => {
  try {
    const user = req.user;
    const { workspaceId, studentId, title, description, priority, dueDate, sectionId } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, error: 'Title and Due Date are required.' });
    }

    const taskId = `task-${Date.now()}`;
    const now = new Date().toISOString();

    const newTask = {
      id: taskId,
      workspaceId: workspaceId || '',
      studentId: studentId || '',
      adviserId: user.uid,
      adviserName: user.fullName || user.email.split('@')[0],
      sectionId: sectionId || 'chapter_1',
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'medium',
      status: 'todo',
      dueDate,
      createdAt: now,
      updatedAt: now,
    };

    if (isDevMockMode) {
      if (!mockFirestoreDb.has('research_tasks')) {
        mockFirestoreDb.set('research_tasks', new Map());
      }
      const map = mockFirestoreDb.get('research_tasks');
      map.set(taskId, newTask);
    } else {
      await db.collection('research_tasks').doc(taskId).set(newTask);
    }

    return res.status(201).json({ success: true, message: 'Task assigned successfully.', data: newTask });
  } catch (error) {
    console.error('[workspaceController] createTask error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update research task status / submit work
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, submissionNote } = req.body;
    const now = new Date().toISOString();

    const updates = {
      status,
      updatedAt: now,
      ...(submissionNote !== undefined ? { submissionNote } : {}),
      ...(status === 'submitted' ? { submittedAt: now } : {}),
      ...(status === 'completed' ? { completedAt: now } : {}),
    };

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('research_tasks');
      const existing = map?.get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });
      const merged = { ...existing, ...updates };
      map.set(id, merged);
      return res.status(200).json({ success: true, data: merged });
    } else {
      const ref = db.collection('research_tasks').doc(id);
      await ref.update(updates);
      const snap = await ref.get();
      return res.status(200).json({ success: true, data: { id, ...snap.data() } });
    }
  } catch (error) {
    console.error('[workspaceController] updateTask error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create research feedback
 */
export const createFeedback = async (req, res) => {
  try {
    const user = req.user;
    const { workspaceId, studentId, sectionId, taskId, comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: 'Feedback comment is required.' });
    }

    const feedbackId = `fb-${Date.now()}`;
    const now = new Date().toISOString();

    const newFeedback = {
      id: feedbackId,
      workspaceId: workspaceId || '',
      studentId: studentId || '',
      authorId: user.uid,
      authorName: user.fullName || user.email.split('@')[0],
      authorRole: user.role || 'adviser',
      sectionId: sectionId || null,
      taskId: taskId || null,
      comment: comment.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    if (isDevMockMode) {
      if (!mockFirestoreDb.has('research_feedback')) {
        mockFirestoreDb.set('research_feedback', new Map());
      }
      const map = mockFirestoreDb.get('research_feedback');
      map.set(feedbackId, newFeedback);
    } else {
      await db.collection('research_feedback').doc(feedbackId).set(newFeedback);
    }

    return res.status(201).json({ success: true, message: 'Feedback posted.', data: newFeedback });
  } catch (error) {
    console.error('[workspaceController] createFeedback error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update feedback status (addressed or resolved)
 */
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('research_feedback');
      const existing = map?.get(id);
      if (!existing) return res.status(404).json({ success: false, error: 'Feedback not found' });
      const merged = { ...existing, status, updatedAt: now };
      map.set(id, merged);
      return res.status(200).json({ success: true, data: merged });
    } else {
      const ref = db.collection('research_feedback').doc(id);
      await ref.update({ status, updatedAt: now });
      return res.status(200).json({ success: true, message: `Feedback status updated to ${status}.` });
    }
  } catch (error) {
    console.error('[workspaceController] updateFeedbackStatus error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
