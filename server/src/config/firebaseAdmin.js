import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let auth = null;
let isDevMockMode = false;

// In-memory dev storage fallback for local development without live GCP credentials
const mockUsersDb = new Map();
const mockFirestoreDb = new Map();

try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'coreresearch-db63b',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      db = admin.firestore();
      auth = admin.auth();
      console.log('[FirebaseAdmin] Initialized with Service Account Credential');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'coreresearch-db63b';
      admin.initializeApp({
        projectId,
      });
      db = admin.firestore();
      auth = admin.auth();
      console.log(`[FirebaseAdmin] Initialized with Project ID '${projectId}'`);
    }
  } else {
    db = admin.firestore();
    auth = admin.auth();
  }
} catch (error) {
  console.warn('[FirebaseAdmin] Warning during Admin SDK initialization:', error.message);
  isDevMockMode = true;
}

export { admin, db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb };
