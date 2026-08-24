import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let auth = null;
let isDevMockMode = false;

// In-memory dev storage fallback for local development without live GCP credentials
const mockUsersDb = new Map();
const mockFirestoreDb = new Map();

import fs from 'fs';
import path from 'path';

try {
  if (!admin.apps.length) {
    const rootDir = process.cwd();
    const parentDir = path.resolve(rootDir, '..');
    
    // Discover any service account key file in the server or root directories
    const findServiceAccount = () => {
      const dirsToSearch = [rootDir, parentDir];
      for (const dir of dirsToSearch) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === 'serviceAccountKey.json' || (file.includes('firebase-adminsdk') && file.endsWith('.json'))) {
            return path.resolve(dir, file);
          }
        }
      }
      return null;
    };

    const foundServiceAccount = findServiceAccount();

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
      console.log('[FirebaseAdmin] Initialized successfully with Service Account Environment Variables');
    } else if (foundServiceAccount) {
      const serviceAccount = JSON.parse(fs.readFileSync(foundServiceAccount, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      auth = admin.auth();
      console.log(`[FirebaseAdmin] Initialized successfully with Service Account JSON file: ${foundServiceAccount}`);
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing required production Firebase credentials (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL). Refusing to start mock mode in production.');
      }
      console.log('[FirebaseAdmin] Running in local mock mode (in-memory db) - Initializing auth for token verification');
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'coreresearch-33a17'
      });
      auth = admin.auth();
      try {
        db = admin.firestore();
      } catch (dbErr) {
        console.warn('[FirebaseAdmin] Could not initialize firestore locally:', dbErr.message);
      }
      isDevMockMode = true;
    }
  } else {
    db = admin.firestore();
    auth = admin.auth();
  }
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FirebaseAdmin] CRITICAL ERROR: Failed to initialize Firebase Admin in production.', error);
    process.exit(1);
  }
  console.warn('[FirebaseAdmin] Warning during Admin SDK initialization, falling back to mock mode:', error.message);
  isDevMockMode = true;
}

export { admin, db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb };
