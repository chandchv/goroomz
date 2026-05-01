/**
 * Unit Tests for Amadeus Error Handler
 * 
 * Tests specific error handling scenarios and edge cases.
 */

const AmadeusErrorHandler = require('../../services/amadeus/AmadeusErrorHandler');

describe('AmadeusErrorHandler', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new AmadeusErrorHandler();
    // Mock sleep to avoid delays in tests
    errorHandler.sleep = jest.fn().mockResolvedValue(undefined);
    // Mock console to suppress logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rate Limit Error Handling (429)', () => {
    it('should handle rate limit error with Retry-After header', async () => {
      const error = new Error('Rate limit exceeded');
      error.response = {
        status: 429,
        data: { error: 'Too many requests' },
        headers: {
          'retry-after': '30'
        }
      };

      let retryFunctionCalled = false;
      const context = {
        endpoint: '/test',
        params: {},
        retryCount: 0,
        retryFunction: async () => {
          retryFunctionCalled = true;
          return { success: true };
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(retryFunctionCalled).toBe(true);
      expect(result.success).toBe(true);
      expect(errorHandler.sleep).toHaveBeenCalled();
    });

    it('should stop retrying after max retries for rate limit', async () => {
      const error = new Error('Rate limit exceeded');
      error.response = {
        status: 429,
        data: { error: 'Too many requests' },
        headers: {}
      };

      const context = {
        endpoint: '/test',
        params: {},
        retryCount: 3, // Already at max retries
        retryFunction: async () => {
          throw new Error('Should not retry');
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(false);
      expect(result.error.code).toContain('RATE_LIMIT');
      expect(console.error).toHaveBeenCalled();
    });

    it('should calculate delay from Retry-After header', async () => {
      const error = new Error('Rate limit exceeded');
      error.response = {
        status: 429,
        data: {},
        headers: {
          'retry-after': '45'
        }
      };

      const context = {
        endpoint: '/test',
        retryCount: 0,
        retryFunction: async () => ({ success: true })
      };

      await errorHandler.handleApiError(error, context);

      // Should use Retry-After value (45 seconds = 45000ms)
      expect(errorHandler.sleep).toHaveBeenCalledWith(45000);
    });
  });

  describe('Authentication Error Handling (401, 403)', () => {
    it('should handle 401 authentication error', async () => {
      const error = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: { error: 'Invalid credentials' },
        headers: {}
      };

      const mockAuthManager = {
        clearToken: jest.fn()
      };

      let retryFunctionCalled = false;
      const context = {
        endpoint: '/test',
        params: {},
        authManager: mockAuthManager,
        retryFunction: async () => {
          retryFunctionCalled = true;
          return { success: true };
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(mockAuthManager.clearToken).toHaveBeenCalled();
      expect(retryFunctionCalled).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should handle 403 forbidden error', async () => {
      const error = new Error('Forbidden');
      error.response = {
        status: 403,
        data: { error: 'Access denied' },
        headers: {}
      };

      const mockAuthManager = {
        clearToken: jest.fn()
      };

      const context = {
        endpoint: '/test',
        params: {},
        authManager: mockAuthManager,
        retryFunction: async () => ({ success: true })
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(mockAuthManager.clearToken).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should not retry auth error twice', async () => {
      const error = new Error('Unauthorized');
      error.response = {
        status: 401,
        data: {},
        headers: {}
      };

      const context = {
        endpoint: '/test',
        params: {},
        isAuthRetry: true, // Already retried once
        retryFunction: async () => {
          throw new Error('Should not retry');
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('AUTH_FAILED');
    });
  });

  describe('Server Error Handling (500, 503)', () => {
    it('should handle 500 internal server error with retry', async () => {
      const error = new Error('Internal server error');
      error.response = {
        status: 500,
        data: { error: 'Server error' },
        headers: {}
      };

      let retryFunctionCalled = false;
      const context = {
        endpoint: '/test',
        params: {},
        retryCount: 0,
        retryFunction: async () => {
          retryFunctionCalled = true;
          return { success: true };
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(retryFunctionCalled).toBe(true);
      expect(result.success).toBe(true);
      expect(errorHandler.sleep).toHaveBeenCalled();
    });

    it('should handle 503 service unavailable error', async () => {
      const error = new Error('Service unavailable');
      error.response = {
        status: 503,
        data: {},
        headers: {}
      };

      const context = {
        endpoint: '/test',
        retryCount: 0,
        retryFunction: async () => ({ success: true })
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(true);
      expect(errorHandler.sleep).toHaveBeenCalled();
    });

    it('should stop retrying server errors after max retries', async () => {
      const error = new Error('Internal server error');
      error.response = {
        status: 500,
        data: {},
        headers: {}
      };

      const context = {
        endpoint: '/test',
        retryCount: 3, // At max retries
        retryFunction: async () => {
          throw new Error('Should not retry');
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SERVER_ERROR');
    });
  });

  describe('Timeout Error Handling', () => {
    it('should handle ECONNABORTED timeout error', async () => {
      const error = new Error('Connection aborted');
      error.code = 'ECONNABORTED';

      let retryFunctionCalled = false;
      const context = {
        endpoint: '/test',
        params: {},
        retryFunction: async () => {
          retryFunctionCalled = true;
          return { success: true };
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(retryFunctionCalled).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should handle ETIMEDOUT timeout error', async () => {
      const error = new Error('Connection timed out');
      error.code = 'ETIMEDOUT';

      const context = {
        endpoint: '/test',
        retryFunction: async () => ({ success: true })
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(true);
    });

    it('should not retry timeout error twice', async () => {
      const error = new Error('Connection timed out');
      error.code = 'ETIMEDOUT';

      const context = {
        endpoint: '/test',
        isTimeoutRetry: true, // Already retried once
        retryFunction: async () => {
          throw new Error('Should not retry');
        }
      };

      const result = await errorHandler.handleApiError(error, context);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TIMEOUT');
    });
  });

  describe('User-Friendly Message Generation', () => {
    it('should generate user-friendly message for 400 Bad Request', () => {
      const error = new Error('Bad request');
      error.response = { status: 400 };

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Invalid search parameters provided');
      expect(message).not.toContain('400');
      expect(message).not.toContain('Bad request');
    });

    it('should generate user-friendly message for 401 Unauthorized', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Authentication failed with hotel search service');
    });

    it('should generate user-friendly message for 404 Not Found', () => {
      const error = new Error('Not found');
      error.response = { status: 404 };

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Hotel not found');
    });

    it('should generate user-friendly message for 429 Rate Limit', () => {
      const error = new Error('Too many requests');
      error.response = { status: 429 };

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Too many requests. Please try again later');
    });

    it('should generate user-friendly message for 500 Server Error', () => {
      const error = new Error('Internal server error');
      error.response = { status: 500 };

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('Hotel search service is temporarily unavailable');
    });

    it('should generate generic message for unknown status codes', () => {
      const error = new Error('Unknown error');
      error.response = { status: 418 }; // I'm a teapot

      const message = errorHandler.getUserFriendlyMessage(error);

      expect(message).toBe('An error occurred while searching for hotels');
    });
  });

  describe('Error Categorization', () => {
    it('should correctly identify rate limit errors', () => {
      const error = new Error('Rate limit');
      error.response = { status: 429 };

      expect(errorHandler.isRateLimitError(error)).toBe(true);
      expect(errorHandler.isAuthError(error)).toBe(false);
      expect(errorHandler.isServerError(error)).toBe(false);
      expect(errorHandler.isTimeoutError(error)).toBe(false);
    });

    it('should correctly identify auth errors', () => {
      const error401 = new Error('Unauthorized');
      error401.response = { status: 401 };

      const error403 = new Error('Forbidden');
      error403.response = { status: 403 };

      expect(errorHandler.isAuthError(error401)).toBe(true);
      expect(errorHandler.isAuthError(error403)).toBe(true);
      expect(errorHandler.isRateLimitError(error401)).toBe(false);
    });

    it('should correctly identify server errors', () => {
      const error500 = new Error('Server error');
      error500.response = { status: 500 };

      const error503 = new Error('Service unavailable');
      error503.response = { status: 503 };

      expect(errorHandler.isServerError(error500)).toBe(true);
      expect(errorHandler.isServerError(error503)).toBe(true);
      expect(errorHandler.isAuthError(error500)).toBe(false);
    });

    it('should correctly identify timeout errors', () => {
      const errorAborted = new Error('Aborted');
      errorAborted.code = 'ECONNABORTED';

      const errorTimeout = new Error('Timeout');
      errorTimeout.code = 'ETIMEDOUT';

      expect(errorHandler.isTimeoutError(errorAborted)).toBe(true);
      expect(errorHandler.isTimeoutError(errorTimeout)).toBe(true);
      expect(errorHandler.isServerError(errorAborted)).toBe(false);
    });
  });

  describe('Exponential Backoff Calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(errorHandler.calculateBackoffDelay(0)).toBe(1000); // 1s
      expect(errorHandler.calculateBackoffDelay(1)).toBe(2000); // 2s
      expect(errorHandler.calculateBackoffDelay(2)).toBe(4000); // 4s
      expect(errorHandler.calculateBackoffDelay(3)).toBe(8000); // 8s
      expect(errorHandler.calculateBackoffDelay(4)).toBe(16000); // 16s
      expect(errorHandler.calculateBackoffDelay(5)).toBe(32000); // 32s
    });

    it('should cap exponential backoff at 60 seconds', () => {
      expect(errorHandler.calculateBackoffDelay(10)).toBe(60000); // Capped at 60s
      expect(errorHandler.calculateBackoffDelay(20)).toBe(60000); // Capped at 60s
    });

    it('should respect Retry-After header when larger than exponential', () => {
      const delay = errorHandler.calculateBackoffDelay(0, 10); // 10 seconds
      expect(delay).toBe(10000); // Use Retry-After (10s > 1s exponential)
    });

    it('should use exponential when larger than Retry-After', () => {
      const delay = errorHandler.calculateBackoffDelay(5, 10); // 10 seconds
      expect(delay).toBe(32000); // Use exponential (32s > 10s Retry-After)
    });

    it('should cap Retry-After at 60 seconds', () => {
      const delay = errorHandler.calculateBackoffDelay(0, 120); // 120 seconds
      expect(delay).toBe(60000); // Capped at 60s
    });
  });

  describe('Retry-After Header Parsing', () => {
    it('should parse numeric Retry-After header', () => {
      const error = new Error('Rate limit');
      error.response = {
        status: 429,
        headers: {
          'retry-after': '30'
        }
      };

      const retryAfter = errorHandler.getRetryAfter(error);
      expect(retryAfter).toBe(30);
    });

    it('should parse HTTP date Retry-After header', () => {
      const futureDate = new Date(Date.now() + 30000); // 30 seconds from now
      const error = new Error('Rate limit');
      error.response = {
        status: 429,
        headers: {
          'retry-after': futureDate.toUTCString()
        }
      };

      const retryAfter = errorHandler.getRetryAfter(error);
      expect(retryAfter).toBeGreaterThanOrEqual(29); // Allow for timing variance
      expect(retryAfter).toBeLessThanOrEqual(31);
    });

    it('should return null for missing Retry-After header', () => {
      const error = new Error('Rate limit');
      error.response = {
        status: 429,
        headers: {}
      };

      const retryAfter = errorHandler.getRetryAfter(error);
      expect(retryAfter).toBeNull();
    });

    it('should return null for invalid Retry-After header', () => {
      const error = new Error('Rate limit');
      error.response = {
        status: 429,
        headers: {
          'retry-after': 'invalid'
        }
      };

      const retryAfter = errorHandler.getRetryAfter(error);
      expect(retryAfter).toBeNull();
    });
  });

  describe('Error Logging', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      error.response = {
        status: 500,
        data: { error: 'Server error' }
      };

      const context = {
        endpoint: '/test/endpoint',
        params: { city: 'PAR' },
        retryCount: 1
      };

      errorHandler.logError(error, context);

      expect(console.error).toHaveBeenCalled();
      const logCall = console.error.mock.calls[0];
      expect(logCall[0]).toContain('Amadeus API Error');
      expect(logCall[1]).toHaveProperty('statusCode', 500);
      expect(logCall[1]).toHaveProperty('endpoint', '/test/endpoint');
      expect(logCall[1]).toHaveProperty('params');
      expect(logCall[1]).toHaveProperty('timestamp');
    });

    it('should include stack trace for server errors', () => {
      const error = new Error('Server error');
      error.response = { status: 500 };
      error.stack = 'Error: Server error\n  at test.js:1:1';

      errorHandler.logError(error, {});

      const logCall = console.error.mock.calls[0];
      expect(logCall[1]).toHaveProperty('stack');
    });

    it('should not include stack trace for client errors', () => {
      const error = new Error('Bad request');
      error.response = { status: 400 };
      error.stack = 'Error: Bad request\n  at test.js:1:1';

      errorHandler.logError(error, {});

      const logCall = console.error.mock.calls[0];
      expect(logCall[1]).not.toHaveProperty('stack');
    });
  });

  describe('Error Response Formatting', () => {
    it('should format error response with all fields', () => {
      const error = new Error('Test error');
      error.response = {
        status: 404,
        data: { error: 'Not found', details: 'Hotel ID invalid' }
      };

      const result = errorHandler.formatErrorResponse(error);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Hotel not found',
          statusCode: 404,
          details: { error: 'Not found', details: 'Hotel ID invalid' }
        }
      });
    });

    it('should format error response with custom error code', () => {
      const error = new Error('Test error');
      error.response = {
        status: 429,
        data: {}
      };

      const result = errorHandler.formatErrorResponse(error, 'CUSTOM_CODE');

      expect(result.error.code).toBe('CUSTOM_CODE');
    });

    it('should handle errors without response', () => {
      const error = new Error('Network error');

      const result = errorHandler.formatErrorResponse(error);

      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    });
  });
});
