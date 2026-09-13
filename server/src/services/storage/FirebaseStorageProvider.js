import { IStorageProvider } from './IStorageProvider.js';
import { admin } from '../../config/firebaseAdmin.js';

export class FirebaseStorageProvider extends IStorageProvider {
  constructor() {
    super();
    // Use the default bucket configured in firebaseAdmin.js
    this.bucket = admin.storage().bucket();
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    const filename = key.replace(/^\/+/, '');
    const file = this.bucket.file(filename);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: metadata
      },
      resumable: false
    });

    return {
      storageKey: filename,
      storageProvider: 'firebase',
      url: this.resolveUrl(filename)
    };
  }

  resolveUrl(key) {
    // Return standard assets path used by documentRoutes
    // This pipes the file through our backend, keeping the frontend API unchanged
    return `/api/storage/assets/${encodeURIComponent(key)}`;
  }

  async downloadStream(key) {
    const filename = key.replace(/^\/+/, '');
    const file = this.bucket.file(filename);

    const [exists] = await file.exists();
    if (!exists) return null;

    return file.createReadStream();
  }

  async delete(key) {
    const filename = key.replace(/^\/+/, '');
    const file = this.bucket.file(filename);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  }
}
