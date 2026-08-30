import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

// Seed initial mock users into mock storage if empty
export const seedMockUsersIfEmpty = () => {
  if (mockUsersDb.size === 0) {
    const initialUsers = [
      { uid: 'dev-student-01', email: 'alex.rivera@university.edu', fullName: 'Alex Rivera', role: 'student', department: 'Computer Science', studentIdOrEmployeeId: '2022-10482', createdAt: new Date().toISOString() },
      { uid: 'dev-student-02', email: 'maria.santos@university.edu', fullName: 'Maria Santos', role: 'student', department: 'Information Technology', studentIdOrEmployeeId: '2022-11093', createdAt: new Date().toISOString() },
      
      // NLP Test Adviser 1: Web / Info Systems
      { 
        uid: 'dev-adviser-01', email: 'maria.santos.adv@university.edu', fullName: 'Dr. Maria Santos', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-8821', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 2,
        specialization: ['Web Development', 'Information Systems'],
        expertise: ['Full-Stack Development', 'React', 'Node.js', 'System Architecture'],
        researchInterests: ['Web Application Architecture', 'Educational Technology', 'Research Management Systems'],
        keywords: ['web', 'software', 'architecture', 'management', 'systems', 'application'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 2: AI / ML
      { 
        uid: 'dev-adviser-02', email: 'juan.cruz@university.edu', fullName: 'Dr. Juan Cruz', role: 'adviser', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-4401', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 4, activeGroupsCount: 1,
        specialization: ['Artificial Intelligence', 'Data Science'],
        expertise: ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Predictive Modeling'],
        researchInterests: ['Natural Language Processing', 'Computer Vision', 'Predictive Analytics in Education'],
        keywords: ['machine', 'learning', 'neural', 'networks', 'predictive', 'ai', 'vision'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 3: Database Systems
      { 
        uid: 'dev-adviser-03', email: 'ana.reyes@university.edu', fullName: 'Dr. Ana Reyes', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-5502', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 0,
        specialization: ['Database Systems', 'Data Engineering'],
        expertise: ['SQL', 'NoSQL', 'Database Optimization', 'Data Warehousing'],
        researchInterests: ['Distributed Databases', 'Big Data Architecture', 'Query Optimization'],
        keywords: ['sql', 'nosql', 'data', 'warehousing', 'optimization', 'database'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 4: Data Analytics
      { 
        uid: 'dev-adviser-04', email: 'mark.garcia@university.edu', fullName: 'Dr. Mark Garcia', role: 'adviser', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-6603', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 3, activeGroupsCount: 3,
        specialization: ['Data Analytics', 'Statistics'],
        expertise: ['Data Visualization', 'Statistical Analysis', 'Business Intelligence'],
        researchInterests: ['Educational Data Mining', 'Learning Analytics', 'Dashboard Design'],
        keywords: ['analytics', 'big', 'data', 'visualization', 'mining', 'statistics'],
        createdAt: new Date().toISOString() 
      },
      // NLP Test Adviser 5: Networking / Cybersecurity
      { 
        uid: 'dev-adviser-05', email: 'carlo.mendoza@university.edu', fullName: 'Dr. Carlo Mendoza', role: 'adviser', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-7704', 
        status: 'active', is_approved: true, isAvailable: true, maxCapacity: 5, activeGroupsCount: 1,
        specialization: ['Networking', 'Cybersecurity'],
        expertise: ['Network Security', 'Penetration Testing', 'Cryptography'],
        researchInterests: ['IoT Security', 'Blockchain Security', 'Network Protocols'],
        keywords: ['security', 'encryption', 'protocols', 'iot', 'network', 'cybersecurity'],
        createdAt: new Date().toISOString() 
      },

      { uid: 'dev-panelist-01', email: 'prof.chen@university.edu', fullName: 'Prof. Marcus Chen', role: 'panelist', department: 'Information Technology', studentIdOrEmployeeId: 'EMP-5510', createdAt: new Date().toISOString() },
      { uid: 'dev-panelist-02', email: 'prof.gomez@university.edu', fullName: 'Prof. Sofia Gomez', role: 'panelist', department: 'Computer Science', studentIdOrEmployeeId: 'EMP-7712', createdAt: new Date().toISOString() },
      { uid: 'dev-admin-01', email: 'admin.chair@university.edu', fullName: 'Dean Elizabeth Warren', role: 'admin', department: 'Dean of Research Office', studentIdOrEmployeeId: 'ADM-0001', createdAt: new Date().toISOString() }
    ];

    initialUsers.forEach(user => mockUsersDb.set(user.uid, user));
  }
};

/**
 * Get all user profiles (Admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let usersList = [];
    let fetchedFromMongo = false;

    try {
      if (mongoose.connection.readyState === 1) {
        usersList = await User.find().lean();
        fetchedFromMongo = true;
      }
    } catch (mongoErr) {
      console.warn('[UserController] MongoDB read warning:', mongoErr.message);
    }

    if (!fetchedFromMongo) {
      if (isDevMockMode) {
        seedMockUsersIfEmpty();
        usersList = Array.from(mockUsersDb.values());
      } else {
        const snapshot = await db.collection('users').get();
        usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      }
    }

    if (role && role !== 'all') {
      usersList = usersList.filter(u => u.role === role);
    }

    if (search) {
      const q = search.toLowerCase();
      usersList = usersList.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.studentIdOrEmployeeId && u.studentIdOrEmployeeId.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      count: usersList.length,
      data: usersList
    });
  } catch (error) {
    console.error('[UserController] getAllUsers error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['student', 'adviser', 'panelist', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role '${role}'. Allowed: ${validRoles.join(', ')}`
      });
    }

    let savedToMongo = false;
    try {
      if (mongoose.connection.readyState === 1) {
        await User.findOneAndUpdate(
          { uid },
          { role, updatedAt: new Date().toISOString() },
          { new: true, upsert: false }
        );
        savedToMongo = true;
      }
    } catch (mongoErr) {
      console.warn('[UserController] MongoDB update warning:', mongoErr.message);
    }

    if (!savedToMongo) {
      if (isDevMockMode) {
        const existing = mockUsersDb.get(uid);
        if (existing) {
          existing.role = role;
          existing.updatedAt = new Date().toISOString();
          mockUsersDb.set(uid, existing);
        }
      } else if (db) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (doc.exists) {
          await userRef.update({ role, updatedAt: new Date().toISOString() });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      data: { uid, role }
    });
  } catch (error) {
    console.error('[UserController] updateUserRole error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update user profile (Admin only)
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;

    let savedToMongo = false;
    try {
      if (mongoose.connection.readyState === 1) {
        await User.findOneAndUpdate(
          { uid },
          { ...updates, updatedAt: new Date().toISOString() },
          { new: true, upsert: false }
        );
        savedToMongo = true;
      }
    } catch (mongoErr) {
      console.warn('[UserController] MongoDB update warning:', mongoErr.message);
    }

    if (!savedToMongo) {
      if (isDevMockMode) {
        const existing = mockUsersDb.get(uid);
        if (existing) {
          const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
          mockUsersDb.set(uid, updated);
        }
      } else if (db) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        if (doc.exists) {
          await userRef.update({ ...updates, updatedAt: new Date().toISOString() });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `User profile updated.`,
      data: { uid, ...updates }
    });
  } catch (error) {
    console.error('[UserController] updateUserProfile error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update authenticated user's own profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { 
      first_name, last_name, fullName, college, department, 
      studentIdOrEmployeeId, profile_image,
      specialization, expertise, researchInterests, keywords, selectedExpertise
    } = req.body;

    const updates = {
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (fullName !== undefined) {
      updates.fullName = fullName;
    } else if (first_name || last_name) {
      updates.fullName = `${first_name || ''} ${last_name || ''}`.trim();
    }
    if (college !== undefined) updates.college = college;
    if (department !== undefined) {
      updates.department = department;
      updates.department_id = department;
    }
    if (studentIdOrEmployeeId !== undefined) updates.studentIdOrEmployeeId = studentIdOrEmployeeId;
    if (profile_image !== undefined) updates.profile_image = profile_image;
    
    // Academic fields (arrays of strings)
    if (Array.isArray(specialization)) updates.specialization = specialization;
    if (Array.isArray(expertise)) updates.expertise = expertise;
    if (Array.isArray(researchInterests)) updates.researchInterests = researchInterests;
    if (Array.isArray(keywords)) updates.keywords = keywords;
    if (Array.isArray(selectedExpertise)) updates.selectedExpertise = selectedExpertise;

    let savedToMongo = false;
    try {
      if (mongoose.connection.readyState === 1) {
        await User.findOneAndUpdate(
          { uid },
          { ...updates, updatedAt: new Date().toISOString() },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        savedToMongo = true;
      }
    } catch (mongoErr) {
      console.warn('[UserController] MongoDB update warning:', mongoErr.message);
    }

    if (!savedToMongo) {
      if (isDevMockMode || !db) {
        const existing = mockUsersDb.get(uid) || {};
        const updated = { ...existing, uid, ...updates };
        mockUsersDb.set(uid, updated);
        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully.',
          data: updated
        });
      }

      const userRef = db.collection('users').doc(uid);
      await userRef.set(updates, { merge: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { uid, ...updates }
    });
  } catch (error) {
    console.error('[UserController] updateMyProfile error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Change authenticated user's password
 */
export const changeMyPassword = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const { newPassword } = req.body;

    if (!uid) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    if (isDevMockMode || !auth) {
      return res.status(200).json({
        success: true,
        message: 'Password updated successfully (Dev Mode).'
      });
    }

    await auth.updateUser(uid, { password: newPassword });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('[UserController] changeMyPassword error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
