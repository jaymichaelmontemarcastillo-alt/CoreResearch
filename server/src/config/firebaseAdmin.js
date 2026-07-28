import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db;
let auth;
let isDevMockMode = false;

// In-memory dev storage fallback for local development without live GCP credentials
const mockUsersDb = new Map();
const mockFirestoreDb = new Map();

try {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    db = admin.firestore();
    auth = admin.auth();
    console.log('[FirebaseAdmin] Initialized with Service Account Credential');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    db = admin.firestore();
    auth = admin.auth();
    console.log('[FirebaseAdmin] Initialized with Project ID (ADC/Emulator mode)');
  } else {
    isDevMockMode = true;
    console.warn('[FirebaseAdmin] Credentials not detected. Running in Local Development Mock Mode.');
  }
} catch (error) {
  console.warn('[FirebaseAdmin] Error initializing Admin SDK, falling back to Dev Mock Mode:', error.message);
  isDevMockMode = true;
}

export { admin, db, auth, isDevMockMode, mockUsersDb, mockFirestoreDb };
