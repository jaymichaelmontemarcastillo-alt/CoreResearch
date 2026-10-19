import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { canAccessProject, isPrivilegedRole } from '../middleware/resourceAuthorization.js';

const SEED_DEFAULT_SECTIONS = [
  { id: 'chapter_1', name: 'Chapter 1: Introduction & Background', order: 1, status: 'not_started', progress: 0 },
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
    if (!(await canAccessProject(req.user, id, workspace))) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
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
    if (adviserId !== req.user.uid && !isPrivilegedRole(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
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

    const accessResults = await Promise.all(list.map((workspace) =>
      canAccessProject(req.user, workspace.id || workspace.groupId, workspace)
    ));
    list = list.filter((_, index) => accessResults[index]);
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

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required.' });
    }
    if (!title || !dueDate) {
      return res.status(400).json({ success: false, error: 'Title and Due Date are required.' });
    }

    let resolvedWorkspace = null;
    if (isDevMockMode) {
      resolvedWorkspace = mockFirestoreDb.get('manuscript_workspaces')?.get(workspaceId) || null;
    } else {
      const snapshot = await db.collection('manuscript_workspaces').doc(workspaceId).get();
      resolvedWorkspace = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    }
    if (!resolvedWorkspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found.' });
    }
    if (!(await canAccessProject(user, workspaceId, resolvedWorkspace))) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this workspace.' });
    }
    const workspaceMemberIds = new Set([
      resolvedWorkspace.studentId,
      ...(Array.isArray(resolvedWorkspace.memberIds) ? resolvedWorkspace.memberIds : []),
      ...(Array.isArray(resolvedWorkspace.members)
        ? resolvedWorkspace.members.map((member) => member?.uid || member?.id)
        : []),
    ].filter(Boolean));
    if (studentId && !workspaceMemberIds.has(studentId)) {
      return res.status(403).json({ success: false, error: 'Student is not a member of this workspace.' });
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
    const user = req.user;
    const now = new Date().toISOString();

    const existing = isDevMockMode
      ? mockFirestoreDb.get('research_tasks')?.get(id)
      : await db.collection('research_tasks').doc(id).get().then((snap) =>
          snap.exists ? { id: snap.id, ...snap.data() } : null
        );
    if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });
    if (!(await canAccessProject(user, existing.workspaceId, existing))) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (
      !isPrivilegedRole(user.role) &&
      !(
        (user.role === 'adviser' && existing.adviserId === user.uid) ||
        (user.role === 'student' && existing.studentId === user.uid)
      )
    ) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const allowedStatuses = user.role === 'student'
      ? ['in_progress', 'submitted']
      : ['todo', 'in_progress', 'completed', 'revision_required'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid task status for this user.' });
    }

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

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'workspaceId is required.' });
    }
    const workspaceSnap = isDevMockMode
      ? null
      : await db.collection('manuscript_workspaces').doc(workspaceId).get();
    const workspace = isDevMockMode
      ? mockFirestoreDb.get('manuscript_workspaces')?.get(workspaceId)
      : workspaceSnap?.exists ? { id: workspaceSnap.id, ...workspaceSnap.data() } : null;
    if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found.' });
    if (!(await canAccessProject(user, workspaceId, workspace))) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const workspaceMemberIds = new Set([
      workspace.studentId,
      ...(Array.isArray(workspace.memberIds) ? workspace.memberIds : []),
      ...(Array.isArray(workspace.members)
        ? workspace.members.map((member) => member?.uid || member?.id)
        : []),
    ].filter(Boolean));
    if (studentId && !workspaceMemberIds.has(studentId)) {
      return res.status(403).json({ success: false, error: 'Student is not a member of this workspace.' });
    }

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
    const user = req.user;
    const now = new Date().toISOString();

    const existing = isDevMockMode
      ? mockFirestoreDb.get('research_feedback')?.get(id)
      : await db.collection('research_feedback').doc(id).get().then((snap) =>
          snap.exists ? { id: snap.id, ...snap.data() } : null
        );
    if (!existing) return res.status(404).json({ success: false, error: 'Feedback not found' });
    if (!(await canAccessProject(user, existing.workspaceId, existing))) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const validStatuses = ['open', 'addressed', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid feedback status.' });
    }
    if (
      !isPrivilegedRole(user.role) &&
      existing.authorId !== user.uid &&
      !(user.role === 'student' && existing.studentId === user.uid) &&
      !['adviser', 'panelist'].includes(user.role)
    ) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

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

/**
 * Restart research progress for a workspace
 * Archives all research workspace artifacts (workspace, manuscripts, rubrics, tasks, schedules, comments)
 * while PRESERVING group members and accounts.
 */
export const restartWorkspace = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const user = req.user;
    const now = new Date().toISOString();
    const reason = req.body?.reason || 'Student restarted research progress';

    // 1. Fetch the workspace
    let workspace = null;
    if (isDevMockMode) {
      workspace = mockFirestoreDb.get('manuscript_workspaces')?.get(workspaceId);
    } else if (db) {
      const snap = await db.collection('manuscript_workspaces').doc(workspaceId).get();
      if (snap.exists) workspace = { id: snap.id, ...snap.data() };
    }

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found.' });
    }

    // Permission check: caller must be participant or admin
    if (!(await canAccessProject(user, workspaceId, workspace))) {
      return res.status(403).json({ success: false, error: 'Forbidden.' });
    }

    const groupId = workspace.groupId || workspace.projectId;

    if (db && !isDevMockMode) {
      const batch = db.batch();

      // A. Archive the workspace and any sibling workspaces for this group
      batch.set(db.collection('manuscript_workspaces').doc(workspaceId), {
        isArchived: true,
        status: 'archived',
        archivedAt: now,
        archivedBy: user.uid,
        archivedByName: user.fullName || 'Student Researcher',
        archiveReason: reason,
        updatedAt: now,
      }, { merge: true });

      if (groupId) {
        try {
          const wsSnaps = await db.collection('manuscript_workspaces').where('groupId', '==', groupId).get();
          wsSnaps.forEach((d) => {
            batch.set(d.ref, {
              isArchived: true,
              status: 'archived',
              archivedAt: now,
              archivedBy: user.uid,
              archivedByName: user.fullName || 'Student Researcher',
              archiveReason: reason,
              updatedAt: now,
            }, { merge: true });
          });
        } catch (we) {
          console.warn('[workspaceController] workspaces archive warning:', we.message);
        }
      }

      // B. Archive manuscript document if exists
      if (workspace.documentId) {
        try {
          const docRef = db.collection('manuscript_documents').doc(workspace.documentId);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            batch.set(docRef, {
              isArchived: true,
              status: 'archived',
              archivedAt: now,
              archivedBy: user.uid,
              archiveReason: reason,
              updatedAt: now,
            }, { merge: true });
          }
        } catch (de) {
          console.warn('[workspaceController] doc archive warning:', de.message);
        }
      }

      // C. Archive proposals for this group/workspace
      if (groupId) {
        try {
          const propSnaps = await db.collection('proposals').where('groupId', '==', groupId).get();
          propSnaps.forEach((d) => {
            batch.set(d.ref, {
              isArchived: true,
              status: 'archived',
              archivedAt: now,
              updatedAt: now,
            }, { merge: true });
          });
        } catch (pe) {
          console.warn('[workspaceController] proposals archive warning:', pe.message);
        }
      }

      // D. Archive research tasks
      try {
        const taskSnaps = await db.collection('research_tasks').where('workspaceId', '==', workspaceId).get();
        taskSnaps.forEach((d) => {
          batch.set(d.ref, {
            isArchived: true,
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
          }, { merge: true });
        });
      } catch (te) {
        console.warn('[workspaceController] tasks archive warning:', te.message);
      }

      // E. Archive feedback and comments
      try {
        const fbSnaps = await db.collection('research_feedback').where('workspaceId', '==', workspaceId).get();
        fbSnaps.forEach((d) => {
          batch.set(d.ref, {
            isArchived: true,
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
          }, { merge: true });
        });
      } catch (fe) {
        console.warn('[workspaceController] feedback archive warning:', fe.message);
      }

      // F. Archive rubric evaluations
      try {
        const [propEvalSnaps, finalEvalSnaps] = await Promise.all([
          db.collection('proposal_evaluations').where('workspaceId', '==', workspaceId).get().catch(() => ({ forEach: () => {} })),
          db.collection('final_evaluations').where('workspaceId', '==', workspaceId).get().catch(() => ({ forEach: () => {} })),
        ]);
        propEvalSnaps.forEach((d) => {
          batch.set(d.ref, { isArchived: true, status: 'archived', archivedAt: now, updatedAt: now }, { merge: true });
        });
        finalEvalSnaps.forEach((d) => {
          batch.set(d.ref, { isArchived: true, status: 'archived', archivedAt: now, updatedAt: now }, { merge: true });
        });
      } catch (ee) {
        console.warn('[workspaceController] evaluations archive warning:', ee.message);
      }

      // G. Cancel active adviser requests for groupId and caller
      try {
        const reqQueries = [];
        if (groupId) reqQueries.push(db.collection('adviser_requests').where('groupId', '==', groupId).get());
        if (user.uid) reqQueries.push(db.collection('adviser_requests').where('studentId', '==', user.uid).get());
        const reqSnaps = await Promise.all(reqQueries);
        const reqMap = new Map();
        reqSnaps.forEach(s => s.docs.forEach(d => reqMap.set(d.id, d.ref)));
        reqMap.forEach((ref) => {
          batch.set(ref, {
            isArchived: true,
            status: 'cancelled',
            archiveReason: reason,
            updatedAt: now,
          }, { merge: true });
        });
      } catch (re) {
        console.warn('[workspaceController] requests archive warning:', re.message);
      }

      // H. Archive defense schedules in Firestore
      if (groupId) {
        try {
          const schSnaps = await db.collection('defense_schedules').where('projectId', '==', groupId).get();
          schSnaps.forEach((d) => {
            batch.set(d.ref, {
              status: 'archived',
              isArchived: true,
              updatedAt: now,
            }, { merge: true });
          });
        } catch (se) {
          console.warn('[workspaceController] schedules archive warning:', se.message);
        }
      }

      // I. Reset the Research Group — KEEP MEMBERS AND ACCOUNTS INTACT!
      if (groupId) {
        const groupRef = db.collection('research_groups').doc(groupId);
        const groupSnap = await groupRef.get();
        if (groupSnap.exists) {
          batch.set(groupRef, {
            workspaceId: '',
            documentId: '',
            title: '',
            adviserId: '',
            adviserName: '',
            panelists: [],
            panelistIds: [],
            panelistNames: [],
            redefenseRequired: false,
            currentPhase: 'proposal',
            status: 'forming',
            updatedAt: now,
          }, { merge: true });
        }
      }

      await batch.commit();
    }

    // Also update MongoDB for authoritative collections
    if (mongoose.connection.readyState === 1 && groupId) {
      try {
        await Promise.all([
          mongoose.connection.collection('schedules').updateMany(
            { projectId: groupId },
            { $set: { status: 'archived', isArchived: true, updatedAt: new Date() } }
          ),
          mongoose.connection.collection('researchgroups').updateOne(
            { $or: [{ id: groupId }, { _id: groupId }] },
            {
              $set: {
                workspaceId: null,
                documentId: null,
                title: '',
                adviserId: null,
                adviserName: '',
                panelists: [],
                panelistIds: [],
                panelistNames: [],
                redefenseRequired: false,
                currentPhase: 'proposal',
                status: 'forming',
                updatedAt: new Date(),
              },
            }
          ),
        ]);
      } catch (mErr) {
        console.warn('[workspaceController] MongoDB restart sync warning:', mErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Research progress archived successfully. Group members and accounts are preserved.',
      workspaceId,
      groupId,
    });
  } catch (error) {
    console.error('[workspaceController] restartWorkspace error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get active advisee workload counts for all advisers
 * Accessible to authenticated users (students, faculty, admin)
 */
export const getAdviserWorkloads = async (req, res) => {
  try {
    const workloads = {};

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('manuscript_workspaces') || new Map();
      for (const ws of map.values()) {
        if (ws.adviserId && ws.status !== 'archived') {
          workloads[ws.adviserId] = (workloads[ws.adviserId] || 0) + 1;
        }
      }
    } else if (db) {
      // 1. Check manuscript_workspaces
      const wsSnap = await db.collection('manuscript_workspaces').get();
      wsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.adviserId && data.status !== 'archived') {
          workloads[data.adviserId] = (workloads[data.adviserId] || 0) + 1;
        }
      });

      // 2. Check research_groups to account for active assigned groups
      const groupSnap = await db.collection('research_groups').get();
      const groupsPerAdv = {};
      groupSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.adviserId && !data.isArchived && data.adviserId !== 'undefined') {
          groupsPerAdv[data.adviserId] = (groupsPerAdv[data.adviserId] || 0) + 1;
        }
      });

      for (const [advId, count] of Object.entries(groupsPerAdv)) {
        if (!workloads[advId] || count > workloads[advId]) {
          workloads[advId] = count;
        }
      }
    }

    return res.status(200).json({ success: true, data: workloads });
  } catch (error) {
    console.error('[workspaceController] getAdviserWorkloads error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

