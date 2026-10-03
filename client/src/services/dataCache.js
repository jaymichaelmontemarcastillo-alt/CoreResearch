// src/services/dataCache.js
// Lightweight in-memory cache with TTL (time-to-live) for stable/semi-stable data.
// Eliminates duplicate Firestore reads across components and on navigation.

const cache = new Map();
const pending = new Map(); // Deduplicates concurrent in-flight requests

/**
 * Predefined TTL constants (milliseconds)
 */
export const CACHE_TTL = {
  STABLE: 10 * 60 * 1000,      // 10 min — courses, sections (rarely change)
  SEMI_STABLE: 5 * 60 * 1000,  // 5 min  — user profiles
  MODERATE: 2 * 60 * 1000,     // 2 min  — groups, schedules
  SHORT: 30 * 1000,             // 30 sec — active workspace data
};

export const dataCache = {
  /**
   * Get a cached value by key. Returns null if missing or expired.
   */
  get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  },

  /**
   * Set a value in the cache with a TTL.
   */
  set(key, data, ttl = CACHE_TTL.SEMI_STABLE) {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      storedAt: Date.now(),
    });
  },

  /**
   * Get from cache or fetch from source. Deduplicates concurrent requests
   * for the same key — if two components request the same data simultaneously,
   * only one network call is made.
   *
   * @param {string} key     - Cache key
   * @param {Function} fetchFn - Async function that returns the data
   * @param {number} ttl     - Time-to-live in milliseconds
   * @returns {Promise<*>}
   */
  async getOrFetch(key, fetchFn, ttl = CACHE_TTL.SEMI_STABLE) {
    // 1. Return from cache if fresh
    const cached = this.get(key);
    if (cached !== null) return cached;

    // 2. If the same key is already being fetched, piggyback on that request
    if (pending.has(key)) {
      return pending.get(key);
    }

    // 3. Otherwise, initiate a new fetch
    const promise = fetchFn()
      .then((data) => {
        this.set(key, data, ttl);
        pending.delete(key);
        return data;
      })
      .catch((err) => {
        pending.delete(key);
        throw err;
      });

    pending.set(key, promise);
    return promise;
  },

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key) {
    cache.delete(key);
    pending.delete(key);
  },

  /**
   * Invalidate all entries whose keys contain the given substring.
   */
  invalidatePattern(pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
    for (const key of pending.keys()) {
      if (key.includes(pattern)) {
        pending.delete(key);
      }
    }
  },

  /**
   * Clear all cached data and pending requests.
   */
  clear() {
    cache.clear();
    pending.clear();
  },
};

export default dataCache;
