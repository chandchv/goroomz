/**
 * Unit tests for Cache Manager Utility
 * 
 * Tests cache operations, TTL expiration, statistics tracking, and multi-operations.
 * Requirements: 1.5, 4.4
 */

const { CacheManager, getGlobalCache, resetGlobalCache } = require('../../utils/cacheManager');

describe('Cache Manager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({ stdTTL: 10 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    test('should set and get a value', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');
      expect(value).toBe('value1');
    });

    test('should return null for non-existent key', () => {
      const value = cache.get('nonexistent');
      expect(value).toBeNull();
    });

    test('should delete a value', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      const value = cache.get('key1');
      expect(value).toBeNull();
    });

    test('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    test('should clear all cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL Expiration', () => {
    test('should expire value after TTL', (done) => {
      cache.set('key1', 'value1', 1); // 1 second TTL
      
      // Value should exist immediately
      expect(cache.get('key1')).toBe('value1');
      
      // Value should be gone after TTL
      setTimeout(() => {
        expect(cache.get('key1')).toBeNull();
        done();
      }, 1100);
    }, 2000);

    test('should use default TTL when not specified', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('should allow custom TTL per key', () => {
      cache.set('key1', 'value1', 100); // 100 seconds
      cache.set('key2', 'value2', 1);   // 1 second
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
    });

    test('should get TTL for a key', () => {
      cache.set('key1', 'value1', 10);
      const ttl = cache.getTTL('key1');
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('Statistics Tracking', () => {
    test('should track cache hits', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    test('should track cache misses', () => {
      cache.get('nonexistent1');
      cache.get('nonexistent2');
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    test('should track set operations', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
    });

    test('should track delete operations', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.delete('key1');
      
      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    test('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('66.67%');
    });

    test('should reset statistics on clear', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });

    test('should show 0% hit rate when no operations', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('Multiple Operations', () => {
    test('should get multiple values at once', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const values = cache.mget(['key1', 'key2', 'key3']);
      expect(values).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
    });

    test('should set multiple values at once', () => {
      const success = cache.mset([
        { key: 'key1', val: 'value1' },
        { key: 'key2', val: 'value2' },
        { key: 'key3', val: 'value3' }
      ]);
      
      expect(success).toBe(true);
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    test('should set multiple values with different TTLs', () => {
      cache.mset([
        { key: 'key1', val: 'value1', ttl: 100 },
        { key: 'key2', val: 'value2', ttl: 200 }
      ]);
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(true);
    });

    test('should get all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('Data Types', () => {
    test('should cache strings', () => {
      cache.set('key', 'string value');
      expect(cache.get('key')).toBe('string value');
    });

    test('should cache numbers', () => {
      cache.set('key', 42);
      expect(cache.get('key')).toBe(42);
    });

    test('should cache objects', () => {
      const obj = { name: 'test', value: 123 };
      cache.set('key', obj);
      expect(cache.get('key')).toEqual(obj);
    });

    test('should cache arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set('key', arr);
      expect(cache.get('key')).toEqual(arr);
    });

    test('should cache booleans', () => {
      cache.set('key1', true);
      cache.set('key2', false);
      expect(cache.get('key1')).toBe(true);
      expect(cache.get('key2')).toBe(false);
    });

    test('should clone objects by default', () => {
      const obj = { value: 1 };
      cache.set('key', obj);
      obj.value = 2;
      expect(cache.get('key').value).toBe(1);
    });
  });

  describe('Global Cache Instance', () => {
    afterEach(() => {
      resetGlobalCache();
    });

    test('should return same instance on multiple calls', () => {
      const cache1 = getGlobalCache();
      const cache2 = getGlobalCache();
      expect(cache1).toBe(cache2);
    });

    test('should share data across instances', () => {
      const cache1 = getGlobalCache();
      cache1.set('key', 'value');
      
      const cache2 = getGlobalCache();
      expect(cache2.get('key')).toBe('value');
    });

    test('should reset global cache', () => {
      const cache1 = getGlobalCache();
      cache1.set('key', 'value');
      
      resetGlobalCache();
      
      const cache2 = getGlobalCache();
      expect(cache2.get('key')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined values', () => {
      cache.set('key', undefined);
      // node-cache stores undefined but get() returns null for undefined
      expect(cache.has('key')).toBe(true);
      expect(cache.get('key')).toBeNull();
    });

    test('should handle null values', () => {
      cache.set('key', null);
      expect(cache.get('key')).toBe(null);
    });

    test('should handle empty strings', () => {
      cache.set('key', '');
      expect(cache.get('key')).toBe('');
    });

    test('should handle zero values', () => {
      cache.set('key', 0);
      expect(cache.get('key')).toBe(0);
    });

    test('should handle large objects', () => {
      const largeObj = { data: new Array(1000).fill('test') };
      cache.set('key', largeObj);
      expect(cache.get('key')).toEqual(largeObj);
    });
  });
});
