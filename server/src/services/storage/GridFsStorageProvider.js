import { IStorageProvider } from './IStorageProvider.js';
import mongoose from 'mongoose';
import { Buffer } from 'buffer';

export class GridFsStorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.bucketName = 'storage'; // We will store files in storage.files and storage.chunks
    this.bucket = null;
  }

  getBucket() {
    if (this.bucket) return this.bucket;
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }
    const db = mongoose.connection.db;
    this.bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: this.bucketName,
    });
    return this.bucket;
  }

  async upload(key, buffer, mimeType, metadata = {}) {
    const bucket = this.getBucket();

    return new Promise((resolve, reject) => {
      // Remove any leading slashes for consistency
      const filename = key.replace(/^\/+/, '');

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimeType,
        metadata: metadata,
      });

      uploadStream.on('error', (err) => {
        reject(err);
      });

      uploadStream.on('finish', () => {
        resolve({
          storageKey: filename,
          storageProvider: 'gridfs',
          url: this.resolveUrl(filename),
        });
      });

      uploadStream.end(buffer);
    });
  }

  resolveUrl(key) {
    // Return standard assets path used by documentRoutes
    return `/api/storage/assets/${encodeURIComponent(key)}`;
  }

  async downloadStream(key) {
    const bucket = this.getBucket();
    const filename = key.replace(/^\/+/, '');

    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) return null;

    return bucket.openDownloadStreamByName(filename);
  }

  async delete(key) {
    const bucket = this.getBucket();
    const filename = key.replace(/^\/+/, '');

    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) return;

    for (const file of files) {
      await bucket.delete(file._id);
    }
  }
}
