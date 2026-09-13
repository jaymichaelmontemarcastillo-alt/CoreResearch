import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';
import { GridFsStorageProvider } from './GridFsStorageProvider.js';
import { FirebaseStorageProvider } from './FirebaseStorageProvider.js';
import mongoose from 'mongoose';

let activeProvider = null;

export const getStorageProvider = () => {
  if (activeProvider) return activeProvider;

  if (process.env.FIREBASE_STORAGE_BUCKET) {
    console.log('[StorageManager] Using FirebaseStorageProvider for persistent assets');
    activeProvider = new FirebaseStorageProvider();
  } else if (mongoose.connection.readyState === 1 || process.env.NODE_ENV === 'production') {
    console.log('[StorageManager] Using GridFsStorageProvider for persistent assets');
    activeProvider = new GridFsStorageProvider();
  } else {
    console.log('[StorageManager] Using LocalStorageProvider for local development storage fallback');
    activeProvider = new LocalStorageProvider();
  }

  return activeProvider;
};

export const localStorageProvider = new LocalStorageProvider();
export default getStorageProvider;
