import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

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
    studentIdOrEmployeeId: data.studentIdOrEmployeeId || '',
    status: data.status || 'active',
    is_approved: data.is_approved !== undefined ? Boolean(data.is_approved) : true,
    profile_image: data.profile_image || data.photoURL || data.picture || '',
    created_at: data.created_at || data.createdAt || now,
    updated_at: now,
    createdAt: data.createdAt || data.created_at || now,
    updatedAt: now
  };
};

/**
 * Register or synchronize user profile document in Firestore
 */
export const registerUserSync = async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'uid and email are required fields.'
      });
    }

    const role = req.body.role || req.body.role_id || 'student';
    const validRoles = ['student', 'adviser', 'panelist', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid role '${role}'. Allowed roles: ${validRoles.join(', ')}`
      });
    }

    const userProfile = buildUserProfileDoc(req.body);

    // Update in-memory mock cache
    mockUsersDb.set(uid, userProfile);

    // Persist to Firestore if initialized
    if (db) {
      try {
        await db.collection('users').doc(uid).set(userProfile, { merge: true });
        console.log(`[AuthController] Synchronized user document in Firestore for UID: ${uid}`);
      } catch (dbErr) {
        console.warn(`[AuthController] Firestore write warning (cached locally): ${dbErr.message}`);
      }
    }

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

    // Fetch existing document from Firestore if available
    if (db) {
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
