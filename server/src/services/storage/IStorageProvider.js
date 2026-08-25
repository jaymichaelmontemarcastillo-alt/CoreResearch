// server/src/services/storage/IStorageProvider.js

/**
 * Storage Provider Interface
 * Abstract contract for storing persistent original document files and extracted assets.
 */
export class IStorageProvider {
  /**
   * Upload binary data with a specified key (e.g. documents/doc-123/original/source.docx)
   * @param {string} key - Unique path key
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - MIME type
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<{ storageKey: string, storageProvider: string, url: string }>}
   */
  async upload(key, buffer, mimeType, metadata = {}) {
    throw new Error('Method upload() must be implemented.');
  }

  /**
   * Resolve an asset storage key to an accessible URL
   * @param {string} key - Storage key
   * @returns {string} Publicly/Authenticated accessible URL
   */
  resolveUrl(key) {
    throw new Error('Method resolveUrl() must be implemented.');
  }

  /**
   * Delete an object by key
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('Method delete() must be implemented.');
  }

  /**
   * Get a readable stream for the object by key
   * @param {string} key
   * @returns {Promise<ReadableStream|null>}
   */
  async downloadStream(key) {
    throw new Error('Method downloadStream() must be implemented.');
  }
}

export default IStorageProvider;

