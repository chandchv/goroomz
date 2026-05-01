/**
 * Cache Manager Utility
 * 
 * Provides in-memory caching with TTL (time-to-live) support.
 * Can be upgraded to Redis in the future for distributed caching.
 */

const NodeCache = require('node-cache');

/**
 * Cache Manager class
 */
class CacheManager {
  constructor(options = {}) {
    // Initialize node-cache with options
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 600, // Default TTL: 10 minutes
      checkperiod: options.checkperiod || 120, // Check for expired keys every 2 minutes
      useClones: options.useClones !== false, // Clone objects by default
      deleteOnExpire: true
    });

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} [ttl] - Time to live in seconds (optional, uses default if not provided)
   * @returns {boolean} Success status
   */
  set(key, value, ttl) {
    this.stats.sets++;
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {number} Number of deleted entries
   */
  delete(key) {
    this.stats.deletes++;
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.flushAll();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: cacheStats.keys,
      ksize: cacheStats.ksize,
      vsize: cacheStats.vsize,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {number|undefined} TTL in seconds or undefined if key doesn't exist
   */
  getTTL(key) {
    return this.cache.getTtl(key);
  }

  /**
   * Get all keys in cache
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * Get multiple values at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Object} Object with key-value pairs
   */
  mget(keys) {
    return this.cache.mget(keys);
  }

  /**
   * Set multiple values at once
   * @param {Array<{key: string, val: any, ttl?: number}>} items - Array of items to set
   * @returns {boolean} Success status
   */
  mset(items) {
    return this.cache.mset(items);
  }
}

// Export singleton instance for global use
let globalCacheInstance = null;

/**
 * Get global cache manager instance
 * @returns {CacheManager}
 */
function getGlobalCache() {
  if (!globalCacheInstance) {
    globalCacheInstance = new CacheManager();
  }
  return globalCacheInstance;
}

/**
 * Reset global cache instance (useful for testing)
 */
function resetGlobalCache() {
  if (globalCacheInstance) {
    globalCacheInstance.clear();
  }
  globalCacheInstance = null;
}

module.exports = {
  CacheManager,
  getGlobalCache,
  resetGlobalCache
};
