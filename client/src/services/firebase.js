import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyChJyE_4qv3ohqOCQmaJ-xmDhuQqeZWghM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "coreresearch-db63b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "coreresearch-db63b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "coreresearch-db63b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "530990293257",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:530990293257:web:61c08cb354e8fe70d7f3d8"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
