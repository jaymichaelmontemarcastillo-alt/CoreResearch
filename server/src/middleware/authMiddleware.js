import { auth, db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

/**
 * Middleware to verify Firebase Authorization token or dev bearer token.
 * Attaches req.user = { uid, email, role, fullName, department }
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
    if (isDevMockMode) {
      // Development mock token handling format: dev-token-{uid}-{role} or custom token
      let uid = 'dev-user-id';
      let role = 'student';
      let email = 'dev@university.edu';
      let fullName = 'Developer User';

      if (token.startsWith('dev-token-')) {
        const parts = token.split('-');
        if (parts.length >= 4) {
          uid = parts.slice(2, -1).join('-');
          role = parts[parts.length - 1];
        }
      }

      const existingMock = mockUsersDb.get(uid);
      if (existingMock) {
        req.user = existingMock;
      } else {
        req.user = { uid, email: `${role}@university.edu`, role, fullName: `Demo ${role.toUpperCase()}` };
      }
      return next();
    }

    // Live Firebase Token Verification
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, email } = decodedToken;

    // Fetch user role & profile details from Firestore users collection
    let userDoc = await db.collection('users').doc(uid).get();
    let userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      // Default fallback if user doc is being synced
      userData = {
        uid,
        email,
        role: decodedToken.role || 'student',
        fullName: decodedToken.name || email.split('@')[0],
      };
    }

    req.user = {
      uid,
      email,
      role: userData.role || 'student',
      fullName: userData.fullName || email,
      department: userData.department || 'General'
    };

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.'
    });
  }
};

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Accepts array of allowed roles, e.g. requireRole(['admin', 'adviser'])
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
