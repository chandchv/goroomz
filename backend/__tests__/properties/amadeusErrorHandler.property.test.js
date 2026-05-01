/**
 * Property-Based Tests for Amadeus Error Handler
 * 
 * Tests universal properties that should hold for all error handling scenarios.
 */

const fc = require('fast-check');
const AmadeusErrorHandler = require('../../services/amadeus/AmadeusErrorHandler');

describe('Feature: amadeus-hotel-integration, Property 8: API Error Handling', () => {
  /**
   * Property 8: API Error Handling
   * For any Amadeus API error response, the system should handle it gracefully 
   * without crashing, log the error with context, and return an appropriate error response.
   * 
   * Validates: Requirements 2.6, 4.5, 6.4
   */
  it('should handle any API error gracefully without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various error scenarios
        fc.oneof(
          // HTTP errors with status codes
          fc.record({
            type: fc.constant('http'),
            statusCode: fc.integer({ min: 400, max: 599 }),
            message: fc.string({ minLength: 10, maxLength: 100 }),
            endpoint: fc.string({ minLength: 5, maxLength: 50 }),
            params: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer()))
          }),
          // Network errors
          fc.record({
            type: fc.constant('network'),
            code: fc.constantFrom('ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'),
            message: fc.string({ minLength: 10, maxLength: 100 }),
            endpoint: fc.string({ minLength: 5, maxLength: 50 })
          }),
          // Unknown errors
          fc.record({
            type: fc.constant('unknown'),
            message: fc.string({ minLength: 10, maxLength: 100 })
          })
        ),
        async (errorScenario) => {
          const errorHandler = new AmadeusErrorHandler();

          // Mock sleep to avoid delays
          errorHandler.sleep = jest.fn().mockResolvedValue(undefined);

          // Mock console.error and console.warn to capture logs
          const originalConsoleError = console.error;
          const originalConsoleWarn = console.warn;
          const errorLogs = [];
          console.error = jest.fn((...args) => {
            errorLogs.push(args);
          });
          console.warn = jest.fn();

          // Create error object based on scenario
          let error;
          if (errorScenario.type === 'http') {
            error = new Error(errorScenario.message);
            error.response = {
              status: errorScenario.statusCode,
              data: { error: 'API Error' },
              headers: {}
            };
          } else if (errorScenario.type === 'network') {
            error = new Error(errorScenario.message);
            error.code = errorScenario.code;
          } else {
            error = new Error(errorScenario.message);
          }

          const context = {
            endpoint: errorScenario.endpoint || '/test',
            params: errorScenario.params || {},
            retryCount: 10 // Set high to avoid retries
          };

          // Handle the error - should not throw
          let result;
          let thrownError;
          try {
            result = await errorHandler.handleApiError(error, context);
          } catch (e) {
            thrownError = e;
          }

          // Verify no error was thrown (graceful handling)
          expect(thrownError).toBeUndefined();

          // Verify result is defined and has expected structure
          expect(result).toBeDefined();
          expect(result).toHaveProperty('success', false);
          expect(result).toHaveProperty('error');
          expect(result.error).toHaveProperty('code');
          expect(result.error).toHaveProperty('message');

          // Verify error code is a string
          expect(typeof result.error.code).toBe('string');
          expect(result.error.code.length).toBeGreaterThan(0);

          // Verify error message is user-friendly (not empty)
          expect(typeof result.error.message).toBe('string');
          expect(result.error.message.length).toBeGreaterThan(0);

          // Verify error was logged
          expect(console.error).toHaveBeenCalled();
          expect(errorLogs.length).toBeGreaterThan(0);

          // Verify log contains context
          const logEntry = errorLogs[0];
          expect(logEntry).toBeDefined();
          expect(logEntry[0]).toContain('Amadeus API Error');
          expect(logEntry[1]).toHaveProperty('timestamp');
          expect(logEntry[1]).toHaveProperty('endpoint');

          // Restore console
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should return consistent error format for all error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random HTTP status codes
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          const errorHandler = new AmadeusErrorHandler();

          // Mock sleep to avoid delays
          errorHandler.sleep = jest.fn().mockResolvedValue(undefined);

          // Mock console to suppress logs
          const originalConsoleError = console.error;
          const originalConsoleWarn = console.warn;
          console.error = jest.fn();
          console.warn = jest.fn();

          const error = new Error('Test error');
          error.response = {
            status: statusCode,
            data: { error: 'Test' },
            headers: {}
          };

          const result = await errorHandler.handleApiError(error, { retryCount: 10 });

          // Verify consistent structure
          expect(result).toMatchObject({
            success: false,
            error: {
              code: expect.any(String),
              message: expect.any(String),
              statusCode: statusCode
            }
          });

          // Restore console
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should provide user-friendly messages for all status codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          const errorHandler = new AmadeusErrorHandler();

          // Mock sleep to avoid delays
          errorHandler.sleep = jest.fn().mockResolvedValue(undefined);

          // Mock console to suppress logs
          const originalConsoleError = console.error;
          const originalConsoleWarn = console.warn;
          console.error = jest.fn();
          console.warn = jest.fn();

          const error = new Error('Test error');
          error.response = {
            status: statusCode,
            data: {},
            headers: {}
          };

          const result = await errorHandler.handleApiError(error, { retryCount: 10 });

          // Verify message is user-friendly (doesn't contain technical jargon)
          const message = result.error.message;
          expect(message).toBeDefined();
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);

          // Should not contain raw error codes or stack traces
          expect(message).not.toContain('Error:');
          expect(message).not.toContain('at ');
          expect(message).not.toContain('stack');

          // Restore console
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

describe('Feature: amadeus-hotel-integration, Property 20: Exponential Backoff Retry', () => {
  /**
   * Property 20: Exponential Backoff Retry
   * For any rate limit error from Amadeus, subsequent retry attempts should follow 
   * an exponential backoff pattern (e.g., 1s, 2s, 4s, 8s).
   * 
   * Validates: Requirements 6.3
   */
  it('should calculate exponential backoff delays correctly for any retry count', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate retry counts from 0 to 10
        fc.integer({ min: 0, max: 10 }),
        async (retryCount) => {
          const errorHandler = new AmadeusErrorHandler();

          // Calculate delay
          const delay = errorHandler.calculateBackoffDelay(retryCount);

          // Verify delay follows exponential pattern
          const expectedDelay = 1000 * Math.pow(2, retryCount);
          const cappedExpectedDelay = Math.min(expectedDelay, 60000);

          expect(delay).toBe(cappedExpectedDelay);

          // Verify delay is within reasonable bounds
          expect(delay).toBeGreaterThanOrEqual(1000); // At least 1 second
          expect(delay).toBeLessThanOrEqual(60000); // At most 60 seconds
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect Retry-After header when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          retryCount: fc.integer({ min: 0, max: 5 }),
          retryAfter: fc.integer({ min: 1, max: 120 }) // 1 to 120 seconds
        }),
        async ({ retryCount, retryAfter }) => {
          const errorHandler = new AmadeusErrorHandler();

          // Calculate delay with Retry-After
          const delay = errorHandler.calculateBackoffDelay(retryCount, retryAfter);

          // Verify delay respects Retry-After (uses larger of exponential or Retry-After)
          const exponentialDelay = 1000 * Math.pow(2, retryCount);
          const retryAfterMs = retryAfter * 1000;
          const expectedDelay = Math.min(Math.max(exponentialDelay, retryAfterMs), 60000);

          expect(delay).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rate limit errors with proper retry logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 120 }),
        async (retryAfter) => {
          const errorHandler = new AmadeusErrorHandler();

          // Mock sleep to avoid delays
          errorHandler.sleep = jest.fn().mockResolvedValue(undefined);

          // Mock console to suppress logs
          const originalConsoleWarn = console.warn;
          const originalConsoleError = console.error;
          console.warn = jest.fn();
          console.error = jest.fn();

          // Create rate limit error
          const error = new Error('Rate limit exceeded');
          error.response = {
            status: 429,
            data: { error: 'Too many requests' },
            headers: {
              'retry-after': retryAfter.toString()
            }
          };

          let retryFunctionCalled = false;
          const context = {
            endpoint: '/test',
            params: {},
            retryCount: 0,
            retryFunction: async (newContext) => {
              retryFunctionCalled = true;
              return { success: true, retried: true };
            }
          };

          // Handle the error
          const result = await errorHandler.handleApiError(error, context);

          // Verify retry function was called
          expect(retryFunctionCalled).toBe(true);
          expect(result).toHaveProperty('success', true);
          expect(result).toHaveProperty('retried', true);

          // Verify sleep was called with appropriate delay
          expect(errorHandler.sleep).toHaveBeenCalled();

          // Restore console
          console.warn = originalConsoleWarn;
          console.error = originalConsoleError;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  it('should stop retrying after max retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }),
        async (retryCount) => {
          const errorHandler = new AmadeusErrorHandler();

          // Mock console to suppress logs
          const originalConsoleWarn = console.warn;
          const originalConsoleError = console.error;
          console.warn = jest.fn();
          console.error = jest.fn();

          // Create rate limit error
          const error = new Error('Rate limit exceeded');
          error.response = {
            status: 429,
            data: { error: 'Too many requests' },
            headers: {}
          };

          const context = {
            endpoint: '/test',
            params: {},
            retryCount: retryCount, // Already at or above max retries
            retryFunction: async () => {
              throw new Error('Should not retry');
            }
          };

          // Handle the error
          const result = await errorHandler.handleApiError(error, context);

          // Verify it returns error response instead of retrying
          expect(result).toHaveProperty('success', false);
          expect(result).toHaveProperty('error');
          expect(result.error.code).toContain('RATE_LIMIT');

          // Restore console
          console.warn = originalConsoleWarn;
          console.error = originalConsoleError;
        }
      ),
      { numRuns: 100 }
    );
  });
});
