import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

/**
 * Register or initialize user record in Firestore
 */
export const registerUserSync = async (req, res) => {
  try {
    const { uid, email, fullName, role, department, studentIdOrEmployeeId } = req.body;

    if (!uid || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'uid, email, and role are required fields.'
      });
    }

    const validRoles = ['student', 'adviser', 'panelist', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid role '${role}'. Allowed roles: ${validRoles.join(', ')}`
      });
    }

    const userProfile = {
      uid,
      email,
      fullName: fullName || email.split('@')[0],
      role,
      department: department || 'Computer Studies',
      studentIdOrEmployeeId: studentIdOrEmployeeId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDevMockMode) {
      mockUsersDb.set(uid, userProfile);
    } else {
      try {
        await db.collection('users').doc(uid).set(userProfile, { merge: true });
      } catch (dbErr) {
        console.warn('[AuthController] Firestore write warning (saving to in-memory mock):', dbErr.message);
        mockUsersDb.set(uid, userProfile);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'User registered and synchronized successfully.',
      data: userProfile
    });
  } catch (error) {
    console.error('[AuthController] registerUserSync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Synchronize user profile on login and return profile with role
 */
export const loginSync = async (req, res) => {
  try {
    const user = req.user; // Set by verifyToken middleware

    let profile = user;

    if (!isDevMockMode && db) {
      try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (doc.exists) {
          profile = { ...user, ...doc.data() };
        }
      } catch (dbErr) {
        console.warn('[AuthController] Firestore read warning (using in-memory mock):', dbErr.message);
        const mock = mockUsersDb.get(user.uid);
        if (mock) profile = mock;
      }
    } else {
      const mock = mockUsersDb.get(user.uid);
      if (mock) {
        profile = mock;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User authenticated successfully.',
      data: profile
    });
  } catch (error) {
    console.error('[AuthController] loginSync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};


/**
 * Get current authenticated user profile
 */
export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user
  });
};
