// server/src/services/storage/SupabaseStorageProvider.js
import { createClient } from '@supabase/supabase-js';
import { IStorageProvider } from './IStorageProvider.js';

export class SupabaseStorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.name = 'supabase';
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'documents';
    
    this.isConfigured = Boolean(this.supabaseUrl && this.supabaseKey);
    if (this.isConfigured) {
      this.client = createClient(this.supabaseUrl, this.supabaseKey);
    } else {
      this.client = null;
    }
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    if (!this.client) {
      throw new Error('Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
    }

    const cleanKey = key.replace(/^\/+/, '');

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(cleanKey, buffer, {
        contentType: mimeType,
        upsert: true,
        metadata,
      });

    if (error) {
      throw new Error(`Supabase Storage upload error: ${error.message}`);
    }

    return {
      storageKey: cleanKey,
      storageProvider: this.name,
      url: this.resolveUrl(cleanKey),
    };
  }

  resolveUrl(key) {
    if (!this.client) {
      return `/api/storage/assets/${key.replace(/^\/+/, '')}`;
    }
    const cleanKey = key.replace(/^\/+/, '');
    const { data } = this.client.storage.from(this.bucketName).getPublicUrl(cleanKey);
    return data?.publicUrl || `/api/storage/assets/${cleanKey}`;
  }

  async delete(key) {
    if (!this.client) return;
    const cleanKey = key.replace(/^\/+/, '');
    await this.client.storage.from(this.bucketName).remove([cleanKey]);
  }
}

export default SupabaseStorageProvider;
