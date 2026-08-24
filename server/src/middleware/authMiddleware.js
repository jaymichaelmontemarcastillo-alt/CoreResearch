import { auth, db, mockUsersDb } from '../config/firebaseAdmin.js';

/**
 * Helper to safely decode JWT payload when offline or in dev fallback
 */
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBuf = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payloadBuf);
    }
  } catch (err) {
    return null;
  }
  return null;
};

/**
 * Middleware to verify Firebase Authorization token or dev bearer token.
 * Attaches req.user with all required profile fields.
 */
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    // 1. Dev token handling (format: dev-token-{uid}-{role})
    if (token.startsWith('dev-token-')) {
      let uid = 'dev-user-id';
      let role = 'student';

      const parts = token.split('-');
      if (parts.length >= 4) {
        uid = parts.slice(2, -1).join('-');
        role = parts[parts.length - 1];
      }

      const existingMock = mockUsersDb.get(uid);
      if (existingMock) {
        req.user = existingMock;
      } else {
        const nameParts = `Demo ${role.toUpperCase()}`.split(' ');
        req.user = {
          uid,
          email: `${role}@university.edu`,
          first_name: nameParts[0] || 'Demo',
          last_name: nameParts.slice(1).join(' ') || role.toUpperCase(),
          fullName: `Demo ${role.toUpperCase()}`,
          role,
          role_id: role,
          department: 'Computer Studies',
          department_id: 'Computer Studies',
          studentIdOrEmployeeId: 'DEMO-001',
          status: 'active',
          is_approved: true,
          profile_image: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return next();
    }

    // 2. Real Firebase Token Verification
    let decodedToken = null;
    try {
      if (auth) {
        decodedToken = await auth.verifyIdToken(token);
      }
    } catch (verifyErr) {
      console.warn('[AuthMiddleware] Firebase verifyIdToken warning:', verifyErr.message);
      // Attempt safe payload decoding if verifyIdToken fails in offline/dev environments
      decodedToken = decodeJwtPayload(token);
    }

    if (!decodedToken || (!decodedToken.uid && !decodedToken.user_id)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.'
      });
    }

    const uid = decodedToken.uid || decodedToken.user_id;
    const email = decodedToken.email || '';
    const name = decodedToken.name || email.split('@')[0] || 'User';
    const picture = decodedToken.picture || '';

    // 3. Fetch user profile from Firestore or mock DB safely
    let userData = null;
    if (db) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (dbErr) {
        console.warn('[AuthMiddleware] Firestore read warning (using in-memory fallback):', dbErr.message);
      }
    }

    if (!userData) {
      userData = mockUsersDb.get(uid) || null;
    }

    const nameParts = (userData?.fullName || name).trim().split(' ');
    const first_name = userData?.first_name || nameParts[0] || 'User';
    const last_name = userData?.last_name || nameParts.slice(1).join(' ') || '';

    req.user = {
      uid,
      email: userData?.email || email,
      first_name,
      last_name,
      fullName: userData?.fullName || `${first_name} ${last_name}`.trim(),
      role: userData?.role || 'student',
      role_id: userData?.role_id || userData?.role || 'student',
      department: userData?.department || 'Computer Studies',
      department_id: userData?.department_id || userData?.department || 'Computer Studies',
      studentIdOrEmployeeId: userData?.studentIdOrEmployeeId || '',
      status: userData?.status || 'active',
      is_approved: userData?.is_approved !== undefined ? userData.is_approved : true,
      profile_image: userData?.profile_image || picture || '',
      created_at: userData?.created_at || userData?.createdAt || new Date().toISOString(),
      updated_at: userData?.updated_at || userData?.updatedAt || new Date().toISOString()
    };

    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Exception during token verification:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed.'
    });
  }
};

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User authentication required.'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: [${roles.join(', ')}]. Current role: '${req.user.role}'.`
      });
    }

    next();
  };
};
