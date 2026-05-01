/**
 * Property-Based Tests for Amadeus Authentication Manager
 * 
 * Tests universal properties that should hold for all authentication scenarios.
 */

const fc = require('fast-check');
const AmadeusAuthManager = require('../../services/amadeus/AmadeusAuthManager');
const { AmadeusConfig } = require('../../services/amadeus/config');
const { CacheManager } = require('../../utils/cacheManager');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Feature: amadeus-hotel-integration, Property 1: Authentication Token Acquisition', () => {
  /**
   * Property 1: Authentication Token Acquisition
   * For any API request to Amadeus, the system should successfully obtain 
   * a valid OAuth2 access token before making the request.
   * 
   * Validates: Requirements 1.3
   */
  it('should successfully obtain a valid access token for any valid credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid credentials
        fc.record({
          apiKey: fc.string({ minLength: 20, maxLength: 50 }),
          apiSecret: fc.string({ minLength: 20, maxLength: 50 }),
          expiresIn: fc.integer({ min: 300, max: 3600 }) // 5 min to 1 hour
        }),
        async ({ apiKey, apiSecret, expiresIn }) => {
          // Create config with generated credentials
          const config = new AmadeusConfig();
          config.apiKey = apiKey;
          config.apiSecret = apiSecret;
          config.baseUrl = 'https://test.api.amadeus.com';

          const cache = new CacheManager();
          const authManager = new AmadeusAuthManager(config, cache);

          // Generate a random token
          const mockToken = fc.sample(fc.string({ minLength: 50, maxLength: 100 }), 1)[0];

          // Mock successful token response
          axios.post.mockResolvedValueOnce({
            data: {
              access_token: mockToken,
              expires_in: expiresIn,
              type: 'Bearer'
            }
          });

          // Get access token
          const token = await authManager.getAccessToken();

          // Verify token is returned
          expect(token).toBeDefined();
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);
          expect(token).toBe(mockToken);

          // Verify axios was called with correct parameters
          expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/v1/security/oauth2/token'),
            expect.any(URLSearchParams),
            expect.objectContaining({
              headers: expect.objectContaining({
                'Content-Type': 'application/x-www-form-urlencoded'
              })
            })
          );

          // Clean up
          cache.clear();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: amadeus-hotel-integration, Property 2: Token Caching Efficiency', () => {
  /**
   * Property 2: Token Caching Efficiency
   * For any sequence of API requests made within the token TTL period, 
   * the system should reuse the same cached access token rather than requesting new tokens.
   * 
   * Validates: Requirements 1.5
   */
  it('should reuse cached token for multiple requests within TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of requests (2-10) and token expiry time
        fc.record({
          numRequests: fc.integer({ min: 2, max: 10 }),
          expiresIn: fc.integer({ min: 600, max: 3600 }) // 10 min to 1 hour
        }),
        async ({ numRequests, expiresIn }) => {
          const config = new AmadeusConfig();
          config.apiKey = 'test_key';
          config.apiSecret = 'test_secret';
          config.baseUrl = 'https://test.api.amadeus.com';

          const cache = new CacheManager();
          const authManager = new AmadeusAuthManager(config, cache);

          const mockToken = fc.sample(fc.string({ minLength: 50, maxLength: 100 }), 1)[0];

          // Mock token response - should only be called once
          axios.post.mockResolvedValueOnce({
            data: {
              access_token: mockToken,
              expires_in: expiresIn,
              type: 'Bearer'
            }
          });

          // Make multiple requests
          const tokens = [];
          for (let i = 0; i < numRequests; i++) {
            const token = await authManager.getAccessToken();
            tokens.push(token);
          }

          // All tokens should be the same
          const uniqueTokens = new Set(tokens);
          expect(uniqueTokens.size).toBe(1);
          expect(tokens[0]).toBe(mockToken);

          // axios.post should only be called once (token was cached)
          expect(axios.post).toHaveBeenCalledTimes(1);

          // Clean up
          cache.clear();
          axios.post.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Feature: amadeus-hotel-integration, Property 3: Authentication Error Handling', () => {
  /**
   * Property 3: Authentication Error Handling
   * For any authentication failure, the system should log the error with timestamp 
   * and context, and return a meaningful error message to the caller.
   * 
   * Validates: Requirements 1.6
   */
  it('should log errors and return meaningful messages for any authentication failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different error scenarios
        fc.oneof(
          fc.record({
            statusCode: fc.constantFrom(401, 403),
            errorType: fc.constant('auth')
          }),
          fc.record({
            statusCode: fc.constantFrom(500, 502, 503),
            errorType: fc.constant('server')
          }),
          fc.record({
            code: fc.constantFrom('ECONNABORTED', 'ETIMEDOUT'),
            errorType: fc.constant('timeout')
          })
        ),
        async (errorScenario) => {
          const config = new AmadeusConfig();
          config.apiKey = 'test_key';
          config.apiSecret = 'test_secret';
          config.baseUrl = 'https://test.api.amadeus.com';

          const cache = new CacheManager();
          const authManager = new AmadeusAuthManager(config, cache);

          // Mock console.error to capture logs
          const originalConsoleError = console.error;
          const errorLogs = [];
          console.error = jest.fn((...args) => {
            errorLogs.push(args);
          });

          // Mock error response based on scenario
          if (errorScenario.statusCode) {
            axios.post.mockRejectedValueOnce({
              response: {
                status: errorScenario.statusCode,
                data: { error: 'Test error' }
              },
              message: `Request failed with status ${errorScenario.statusCode}`
            });
          } else {
            axios.post.mockRejectedValueOnce({
              code: errorScenario.code,
              message: `Network error: ${errorScenario.code}`
            });
          }

          // Attempt to get access token (should fail)
          let thrownError;
          try {
            await authManager.getAccessToken();
          } catch (error) {
            thrownError = error;
          }

          // Verify error was thrown
          expect(thrownError).toBeDefined();
          expect(thrownError.message).toBeDefined();
          expect(typeof thrownError.message).toBe('string');
          expect(thrownError.message.length).toBeGreaterThan(0);

          // Verify error was logged
          expect(console.error).toHaveBeenCalled();
          expect(errorLogs.length).toBeGreaterThan(0);

          // Verify log contains context
          const logEntry = errorLogs[0];
          expect(logEntry).toBeDefined();
          expect(logEntry[0]).toContain('AmadeusAuth');
          expect(logEntry[1]).toHaveProperty('timestamp');

          // Verify meaningful error message based on error type
          if (errorScenario.errorType === 'auth') {
            expect(thrownError.message).toContain('credentials');
          } else if (errorScenario.errorType === 'server') {
            expect(thrownError.message).toContain('unavailable');
          } else if (errorScenario.errorType === 'timeout') {
            expect(thrownError.message).toContain('timed out');
          }

          // Restore console.error
          console.error = originalConsoleError;

          // Clean up
          cache.clear();
          axios.post.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
