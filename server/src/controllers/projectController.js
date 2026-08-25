import mongoose from 'mongoose';
import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';
import { Document as MongoDocument } from '../models/Document.js';

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

    if (isDevMockMode) {
      const adv = mockUsersDb.get(adviserId);
      if (adv) {
        adviserName = adv.fullName;
        adviserEmail = adv.email;
      }
    } else {
      const doc = await db.collection('users').doc(adviserId).get();
      if (doc.exists) {
        adviserName = doc.data().fullName;
        adviserEmail = doc.data().email;
      }
    }

    let updated = null;

    if (isDevMockMode) {
      seedMockProjectsIfEmpty();
      const map = mockFirestoreDb.get('projects');
      const proj = map.get(id);
      if (!proj) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      proj.adviserId = adviserId;
      proj.adviserName = adviserName;
      proj.adviserEmail = adviserEmail;
      proj.updatedAt = new Date().toISOString();
      map.set(id, proj);
      updated = proj;
    } else {
      const ref = db.collection('research_projects').doc(id);
      await ref.update({
        adviserId,
        adviserName,
        adviserEmail,
        updatedAt: new Date().toISOString()
      });
      const doc = await ref.get();
      updated = { id: doc.id, ...doc.data() };
    }

    return res.status(200).json({
      success: true,
      message: `Adviser '${adviserName}' assigned to project successfully.`,
      data: updated
    });
  } catch (error) {
    console.error('[ProjectController] assignAdviser error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
