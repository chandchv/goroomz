/**
 * Property-Based Tests for API Key Revocation
 * Feature: internal-user-roles, Property 45: API key revocation
 * 
 * Property: For any revoked API key, all subsequent requests using that key 
 * should be immediately blocked
 * 
 * Validates: Requirements 20.3
 */

const fc = require('fast-check');
const { APIKey } = require('../../models');

describe('Property 45: API Key Revocation', () => {

  test('Property 45: Revoked API keys are immediately invalid', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.date(), // revokedAt (always present for revoked keys)
        fc.option(fc.date()), // expiresAt
        (isActive, revokedAt, expiresAt) => {
          // Create a mock revoked API key
          const apiKey = {
            isActive,
            revokedAt, // Key is revoked
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

  test('Property 45: Revoked keys cannot be reactivated by setting isActive alone', () => {
    fc.assert(
      fc.property(
        fc.date(), // revokedAt
        fc.option(fc.date()), // expiresAt
        (revokedAt, expiresAt) => {
          // Create a mock revoked API key that someone tries to reactivate
          const apiKey = {
            isActive: true, // Trying to reactivate
            revokedAt, // But still has revocation date
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Key is still invalid because revokedAt is set
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revoked keys fail verification but hash still matches', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 32, maxLength: 64 }),
        (rawKey) => {
          const hashedKey = APIKey.hashKey(rawKey);
          
          // Create a mock revoked API key
          const apiKey = {
            key: hashedKey,
            isActive: false,
            revokedAt: new Date(),
            expiresAt: null,
            verifyKey: APIKey.prototype.verifyKey,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Key still verifies (hash matches) but is invalid
          expect(apiKey.verifyKey(rawKey)).toBe(true); // Hash still matches
          expect(apiKey.isValid()).toBe(false); // But key is invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Inactive revoked keys are invalid', () => {
    fc.assert(
      fc.property(
        fc.date(), // revokedAt
        fc.option(fc.date()), // expiresAt
        (revokedAt, expiresAt) => {
          // Create a mock inactive and revoked API key
          const apiKey = {
            isActive: false,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Inactive revoked keys are invalid
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revocation with any expiration date makes key invalid', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.date(), // revokedAt
        fc.date(), // expiresAt (any date, past or future)
        (isActive, revokedAt, expiresAt) => {
          // Create a mock revoked API key with expiration
          const apiKey = {
            isActive,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Revoked keys are invalid regardless of expiration
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revocation check is consistent across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.date(), // revokedAt
        fc.option(fc.date()), // expiresAt
        fc.integer({ min: 2, max: 10 }), // checkCount
        (isActive, revokedAt, expiresAt, checkCount) => {
          // Create a mock revoked API key
          const apiKey = {
            isActive,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Check validity multiple times
          const results = [];
          for (let i = 0; i < checkCount; i++) {
            results.push(apiKey.isValid());
          }

          // Property assertion: All checks return the same result
          const firstResult = results[0];
          results.forEach(result => {
            expect(result).toBe(firstResult);
          });

          // Property assertion: All results should be false (revoked)
          expect(firstResult).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revoked keys with different properties are all invalid', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            isActive: fc.boolean(),
            revokedAt: fc.date(),
            expiresAt: fc.option(fc.date())
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (keyConfigs) => {
          // Create multiple mock revoked API keys with different properties
          const keys = keyConfigs.map(config => ({
            ...config,
            isValid: APIKey.prototype.isValid
          }));

          // Property assertion: All revoked keys are invalid
          keys.forEach(key => {
            expect(key.isValid()).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revocation timestamp presence determines invalidity', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isActive
        fc.option(fc.date()), // expiresAt
        (isActive, expiresAt) => {
          // Create two keys: one revoked, one not
          const revokedKey = {
            isActive,
            revokedAt: new Date(),
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          const activeKey = {
            isActive: true,
            revokedAt: null,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Revoked key is invalid, active key may be valid
          expect(revokedKey.isValid()).toBe(false);
          
          // Active key is valid only if not expired
          if (!expiresAt || new Date() <= expiresAt) {
            expect(activeKey.isValid()).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 45: Revoked keys remain invalid over time', () => {
    fc.assert(
      fc.property(
        fc.date({ max: new Date(Date.now() - 86400000) }), // Past revocation date
        fc.option(fc.date({ min: new Date(Date.now() + 86400000) })), // Future expiration
        (revokedAt, expiresAt) => {
          // Create a mock key revoked in the past
          const apiKey = {
            isActive: true,
            revokedAt,
            expiresAt,
            isValid: APIKey.prototype.isValid
          };

          // Property assertion: Even with future expiration, revoked key is invalid
          expect(apiKey.isValid()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
