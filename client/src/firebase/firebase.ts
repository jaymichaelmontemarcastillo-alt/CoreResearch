import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

/**
 * Dito sinesetup yung main connection natin sa Firebase.
 * Kumukuha ng config mula sa .env variables (via Vite) para secure.
 * Connected ito sa buong app kasi lahat ng Firebase services (Auth, Firestore, Storage)
 * dito kumukuha ng main instance.
 */
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env as any : {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Check whether essential environment variables are populated
const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const;

const isConfigValid = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const isDev = Boolean(env.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'));

if (isDev && !isConfigValid) {
  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key as keyof typeof firebaseConfig]);
  console.error(
    `[Firebase Config Error]: Missing environment variables in client/.env.local:\n` +
    missingKeys
      .map((key) => ` - VITE_FIREBASE_${key.replace(/[A-Z]/g, (l) => `_${l}`).toUpperCase()}`)
      .join('\n') +
    `\n\nPlease create a .env.local file in the client/ root directory using .env.example as a reference.`
  );
}

/**
 * Singleton Firebase Application Instance.
 * Uses dummy fallbacks if environment variables are completely missing to prevent unhandled React app crashes.
 */
const app: FirebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp(
      isConfigValid
        ? firebaseConfig
        : {
          apiKey: 'dummy-api-key',
          authDomain: 'dummy-project.firebaseapp.com',
          projectId: 'dummy-project',
          storageBucket: 'dummy-project.appspot.com',
          messagingSenderId: '000000000000',
          appId: '1:000000000000:web:000000000000',
        }
    );

/**
 * Core Firebase Modular SDK Services
 * Ito yung mga main services na gagamitin natin sa ibat-ibang modules.
 */
// Ito yung gagamitin for User Authentication (Login, Register, Google).
// Pag nag-login ang user dito, magpo-provide ito ng UID.
const auth: Auth = getAuth(app);

// Ito yung connection sa Firestore database natin. 
// Dito ise-save yung "users" collection (para sa roles at profile) pati iba pang app data.
const db: Firestore = getFirestore(app);

// Para sa file uploads like profile pictures o manuscript documents.
const storage: FirebaseStorage = getStorage(app);

/**
 * Configured Auth Providers
 * Ginagamit ito sa Login at Register para sa "Sign in with Google" flow.
 */
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Conditional Firebase Analytics Instance (browser environment check)
 */
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => console.error('[Firebase Analytics]: Failed to initialize', err));
}

export { app, auth, db, storage, googleProvider, analytics };
export default app;
