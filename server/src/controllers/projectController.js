import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';
import { Document as MongoDocument } from '../models/Document.js';
import { User } from '../models/User.js';

// Pre-seed mock research projects if store is empty
const seedMockProjectsIfEmpty = () => {
  if (!mockFirestoreDb.has('projects')) {
    const initialProjects = [
      {
        id: 'proj-501',
        proposalId: 'prop-101',
        title: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        studentId: 'dev-student-01',
        studentName: 'Alex Rivera',
        studentEmail: 'alex.rivera@university.edu',
        adviserId: 'dev-adviser-01',
        adviserName: 'Dr. Eleanor Vance',
        adviserEmail: 'dr.vance@university.edu',
        panelistIds: ['dev-panelist-01', 'dev-panelist-02'],
        department: 'Computer Science',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialProjects.forEach(p => map.set(p.id, p));
    mockFirestoreDb.set('projects', map);
  }
};

/**
 * Get research projects (filtered by user role)
 */
export const getProjects = async (req, res) => {
  try {
    const user = req.user;
    let projectsList = [];
    let fetchedFromMongo = false;

    try {
      if (mongoose.connection.readyState === 1) {
        const mongoDocs = await MongoDocument.find().lean();
        if (mongoDocs && mongoDocs.length > 0) {
          // Map Document schema back to expected project format for frontend compatibility during migration
          projectsList = mongoDocs.map(doc => ({
            id: doc.id,
            proposalId: doc.proposalId || '',
            title: doc.title,
            studentId: doc.authors && doc.authors[0] ? doc.authors[0] : '',
            studentName: 'Student', // In a real scenario, this would be populated
            adviserId: doc.adviser || '',
            adviserName: 'Adviser',
            panelistIds: doc.panelists || [],
            department: 'Computer Studies',
            status: doc.status === 'approved' ? 'completed' : 'in_progress',
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt || doc.createdAt
          }));
          fetchedFromMongo = true;
        }
      }
    } catch (mongoErr) {
      console.warn('[ProjectController] MongoDB read warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      // [TEMPORARY MIGRATION COMPATIBILITY] 
      // Fallback to Firestore if MongoDB fails or hasn't been migrated yet.
      // In the FINAL PRODUCTION ARCHITECTURE, this fallback will be removed.
      if (isDevMockMode) {
        seedMockProjectsIfEmpty();
        const map = mockFirestoreDb.get('projects');
        projectsList = Array.from(map.values());
      } else {
        const snapshot = await db.collection('research_projects').get();
        projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }

    // Role-based filtering
    if (user.role === 'student') {
      projectsList = projectsList.filter(p => p.studentId === user.uid);
    } else if (user.role === 'adviser') {
      projectsList = projectsList.filter(p => p.adviserId === user.uid);
    } else if (user.role === 'panelist') {
      projectsList = projectsList.filter(p => p.panelistIds && p.panelistIds.includes(user.uid));
    }

    return res.status(200).json({
      success: true,
      count: projectsList.length,
      data: projectsList
    });
  } catch (error) {
    console.error('[ProjectController] getProjects error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create research project from an approved proposal (Admin only)
 */
export const createProject = async (req, res) => {
  try {
    const { proposalId, title, studentId, studentName, adviserId, department } = req.body;

    if (!title || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Title and studentId are required.'
      });
    }

    let adviserName = 'Unassigned';
    let adviserEmail = '';

    if (adviserId) {
      if (isDevMockMode) {
        const adv = mockUsersDb.get(adviserId);
        if (adv) {
          adviserName = adv.fullName;
          adviserEmail = adv.email;
        }
      } else {
        const advDoc = await db.collection('users').doc(adviserId).get();
        if (advDoc.exists) {
          adviserName = advDoc.data().fullName;
          adviserEmail = advDoc.data().email;
        }
      }
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      proposalId: proposalId || '',
      title,
      studentId,
      studentName: studentName || 'Student Researcher',
      adviserId: adviserId || '',
      adviserName,
      adviserEmail,
      panelistIds: [],
      department: department || 'Computer Studies',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      seedMockProjectsIfEmpty();
      const map = mockFirestoreDb.get('projects');
      map.set(newProject.id, newProject);
    } else {
      await db.collection('research_projects').doc(newProject.id).set(newProject);
    }

    // Instantiation in MongoDB (Phase 4)
    let mongoSuccess = false;
    try {
      if (mongoose.connection.readyState === 1) {
        await MongoDocument.findOneAndUpdate(
          { id: newProject.id },
          {
            $set: {
              title: newProject.title,
              authors: [newProject.studentId],
              adviser: newProject.adviserId,
              panelists: newProject.panelistIds,
              status: 'draft'
            },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, new: true }
        );
        mongoSuccess = true;
      }
    } catch (mongoErr) {
      console.error('[ProjectController] MongoDB init error:', mongoErr.message);
    }

    // [FINAL PRODUCTION ARCHITECTURE]
    // MongoDB is required for migrated project data. If MongoDB fails, we must rollback Firestore and throw an error.
    if (!mongoSuccess) {
      if (!isDevMockMode) {
        await db.collection('research_projects').doc(newProject.id).delete();
      } else {
        mockFirestoreDb.get('projects').delete(newProject.id);
      }
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Could not instantiate manuscript in authoritative database. Project creation aborted.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Research project created successfully.',
      data: newProject
    });
  } catch (error) {
    console.error('[ProjectController] createProject error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Assign or update Adviser for a project (Admin only)
 * Enforces configurable maximum adviser handling capacity and updates activeGroupsCount.
 */
export const assignAdviser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adviserId } = req.body;

    if (!adviserId) {
      return res.status(400).json({ success: false, error: 'adviserId is required' });
    }

    let adviserName = 'Adviser';
    let adviserEmail = '';
    let maxCapacity = 5;

    // Fetch adviser profile to verify existence and capacity limit
    if (mongoose.connection.readyState === 1) {
      try {
        const userDoc = await User.findOne({ uid: adviserId }).lean();
        if (userDoc) {
          adviserName = userDoc.fullName || `${userDoc.first_name || ''} ${userDoc.last_name || ''}`.trim() || userDoc.email;
          adviserEmail = userDoc.email || '';
          maxCapacity = Number(userDoc.maxCapacity ?? userDoc.maxAdvisees ?? 5);
        }
      } catch (userErr) {
        console.warn('[ProjectController] User query fallback:', userErr.message);
      }
    }

    if (adviserName === 'Adviser') {
      if (isDevMockMode) {
        const adv = mockUsersDb.get(adviserId);
        if (adv) {
          adviserName = adv.fullName;
          adviserEmail = adv.email;
          maxCapacity = Number(adv.maxCapacity ?? adv.maxAdvisees ?? 5);
        }
      } else if (db) {
        const doc = await db.collection('users').doc(adviserId).get();
        if (doc.exists) {
          const d = doc.data();
          adviserName = d.fullName || `${d.first_name || ''} ${d.last_name || ''}`.trim();
          adviserEmail = d.email || '';
          maxCapacity = Number(d.maxCapacity ?? d.maxAdvisees ?? 5);
        }
      }
    }

    // Determine current project's existing adviser
    let existingProject = null;
    if (isDevMockMode) {
      seedMockProjectsIfEmpty();
      const map = mockFirestoreDb.get('projects');
      existingProject = map.get(id);
    } else if (db) {
      const ref = db.collection('research_projects').doc(id);
      const docSnap = await ref.get();
      if (docSnap.exists) {
        existingProject = { id: docSnap.id, ...docSnap.data() };
      }
    }

    if (!existingProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const previousAdviserId = existingProject.adviserId;
    const isSameAdviser = previousAdviserId === adviserId;

    // Compute adviser's current active groups workload
    let currentWorkload = 0;
    if (isDevMockMode) {
      const map = mockFirestoreDb.get('projects');
      if (map) {
        currentWorkload = Array.from(map.values()).filter(
          (p) => p.adviserId === adviserId && p.id !== id && p.status !== 'archived'
        ).length;
      }
    } else if (db) {
      const snapshot = await db.collection('research_projects')
        .where('adviserId', '==', adviserId)
        .get();
      currentWorkload = snapshot.docs.filter(
        (d) => d.id !== id && d.data().status !== 'archived'
      ).length;
    }

    // Validate capacity: prevent assignment if adding this group exceeds the configured limit
    if (!isSameAdviser && currentWorkload >= maxCapacity) {
      return res.status(400).json({
        success: false,
        error: 'Capacity Exceeded',
        message: `Assignment Rejected: Adviser '${adviserName}' has reached maximum advising capacity (${currentWorkload}/${maxCapacity} groups). Cannot assign additional groups.`,
        currentWorkload,
        maxCapacity,
      });
    }

    // Persist assignment to project
    let updated = null;
    const updatedAt = new Date().toISOString();

    if (isDevMockMode) {
      const map = mockFirestoreDb.get('projects');
      existingProject.adviserId = adviserId;
      existingProject.adviserName = adviserName;
      existingProject.adviserEmail = adviserEmail;
      existingProject.updatedAt = updatedAt;
      map.set(id, existingProject);
      updated = existingProject;
    } else {
      const ref = db.collection('research_projects').doc(id);
      await ref.update({
        adviserId,
        adviserName,
        adviserEmail,
        updatedAt,
      });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    // Synchronize activeGroupsCount on both new and previous advisers
    const newActiveCount = currentWorkload + 1;
    if (mongoose.connection.readyState === 1) {
      try {
        await User.findOneAndUpdate({ uid: adviserId }, { activeGroupsCount: newActiveCount });
        if (previousAdviserId && previousAdviserId !== adviserId) {
          await User.findOneAndUpdate(
            { uid: previousAdviserId },
            { $inc: { activeGroupsCount: -1 } }
          );
        }
      } catch (syncErr) {
        console.warn('[ProjectController] sync activeGroupsCount warning:', syncErr.message);
      }
    }

    if (isDevMockMode) {
      const newAdv = mockUsersDb.get(adviserId);
      if (newAdv) newAdv.activeGroupsCount = newActiveCount;
      if (previousAdviserId && previousAdviserId !== adviserId) {
        const prevAdv = mockUsersDb.get(previousAdviserId);
        if (prevAdv) prevAdv.activeGroupsCount = Math.max(0, (prevAdv.activeGroupsCount || 1) - 1);
      }
    } else if (db) {
      try {
        await db.collection('users').doc(adviserId).set({ activeGroupsCount: newActiveCount }, { merge: true });
        if (previousAdviserId && previousAdviserId !== adviserId) {
          const prevRef = db.collection('users').doc(previousAdviserId);
          const prevDoc = await prevRef.get();
          if (prevDoc.exists) {
            const prevCount = Math.max(0, (prevDoc.data().activeGroupsCount || 1) - 1);
            await prevRef.update({ activeGroupsCount: prevCount });
          }
        }
      } catch (fsSyncErr) {
        console.warn('[ProjectController] Firestore users activeGroupsCount sync warning:', fsSyncErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Adviser '${adviserName}' assigned to project successfully (${newActiveCount}/${maxCapacity} groups).`,
      data: updated,
      workload: {
        activeGroupsCount: newActiveCount,
        maxCapacity,
      },
    });
  } catch (error) {
    console.error('[ProjectController] assignAdviser error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
