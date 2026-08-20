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
    const serviceAccountPaths = [
      path.resolve(rootDir, 'coreresearch-db63b-firebase-adminsdk-fbsvc-0143d15ef2.json'),
      path.resolve(rootDir, '..', 'coreresearch-db63b-firebase-adminsdk-fbsvc-0143d15ef2.json'),
    ];

    const foundServiceAccount = serviceAccountPaths.find(p => fs.existsSync(p));

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
      console.log('[FirebaseAdmin] Initialized with Service Account Environment Variables');
    } else if (foundServiceAccount) {
      const serviceAccount = JSON.parse(fs.readFileSync(foundServiceAccount, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      auth = admin.auth();
      console.log(`[FirebaseAdmin] Initialized with Service Account JSON file: ${foundServiceAccount}`);
    } else {
      console.log('[FirebaseAdmin] Running in local mock mode (in-memory db)');
      isDevMockMode = true;
    }
  } else {
    db = admin.firestore();
    auth = admin.auth();
  }
} catch (error) {
  console.warn('[FirebaseAdmin] Warning during Admin SDK initialization, falling back to mock mode:', error.message);
  isDevMockMode = true;
}

export { admin, db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb };
