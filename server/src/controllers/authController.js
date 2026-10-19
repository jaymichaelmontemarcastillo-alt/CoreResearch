import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { auth, db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

/**
 * Helper to build a sanitized, complete user profile document with sensible defaults
 */
const buildUserProfileDoc = (data) => {
  const email = data.email || '';
  const fullName = data.fullName || `${data.firstName || data.first_name || ''} ${data.lastName || data.last_name || ''}`.trim() || email.split('@')[0] || 'User';
  
  const nameParts = fullName.trim().split(' ');
  const first_name = data.first_name || data.firstName || nameParts[0] || 'User';
  const last_name = data.last_name || data.lastName || nameParts.slice(1).join(' ') || '';

  const role = data.role || data.role_id || 'student';
  const department = data.department || data.department_id || 'Computer Studies';

  const now = new Date().toISOString();

  // Academic normalization
  const program = data.program || data.courseName || '';
  let programCode = data.programCode || '';
  if (!programCode) {
    if (program.includes('Computer Science') || data.courseId === 'bscs') programCode = 'BSCS';
    else if (program.includes('Information Technology') || data.courseId === 'bsit') programCode = 'BSIT';
    else if (role === 'student') programCode = 'BSIT';
  }

  let courseId = data.courseId || '';
  if (!courseId || courseId.length > 10) {
    courseId = programCode ? programCode.toLowerCase() : 'bsit';
  } else {
    courseId = courseId.toLowerCase();
  }

  const major = data.major || data.programSpecialization || '';
  let majorCode = data.majorCode || '';
  let specializationId = data.specializationId || '';
  if (!specializationId || specializationId.length > 10) {
    const specStr = (major || majorCode || '').toUpperCase();
    if (specStr.includes('WMAD')) { specializationId = 'wmad'; majorCode = 'WMAD'; }
    else if (specStr.includes('AMG')) { specializationId = 'amg'; majorCode = 'AMG'; }
    else if (specStr.includes('SMP')) { specializationId = 'smp'; majorCode = 'SMP'; }
    else if (specStr.includes('IS')) { specializationId = 'is'; majorCode = 'IS'; }
  } else {
    specializationId = specializationId.toLowerCase();
    if (!majorCode) majorCode = specializationId.toUpperCase();
  }

  const sectionName = data.sectionName || data.section || 'A';
  let sectionId = data.sectionId || '';
  if (!sectionId || sectionId === sectionName) {
    sectionId = `${courseId}-sec-${sectionName.toLowerCase()}`;
  }

  const enrollmentStatus = data.enrollmentStatus || (role === 'student' ? 'enrolled' : undefined);

  return {
    uid: data.uid,
    email,
    first_name,
    last_name,
    fullName: `${first_name} ${last_name}`.trim(),
    role,
    role_id: role,
    department,
    department_id: department,
    studentIdOrEmployeeId: data.studentIdOrEmployeeId || data.studentId || '',
    studentId: data.studentId || data.studentIdOrEmployeeId || '',
    program: program || (courseId === 'bscs' ? 'Bachelor of Science in Computer Science' : 'Bachelor of Science in Information Technology'),
    programCode,
    program_id: courseId,
    courseId,
    major: major || (majorCode ? `${majorCode}` : ''),
    majorCode,
    programSpecialization: major || (majorCode ? `${majorCode}` : ''),
    specializationId,
    section: sectionName,
    sectionName,
    sectionId,
    status: data.status || (['admin', 'research_coordinator', 'coordinator'].includes(role) ? 'active' : 'pending'),
    is_approved: data.is_approved !== undefined ? Boolean(data.is_approved) : ['admin', 'research_coordinator', 'coordinator'].includes(role),
    profile_image: data.profile_image || data.photoURL || data.picture || '',
    
    // Adviser fields
    isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
    maxCapacity: data.maxCapacity !== undefined ? Number(data.maxCapacity) : 5,
    activeGroupsCount: data.activeGroupsCount !== undefined ? Number(data.activeGroupsCount) : 0,
    expertise: Array.isArray(data.expertise) ? data.expertise : [],
    specialization: Array.isArray(data.specialization) ? data.specialization : [],
    researchInterests: Array.isArray(data.researchInterests) ? data.researchInterests : [],
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    selectedExpertise: Array.isArray(data.selectedExpertise) ? data.selectedExpertise : [],

    created_at: data.created_at || data.createdAt || now,
    updated_at: now,
    createdAt: data.createdAt || data.created_at || now,
    updatedAt: now
  };
};

const notifyAdminsOfRegistration = async (userProfile) => {
  if (!db || isDevMockMode) return;

  try {
    const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    const now = new Date().toISOString();
    const isStudent = userProfile.role === 'student';
    const notificationTitle = isStudent ? 'New Student Registration' : 'New Faculty Registration';
    const notificationMessage = isStudent
      ? `${userProfile.fullName} has registered a new Student account. Student ID: ${userProfile.studentIdOrEmployeeId} | Email: ${userProfile.email} | Program: ${userProfile.programCode || userProfile.program || 'BSIT'} | Major: ${userProfile.majorCode || userProfile.programSpecialization || 'None'} | Section: ${userProfile.sectionName || 'None'} | Status: Pending Approval`
      : `${userProfile.fullName} has registered a new Faculty/Adviser account. Email: ${userProfile.email} | Department: ${userProfile.department || 'College of Computer Studies'} | Status: Pending Approval`;

    if (adminSnapshot.empty) return;

    const batch = db.batch();
    adminSnapshot.docs.forEach((adminDoc) => {
      const notificationId = `registration-${userProfile.uid}-${adminDoc.id}`;
      const notificationRef = db.collection('notifications').doc(notificationId);
      const notification = {
        id: notificationId,
        userId: adminDoc.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'system',
        read: false,
        createdByUid: userProfile.uid,
        relatedId: userProfile.uid,
        ...(isStudent ? { relatedStudentId: userProfile.uid } : {}),
        link: '/admin/user-requests?tab=pending',
        linkUrl: '/admin/user-requests?tab=pending',
        createdAt: now,
      };

      batch.set(notificationRef, notification, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.warn('[AuthController] Admin registration notification warning:', error.message);
  }
};

/**
 * Register or synchronize user profile document in Firestore
 */
export const registerUserSync = async (req, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'uid and email are required fields.'
      });
    }

    if (req.body.uid !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'A user may only register their own authenticated account.'
      });
    }

    const role = req.body.role || req.body.role_id || 'student';
    const validRoles = ['student', 'adviser', 'panelist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid self-registration role '${role}'. Allowed: ${validRoles.join(', ')}`
      });
    }

    const userProfile = buildUserProfileDoc({
      ...req.body,
      uid,
      email,
      role,
      status: 'pending',
      is_approved: false
    });

    let savedToMongo = false;
    if (mongoose.connection.readyState === 1) {
      try {
        await User.findOneAndUpdate({ uid }, userProfile, { upsert: true, new: true, setDefaultsOnInsert: true });
        savedToMongo = true;
      } catch (mongoErr) {
        console.error('[AuthController] MongoDB registration write failed:', mongoErr.message);
        return res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          message: 'The profile could not be saved in the authoritative database.'
        });
      }
    }

    if (savedToMongo && !db && !isDevMockMode) {
      return res.status(503).json({
        success: false,
        error: 'Partial Persistence',
        message: 'The profile was saved in MongoDB, but Firestore is unavailable for profile synchronization.'
      });
    }
    if (db && !isDevMockMode) {
      try {
        await db.collection('users').doc(uid).set(userProfile, { merge: true });
      } catch (dbErr) {
        console.error('[AuthController] Firestore registration projection sync failed:', dbErr.message);
        return res.status(503).json({
          success: false,
          error: savedToMongo ? 'Partial Persistence' : 'Service Unavailable',
          message: savedToMongo
            ? 'The profile was saved in MongoDB, but its Firestore projection could not be synchronized.'
            : 'The profile could not be saved in Firestore.'
        });
      }
    } else if (!savedToMongo && !isDevMockMode) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'No persistent user profile store is available.'
      });
    }

    mockUsersDb.set(uid, userProfile);
    await notifyAdminsOfRegistration(userProfile);

    return res.status(201).json({
      success: true,
      message: 'User profile registered and synchronized successfully.',
      data: userProfile
    });
  } catch (error) {
    console.error('[AuthController] registerUserSync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to sync user profile.'
    });
  }
};

/**
 * Synchronize user profile on login and return complete profile
 */
export const loginSync = async (req, res) => {
  try {
    const user = req.user; // Set by verifyToken middleware

    let profileData = { ...user };

    // 1. Fetch existing document from MongoDB if available
    let fetchedFromMongo = false;
    try {
      if (mongoose.connection.readyState === 1) {
        const userDoc = await User.findOne({ uid: user.uid }).lean();
        if (userDoc) {
          profileData = { ...profileData, ...userDoc };
          fetchedFromMongo = true;
        } else {
          const initialDoc = buildUserProfileDoc(user);
          await User.findOneAndUpdate({ uid: user.uid }, initialDoc, { upsert: true, new: true, setDefaultsOnInsert: true });
          profileData = { ...profileData, ...initialDoc };
          fetchedFromMongo = true;
        }
      }
    } catch (mongoErr) {
      console.warn('[AuthController] MongoDB read warning:', mongoErr.message);
    }

    // 2. Fetch existing document from Firestore if available and Mongo failed
    if (!fetchedFromMongo && db) {
      try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (doc.exists) {
          profileData = { ...profileData, ...doc.data() };
        } else {
          // Document does not exist yet in Firestore - create default user profile doc
          const initialDoc = buildUserProfileDoc(user);
          try {
            await userRef.set(initialDoc, { merge: true });
          } catch (writeErr) {
            console.warn('[AuthController] Initial user creation write warning:', writeErr.message);
          }
          profileData = { ...profileData, ...initialDoc };
        }
      } catch (dbErr) {
        console.warn('[AuthController] Firestore read warning (using fallback profile):', dbErr.message);
        const mock = mockUsersDb.get(user.uid);
        if (mock) profileData = { ...profileData, ...mock };
      }
    } else {
      const mock = mockUsersDb.get(user.uid);
      if (mock) profileData = { ...profileData, ...mock };
    }

    // Ensure all 11 fields have complete defaults
    const finalProfile = buildUserProfileDoc(profileData);

    // Save back to mock db for consistency
    mockUsersDb.set(user.uid, finalProfile);

    if (fetchedFromMongo && db && !isDevMockMode) {
      try {
        await db.collection('users').doc(user.uid).set(finalProfile, { merge: true });
      } catch (syncError) {
        console.error('[AuthController] MongoDB-to-Firestore profile sync failed:', syncError.message);
        return res.status(503).json({
          success: false,
          error: 'Partial Persistence',
          message: 'The profile was loaded from MongoDB, but its Firestore projection could not be synchronized.'
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User authenticated successfully.',
      data: finalProfile
    });
  } catch (error) {
    console.error('[AuthController] loginSync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to execute login sync.'
    });
  }
};

/**
 * Get current authenticated user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    const profile = buildUserProfileDoc(req.user || {});
    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Endpoint to trigger database seeding via Admin SDK
 */
export const seedDatabaseEndpoint = async (req, res) => {
  try {
    const { runAdminFirestoreSeed } = await import('../scripts/seedFirestoreAdmin.js');
    const summary = await runAdminFirestoreSeed();
    return res.status(200).json({
      success: true,
      message: 'Firestore database successfully initialized.',
      data: summary
    });
  } catch (error) {
    console.error('[AuthController] seedDatabaseEndpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Database seeding failed.'
    });
  }
};

/**
 * Check if a student ID, employee ID, or email is already registered
 */
export const checkIdentifierAvailability = async (req, res) => {
  try {
    const { id, email } = req.query;

    if (id) {
      const trimmedId = String(id).trim();
      let exists = false;

      // Check MongoDB
      if (mongoose.connection.readyState === 1) {
        const found = await User.findOne({
          $or: [
            { studentIdOrEmployeeId: trimmedId },
            { studentId: trimmedId }
          ]
        }).lean();
        if (found) exists = true;
      }

      // Check Firestore if not found in MongoDB
      if (!exists && db) {
        try {
          const snap = await db.collection('users')
            .where('studentIdOrEmployeeId', '==', trimmedId)
            .limit(1)
            .get();
          if (!snap.empty) exists = true;
        } catch (fsErr) {
          console.warn('[AuthController] Firestore id check warning:', fsErr.message);
        }
      }

      return res.status(200).json({ success: true, exists });
    }

    if (email) {
      const trimmedEmail = String(email).trim().toLowerCase();
      let exists = false;

      if (auth) {
        try {
          const userRecord = await auth.getUserByEmail(trimmedEmail);
          if (userRecord) exists = true;
        } catch (authErr) {
          // 'auth/user-not-found' means it does not exist
        }
      }

      if (!exists && mongoose.connection.readyState === 1) {
        const found = await User.findOne({ email: trimmedEmail }).lean();
        if (found) exists = true;
      }

      return res.status(200).json({ success: true, exists });
    }

    return res.status(400).json({
      success: false,
      message: 'Please provide either ?id= or ?email= query parameter.'
    });
  } catch (error) {
    console.error('[AuthController] checkIdentifierAvailability error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Check approval status of a registered account by identifier (email or student/employee ID)
 */
export const checkRegistrationStatus = async (req, res) => {
  try {
    const { id, email } = req.query;
    if (!id && !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either ?id= or ?email= query parameter.'
      });
    }

    const trimmedId = id ? String(id).trim() : null;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;

    let userDoc = null;

    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      const orConditions = [];
      if (trimmedId) {
        orConditions.push({ studentIdOrEmployeeId: trimmedId });
        orConditions.push({ studentId: trimmedId });
      }
      if (trimmedEmail) {
        orConditions.push({ email: trimmedEmail });
      }
      if (orConditions.length > 0) {
        userDoc = await User.findOne({ $or: orConditions }).lean();
      }
    }

    // Check Firestore if not found in MongoDB
    if (!userDoc && db) {
      try {
        if (trimmedEmail) {
          const snap = await db.collection('users').where('email', '==', trimmedEmail).limit(1).get();
          if (!snap.empty) {
            userDoc = snap.docs[0].data();
          }
        }
        if (!userDoc && trimmedId) {
          const snap = await db.collection('users').where('studentIdOrEmployeeId', '==', trimmedId).limit(1).get();
          if (!snap.empty) {
            userDoc = snap.docs[0].data();
          }
        }
      } catch (fsErr) {
        console.warn('[AuthController] Firestore status check warning:', fsErr.message);
      }
    }

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'No account record found for the provided identifier.'
      });
    }

    const isApproved = userDoc.is_approved === true || userDoc.status === 'approved';
    const isRejected = userDoc.status === 'rejected';
    const status = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';

    return res.status(200).json({
      success: true,
      status,
      is_approved: isApproved,
      fullName: userDoc.fullName || `${userDoc.first_name || ''} ${userDoc.last_name || ''}`.trim() || 'Student Researcher',
      email: userDoc.email,
      studentId: userDoc.studentIdOrEmployeeId || userDoc.studentId || '',
      program: userDoc.program || '',
      programCode: userDoc.programCode || '',
      major: userDoc.major || userDoc.programSpecialization || '',
      section: userDoc.sectionName || userDoc.section || '',
      role: userDoc.role || 'student',
      rejectionReason: userDoc.rejectionReason || null,
      submittedAt: userDoc.created_at || userDoc.createdAt || null
    });
  } catch (error) {
    console.error('[AuthController] checkRegistrationStatus error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
