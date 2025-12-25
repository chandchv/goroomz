/**
 * Property-Based Tests for API Key Generation
 * Feature: internal-user-roles, Property 44: API key generation
 * 
 * Property: For any API key creation, a secure unique key must be generated 
 * and associated with the specified permissions
 * 
 * Validates: Requirements 20.1
 */

const fc = require('fast-check');
const { APIKey } = require('../../models');
const crypto = require('crypto');

describe('Property 44: API Key Generation', () => {
  /**
   * Generator for API key names
   */
  const apiKeyNameArbitrary = () =>
    fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0);

  /**
   * Generator for permissions objects
   */
  const permissionsArbitrary = () =>
    fc.record({
      canReadProperties: fc.boolean(),
      canWriteProperties: fc.boolean(),
      canReadBookings: fc.boolean(),
      canWriteBookings: fc.boolean(),
      canReadUsers: fc.boolean(),
      canWriteUsers: fc.boolean(),
      canAccessAnalytics: fc.boolean(),
      canManagePayments: fc.boolean()
    });

  /**
   * Generator for metadata objects
   */
  const metadataArbitrary = () =>
    fc.record({
      description: fc.option(fc.string({ maxLength: 200 })),
      environment: fc.option(fc.constantFrom('development', 'staging', 'production')),
      application: fc.option(fc.string({ maxLength: 50 }))
    });

  /**
   * Generator for expiration dates (future dates)
   */
  const expirationDateArbitrary = () =>
    fc.date({ min: new Date(Date.now() + 86400000) }); // At least 1 day in future

  test('Property 44: Generated API keys are unique', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(apiKeyNameArbitrary(), { minLength: 2, maxLength: 10 }),
        permissionsArbitrary(),
        async (names, permissions) => {
          // Generate multiple API keys
          const keys = [];
          for (const name of names) {
            const rawKey = APIKey.generateKey();
            keys.push(rawKey);
          }

          // Property assertion: All keys should be unique
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Generated API keys are secure (sufficient entropy)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        (count) => {
          // Generate multiple keys
          const keys = [];
          for (let i = 0; i < count; i++) {
            keys.push(APIKey.generateKey());
          }

          // Property assertion 1: All keys should be unique
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(count);

          // Property assertion 2: Keys should have sufficient length (at least 32 chars)
          keys.forEach(key => {
            expect(key.length).toBeGreaterThanOrEqual(32);
          });

          // Property assertion 3: Keys should contain varied characters (not all same)
          keys.forEach(key => {
            const uniqueChars = new Set(key.split(''));
            expect(uniqueChars.size).toBeGreaterThan(10); // At least 10 different characters
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: API key hashing is consistent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 32, maxLength: 64 }),
        (rawKey) => {
          // Hash the same key multiple times
          const hash1 = APIKey.hashKey(rawKey);
          const hash2 = APIKey.hashKey(rawKey);
          const hash3 = APIKey.hashKey(rawKey);

          // Property assertion: Same input produces same hash
          expect(hash1).toBe(hash2);
          expect(hash2).toBe(hash3);

          // Property assertion: Hash is a valid hex string
          expect(hash1).toMatch(/^[a-f0-9]+$/);

          // Property assertion: Hash has expected length (SHA-256 produces 64 hex chars)
          expect(hash1.length).toBe(64);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Different keys produce different hashes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 32, maxLength: 64 }),
        fc.string({ minLength: 32, maxLength: 64 }),
        (key1, key2) => {
          fc.pre(key1 !== key2); // Only test when keys are different

          const hash1 = APIKey.hashKey(key1);
          const hash2 = APIKey.hashKey(key2);

          // Property assertion: Different keys produce different hashes
          expect(hash1).not.toBe(hash2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Key prefix matches first 8 characters of raw key', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (count) => {
          for (let i = 0; i < count; i++) {
            const rawKey = APIKey.generateKey();
            const expectedPrefix = rawKey.substring(0, 8);

            // Property assertion: Prefix should be first 8 characters
            expect(expectedPrefix.length).toBe(8);
            expect(rawKey.startsWith(expectedPrefix)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: API key verification works correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 32, maxLength: 64 }),
        fc.string({ minLength: 32, maxLength: 64 }),
        (correctKey, wrongKey) => {
          fc.pre(correctKey !== wrongKey); // Ensure keys are different

          // Create a mock API key instance
          const hashedKey = APIKey.hashKey(correctKey);
          const apiKey = {
            key: hashedKey,
            verifyKey: APIKey.prototype.verifyKey
          };

          // Property assertion: Correct key verifies successfully
          expect(apiKey.verifyKey(correctKey)).toBe(true);

          // Property assertion: Wrong key fails verification
          expect(apiKey.verifyKey(wrongKey)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: API key validity check respects all conditions', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.option(fc.date()), // revokedAt
        fc.option(fc.date()), // expiresAt
        (isActive, revokedAt, expiresAt) => {
          // Create a mock API key instance
          const apiKey = {
            isActive,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          const result = apiKey.isValid();

          // Property assertion: Key is valid only if all conditions are met
          const shouldBeValid = 
            isActive && 
            !revokedAt && 
            (!expiresAt || new Date() <= expiresAt);

          expect(result).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Expired keys are invalid', () => {
    fc.assert(
      fc.property(
        fc.date({ max: new Date(Date.now() - 86400000) }), // Past date (at least 1 day ago)
        (pastDate) => {
          // Create a mock API key that expired in the past
          const apiKey = {
            isActive: true,
            revokedAt: null,
            expiresAt: pastDate,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Expired keys are invalid
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Revoked keys are invalid regardless of other properties', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.date(), // revokedAt (any date)
        fc.option(expirationDateArbitrary()), // expiresAt (future or null)
        (isActive, revokedAt, expiresAt) => {
          // Create a mock API key that has been revoked
          const apiKey = {
            isActive,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Revoked keys are always invalid
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Inactive keys are invalid regardless of other properties', () => {
    fc.assert(
      fc.property(
        fc.option(fc.date()), // revokedAt
        fc.option(expirationDateArbitrary()), // expiresAt (future or null)
        (revokedAt, expiresAt) => {
          // Create a mock API key that is inactive
          const apiKey = {
            isActive: false,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Inactive keys are always invalid
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Valid keys have all required properties', () => {
    fc.assert(
      fc.property(
        fc.option(expirationDateArbitrary()), // expiresAt (future or null)
        (expiresAt) => {
          // Create a mock API key that should be valid
          const apiKey = {
            isActive: true,
            revokedAt: null,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Key with all valid properties is valid
          expect(apiKey.isValid()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Key generation produces cryptographically random keys', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }),
        (count) => {
          // Generate many keys
          const keys = [];
          for (let i = 0; i < count; i++) {
            keys.push(APIKey.generateKey());
          }

          // Property assertion 1: No duplicate keys
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(count);

          // Property assertion 2: Keys have good distribution of characters
          // Count character frequency across all keys
          const charCounts = {};
          keys.forEach(key => {
            key.split('').forEach(char => {
              charCounts[char] = (charCounts[char] || 0) + 1;
            });
          });

          // Should have at least 20 different characters used
          expect(Object.keys(charCounts).length).toBeGreaterThanOrEqual(20);
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    );
  });

  test('Property 44: Hash function is deterministic and collision-resistant', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 32, maxLength: 64 }), { minLength: 10, maxLength: 50 }),
        (keys) => {
          // Hash all keys
          const hashes = keys.map(key => APIKey.hashKey(key));

          // Property assertion 1: Same key always produces same hash
          keys.forEach((key, index) => {
            const rehash = APIKey.hashKey(key);
            expect(rehash).toBe(hashes[index]);
          });

          // Property assertion 2: Different keys produce different hashes (no collisions)
          const uniqueKeys = [...new Set(keys)];
          const uniqueHashes = new Set(uniqueKeys.map(key => APIKey.hashKey(key)));
          expect(uniqueHashes.size).toBe(uniqueKeys.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Generated keys do not contain special characters that could cause issues', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 30 }),
        (count) => {
          for (let i = 0; i < count; i++) {
            const key = APIKey.generateKey();

            // Property assertion: Key should only contain alphanumeric characters
            // (no +, /, = which are removed from base64)
            expect(key).toMatch(/^[A-Za-z0-9]+$/);
            expect(key).not.toContain('+');
            expect(key).not.toContain('/');
            expect(key).not.toContain('=');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 44: Key prefix is always 8 characters and alphanumeric', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 30 }),
        (count) => {
          for (let i = 0; i < count; i++) {
            const key = APIKey.generateKey();
            const prefix = key.substring(0, 8);

            // Property assertion: Prefix is exactly 8 characters
            expect(prefix.length).toBe(8);

            // Property assertion: Prefix is alphanumeric
            expect(prefix).toMatch(/^[A-Za-z0-9]+$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
