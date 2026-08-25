// server/src/services/storage/LocalStorageProvider.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { IStorageProvider } from './IStorageProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory: server/uploads/
const UPLOADS_ROOT = path.resolve(__dirname, '../../../uploads');

export class LocalStorageProvider extends IStorageProvider {
  constructor(baseUrl = '') {
    super();
    this.name = 'local';
    this.baseUrl = baseUrl || process.env.CLIENT_ORIGIN || 'http://localhost:5000';
    if (!fs.existsSync(UPLOADS_ROOT)) {
      fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    }
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    const cleanKey = key.replace(/^\/+/, '');
    const targetFilePath = path.join(UPLOADS_ROOT, cleanKey);
    const targetDir = path.dirname(targetFilePath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetFilePath, buffer);

    return {
      storageKey: cleanKey,
      storageProvider: this.name,
      url: this.resolveUrl(cleanKey),
    };
  }

  resolveUrl(key) {
    const cleanKey = key.replace(/^\/+/, '');
    // Relative API endpoint for frontend proxy or direct server endpoint
    return `/api/storage/assets/${cleanKey}`;
  }

  async delete(key) {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async downloadStream(key) {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.createReadStream(filePath);
  }

  getFilePath(key) {
    const cleanKey = key.replace(/^\/+/, '');
    return path.join(UPLOADS_ROOT, cleanKey);
  }
}

export default LocalStorageProvider;
