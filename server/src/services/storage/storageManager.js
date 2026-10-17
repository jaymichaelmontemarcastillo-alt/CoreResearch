import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';
import { GridFsStorageProvider } from './GridFsStorageProvider.js';
import { FirebaseStorageProvider } from './FirebaseStorageProvider.js';
import mongoose from 'mongoose';

let activeProvider = null;

export const getStorageProvider = () => {
  if (activeProvider) return activeProvider;

  // Explicit override: STORAGE_PROVIDER=local | gridfs | firebase
  const forced = (process.env.STORAGE_PROVIDER || '').toLowerCase().trim();
  if (forced === 'local') {
    console.log('[StorageManager] STORAGE_PROVIDER=local -> LocalStorageProvider');
    activeProvider = new LocalStorageProvider();
    return activeProvider;
  }
  if (forced === 'gridfs') {
    console.log('[StorageManager] STORAGE_PROVIDER=gridfs -> GridFsStorageProvider');
    activeProvider = new GridFsStorageProvider();
    return activeProvider;
  }
  if (forced === 'firebase') {
    console.log('[StorageManager] STORAGE_PROVIDER=firebase -> FirebaseStorageProvider');
    activeProvider = new FirebaseStorageProvider();
    return activeProvider;
  }

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

/**
 * Providers to try (in order) when READING an asset. Lets files written by a
 * previous provider (e.g. GridFS) still resolve after switching to local in dev.
 */
let gridFsReadFallback = null;
export const getReadProviders = () => {
  const primary = getStorageProvider();
  const list = [primary];
  if (!(primary instanceof LocalStorageProvider)) list.push(localStorageProvider);
  if (!(primary instanceof GridFsStorageProvider) && mongoose.connection.readyState === 1) {
    gridFsReadFallback = gridFsReadFallback || new GridFsStorageProvider();
    list.push(gridFsReadFallback);
  }
  return list;
};

export const localStorageProvider = new LocalStorageProvider();
export default getStorageProvider;
