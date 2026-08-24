// server/src/services/storage/storageManager.js
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

let activeProvider = null;

export const getStorageProvider = () => {
  if (activeProvider) return activeProvider;

  const supabaseProvider = new SupabaseStorageProvider();
  if (supabaseProvider.isConfigured) {
    console.log('[StorageManager] Using Supabase Storage Provider for persistent assets');
    activeProvider = supabaseProvider;
  } else {
    console.log('[StorageManager] Using LocalStorageProvider for local development storage');
    activeProvider = new LocalStorageProvider();
  }

  return activeProvider;
};

export const localStorageProvider = new LocalStorageProvider();
export default getStorageProvider;
