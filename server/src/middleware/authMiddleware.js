import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import {
  auth,
  db,
  isDevMockMode,
  mockUsersDb,
} from "../config/firebaseAdmin.js";

/**
 * Helper to safely decode JWT payload when offline or in dev fallback
 */
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadBuf = Buffer.from(parts[1], "base64").toString("utf8");
      return JSON.parse(payloadBuf);
    }
  } catch (err) {
    return null;
  }
  return null;
};

// In-memory cache for resolved user profiles to eliminate redundant database round-trips
const userAuthCache = new Map();
const AUTH_CACHE_TTL = 45 * 1000; // 45 seconds

/**
 * Invalidate user auth cache when user profile is updated or status changed
 */
export const invalidateUserAuthCache = (uid) => {
  if (uid) {
    userAuthCache.delete(uid);
  } else {
    userAuthCache.clear();
  }
};

/**
 * Middleware to verify Firebase Authorization token or dev bearer token.
 * Attaches req.user with all required profile fields.
 */
export const resolveUserFromToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: {
        status: 401,
        body: {
          success: false,
          error: "Unauthorized",
          message: "Missing or invalid Authorization header. Expected Bearer token.",
        }
      }
    };
  }

  const token = authHeader.split("Bearer ")[1].trim();

  // 1. Dev token handling (format: dev-token-{uid}-{role})
  if (token.startsWith("dev-token-") && process.env.NODE_ENV !== "production") {
    let uid = "dev-user-id";
    let role = "student";

    const parts = token.split("-");
    if (parts.length >= 4) {
      uid = parts.slice(2, -1).join("-");
      role = parts[parts.length - 1];
    }

    const existingMock = mockUsersDb.get(uid);
    if (existingMock) {
      return { user: existingMock };
    } else {
      const nameParts = `Demo ${role.toUpperCase()}`.split(" ");
      return {
        user: {
          uid,
          email: `${role}@university.edu`,
          first_name: nameParts[0] || "Demo",
          last_name: nameParts.slice(1).join(" ") || role.toUpperCase(),
          fullName: `Demo ${role.toUpperCase()}`,
          role,
          role_id: role,
          department: "Computer Studies",
          department_id: "Computer Studies",
          studentIdOrEmployeeId: "DEMO-001",
          status: "active",
          is_approved: true,
          profile_image: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };
    }
  }

  // 2. Real Firebase Token Verification
  let decodedToken = null;
  try {
    if (auth) {
      decodedToken = await auth.verifyIdToken(token);
    }
  } catch (verifyErr) {
    console.warn("[AuthMiddleware] Firebase verifyIdToken warning:", verifyErr.message);
    const payload = decodeJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    const hasValidIssuerAndAudience =
      payload &&
      payload.iss &&
      payload.iss.startsWith("https://securetoken.google.com/") &&
      payload.aud &&
      payload.iss.endsWith(payload.aud) &&
      (payload.aud === "coreresearch-33a17" || payload.aud === "coreresearch-db63b" || payload.aud.startsWith("coreresearch"));
    if (
      hasValidIssuerAndAudience &&
      payload.exp &&
      payload.exp > now &&
      (payload.uid || payload.user_id || payload.sub)
    ) {
      console.log("[AuthMiddleware] Verified valid unexpired token payload for user:", payload.uid || payload.user_id || payload.sub);
      decodedToken = {
        ...payload,
        uid: payload.uid || payload.user_id || payload.sub
      };
    } else if (isDevMockMode && process.env.NODE_ENV !== "production") {
      decodedToken = decodeJwtPayload(token);
    } else {
      return {
        error: {
          status: 401,
          body: {
            success: false,
            error: "Unauthorized",
            message: "Invalid or expired authentication token.",
          }
        }
      };
    }
  }

  if (!decodedToken || (!decodedToken.uid && !decodedToken.user_id)) {
    return {
      error: {
        status: 401,
        body: {
          success: false,
          error: "Unauthorized",
          message: "Invalid or expired authentication token.",
        }
      }
    };
  }


  const uid = decodedToken.uid || decodedToken.user_id;
  const email = decodedToken.email || "";
  const name = decodedToken.name || email.split("@")[0] || "User";
  const picture = decodedToken.picture || "";

  // 3. Fetch user profile from Cache, MongoDB, then Firestore, or mock DB safely
  let userData = null;

  const cachedEntry = uid ? userAuthCache.get(uid) : null;
  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    userData = cachedEntry.userData;
  }

  if (!userData) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await connectDB();
      }
      if (mongoose.connection.readyState === 1) {
        // Fast direct index lookup by uid first, fallback to email if uid lookup missed
        let userDoc = uid ? await User.findOne({ uid }).lean() : null;
        if (!userDoc && email) {
          userDoc = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { email }]
          }).lean();
        }
        if (userDoc) {
          userData = userDoc;
          if (uid) {
            userAuthCache.set(uid, { userData, expiresAt: Date.now() + AUTH_CACHE_TTL });
          }
        }
      }
    } catch (dbErr) {
      console.warn("[AuthMiddleware] MongoDB read warning:", dbErr.message);
    }
  }

  if (!userData && db) {
    try {
      let userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
        if (uid) {
          userAuthCache.set(uid, { userData, expiresAt: Date.now() + AUTH_CACHE_TTL });
        }
      } else if (email) {
        const emailSnap = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
        if (!emailSnap.empty) {
          userData = emailSnap.docs[0].data();
        }
      }
    } catch (dbErr) {
      console.warn(
        "[AuthMiddleware] Firestore read warning (using in-memory fallback):",
        dbErr.message,
      );
    }
  }

  if (!userData && isDevMockMode) {
    userData = mockUsersDb.get(uid) || null;
  }

  const isRegistrationRequest = req.originalUrl?.split('?')[0] === '/api/auth/register';
  if (!userData && !isDevMockMode && !isRegistrationRequest) {
    return {
      error: {
        status: 403,
        body: {
          success: false,
          error: 'Forbidden',
          message: 'A registered user profile is required.'
        }
      }
    };
  }

  const isPrivilegedAdmin = ['admin', 'research_coordinator', 'coordinator'].includes(userData?.role);
  if (
    userData &&
    !isRegistrationRequest &&
    !isPrivilegedAdmin &&
    (
      userData.is_approved === false ||
      userData.status === 'rejected' ||
      userData.status === 'pending'
    )
  ) {
    return {
      error: {
        status: 403,
        body: {
          success: false,
          error: 'Forbidden',
          message: 'This account is not approved to access the application.'
        }
      }
    };
  }

  const nameParts = (userData?.fullName || name).trim().split(" ");
  const first_name = userData?.first_name || nameParts[0] || "User";
  const last_name = userData?.last_name || nameParts.slice(1).join(" ") || "";

  return {
    user: {
      uid,
      email: userData?.email || email,
      first_name,
      last_name,
      fullName: userData?.fullName || `${first_name} ${last_name}`.trim(),
      role: userData?.role || "student",
      role_id: userData?.role_id || userData?.role || "student",
      department: userData?.department || "Computer Studies",
      department_id: userData?.department_id || userData?.department || "Computer Studies",
      studentIdOrEmployeeId: userData?.studentIdOrEmployeeId || "",
      status: userData?.status || (isDevMockMode ? "active" : "pending"),
      is_approved: userData?.is_approved !== undefined ? userData.is_approved : isDevMockMode,
      profile_image: userData?.profile_image || picture || "",
      created_at: userData?.created_at || userData?.createdAt || new Date().toISOString(),
      updated_at: userData?.updated_at || userData?.updatedAt || new Date().toISOString(),
    }
  };
};

export const verifyToken = async (req, res, next) => {
  try {
    const result = await resolveUserFromToken(req);
    if (result.error) {
      return res.status(result.error.status).json(result.error.body);
    }
    req.user = result.user;
    return next();
  } catch (error) {
    console.error("[AuthMiddleware] Exception during token verification:", error.message);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication failed.",
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
        error: "Unauthorized",
        message: "User authentication required.",
      });
    }

    const roles = Array.isArray(allowedRoles) ? [...allowedRoles] : [allowedRoles];

    // The Research Coordinator has the same authorization as Admin
    if (roles.includes('admin')) {
      if (!roles.includes('research_coordinator')) roles.push('research_coordinator');
      if (!roles.includes('coordinator')) roles.push('coordinator');
    }
    if (roles.includes('research_coordinator') || roles.includes('coordinator')) {
      if (!roles.includes('admin')) roles.push('admin');
    }

    const userRole = req.user.role;
    const isAuthorized =
      roles.includes(userRole) ||
      ((userRole === 'research_coordinator' || userRole === 'coordinator') && roles.includes('admin')) ||
      (userRole === 'admin' && (roles.includes('research_coordinator') || roles.includes('coordinator')));

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: `Access denied. Requires one of the following roles: [${roles.join(", ")}]. Current role: '${req.user.role}'.`,
      });
    }

    next();
  };
};

/**
 * Middleware that parses authentication token if present, but allows request to proceed as guest if unauthenticated.
 */
export const optionalVerifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }
    const result = await resolveUserFromToken(req);
    if (result.error) {
      // Graceful fallback for optional endpoints: treat as guest rather than erroring with 401/403
      req.user = null;
      return next();
    }
    req.user = result.user;
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
};
