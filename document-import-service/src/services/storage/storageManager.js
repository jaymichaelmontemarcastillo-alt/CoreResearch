// server/src/services/storage/storageManager.js
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';
import { GridFsStorageProvider } from './GridFsStorageProvider.js';
import mongoose from 'mongoose';

let activeProvider = null;

export const getStorageProvider = () => {
  if (activeProvider) return activeProvider;

  // Since Phase 7, MongoDB GridFS is the primary object storage provider
  // It relies on mongoose connection being established by server.js
  if (mongoose.connection.readyState === 1 || process.env.NODE_ENV === 'production') {
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
