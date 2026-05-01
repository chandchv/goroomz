/**
 * Unit Tests for Amadeus Authentication Manager
 * 
 * Tests specific edge cases and scenarios for authentication.
 */

const AmadeusAuthManager = require('../../services/amadeus/AmadeusAuthManager');
const { AmadeusConfig } = require('../../services/amadeus/config');
const { CacheManager } = require('../../utils/cacheManager');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('AmadeusAuthManager - Edge Cases', () => {
  let config;
  let cache;
  let authManager;

  beforeEach(() => {
    // Create fresh instances for each test
    config = new AmadeusConfig();
    config.apiKey = 'test_key';
    config.apiSecret = 'test_secret';
    config.baseUrl = 'https://test.api.amadeus.com';
    
    cache = new CacheManager();
    authManager = new AmadeusAuthManager(config, cache);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Token Expiration Detection', () => {
    it('should detect expired token when expiry time has passed', () => {
      // Set a token that expired 1 hour ago
      const pastTime = Date.now() - (60 * 60 * 1000);
      cache.set('amadeus:token', 'expired_token', 3600);
      cache.set('amadeus:token:expiry', pastTime, 3600);

      expect(authManager.isTokenExpired()).toBe(true);
    });

    it('should detect token as expired when within 5 minute buffer', () => {
      // Set a token that expires in 4 minutes (within 5 minute buffer)
      const nearFutureTime = Date.now() + (4 * 60 * 1000);
      cache.set('amadeus:token', 'soon_expired_token', 300);
      cache.set('amadeus:token:expiry', nearFutureTime, 300);

      expect(authManager.isTokenExpired()).toBe(true);
    });

    it('should detect token as not expired when beyond 5 minute buffer', () => {
      // Set a token that expires in 10 minutes (beyond 5 minute buffer)
      const futureTime = Date.now() + (10 * 60 * 1000);
      cache.set('amadeus:token', 'valid_token', 600);
      cache.set('amadeus:token:expiry', futureTime, 600);

      expect(authManager.isTokenExpired()).toBe(false);
    });

    it('should detect token as expired when no expiry time is cached', () => {
      cache.set('amadeus:token', 'token_without_expiry', 3600);
      // Don't set expiry time

      expect(authManager.isTokenExpired()).toBe(true);
    });
  });

  describe('Token Refresh on Expired Token', () => {
    it('should request new token when cached token is expired', async () => {
      // Set an expired token
      const pastTime = Date.now() - (60 * 60 * 1000);
      cache.set('amadeus:token', 'expired_token', 3600);
      cache.set('amadeus:token:expiry', pastTime, 3600);

      // Mock new token response
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_fresh_token',
          expires_in: 1800
        }
      });

      const token = await authManager.getAccessToken();

      expect(token).toBe('new_fresh_token');
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('should cache new token with correct TTL after refresh', async () => {
      // Set an expired token
      const pastTime = Date.now() - (60 * 60 * 1000);
      cache.set('amadeus:token', 'expired_token', 3600);
      cache.set('amadeus:token:expiry', pastTime, 3600);

      // Mock new token response with 1800 second expiry
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_token',
          expires_in: 1800
        }
      });

      await authManager.getAccessToken();

      // Verify token is cached
      const cachedToken = cache.get('amadeus:token');
      expect(cachedToken).toBe('new_token');

      // Verify expiry is set
      const expiryTime = cache.get('amadeus:token:expiry');
      expect(expiryTime).toBeDefined();
      expect(expiryTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Handling Invalid Credentials', () => {
    it('should throw meaningful error for 401 Unauthorized', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_client' }
        },
        message: 'Request failed with status code 401'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Invalid Amadeus API credentials');
    });

    it('should throw meaningful error for 403 Forbidden', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { error: 'access_denied' }
        },
        message: 'Request failed with status code 403'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Invalid Amadeus API credentials');
    });

    it('should log error context when authentication fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      axios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_client' }
        },
        message: 'Request failed with status code 401'
      });

      try {
        await authManager.getAccessToken();
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0];
      expect(logCall[0]).toContain('AmadeusAuth');
      expect(logCall[1]).toHaveProperty('timestamp');
      expect(logCall[1]).toHaveProperty('statusCode', 401);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Network Errors During Authentication', () => {
    it('should throw meaningful error for timeout (ECONNABORTED)', async () => {
      axios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Authentication request timed out');
    });

    it('should throw meaningful error for timeout (ETIMEDOUT)', async () => {
      axios.post.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'connect ETIMEDOUT'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Authentication request timed out');
    });

    it('should throw meaningful error for server errors (500)', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'internal_server_error' }
        },
        message: 'Request failed with status code 500'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Amadeus authentication service unavailable');
    });

    it('should throw meaningful error for server errors (503)', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 503,
          data: { error: 'service_unavailable' }
        },
        message: 'Request failed with status code 503'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Amadeus authentication service unavailable');
    });

    it('should handle generic network errors', async () => {
      axios.post.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK'
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Authentication failed: Network Error');
    });
  });

  describe('Token Cache Management', () => {
    it('should clear token cache when clearToken is called', async () => {
      // Set a valid token
      cache.set('amadeus:token', 'valid_token', 3600);
      cache.set('amadeus:token:expiry', Date.now() + 3600000, 3600);

      expect(cache.has('amadeus:token')).toBe(true);
      expect(cache.has('amadeus:token:expiry')).toBe(true);

      authManager.clearToken();

      expect(cache.has('amadeus:token')).toBe(false);
      expect(cache.has('amadeus:token:expiry')).toBe(false);
    });

    it('should log when token cache is cleared', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      authManager.clearToken();

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls.find(call => 
        call[0] && call[0].includes('Token cache cleared')
      );
      expect(logCall).toBeDefined();

      consoleLogSpy.mockRestore();
    });

    it('should handle minimum TTL of 60 seconds when caching token', async () => {
      // Mock token with very short expiry (30 seconds)
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'short_lived_token',
          expires_in: 30
        }
      });

      await authManager.getAccessToken();

      // Token should still be cached (with minimum 60 second TTL)
      const cachedToken = cache.get('amadeus:token');
      expect(cachedToken).toBe('short_lived_token');
    });
  });

  describe('Token Response Validation', () => {
    it('should throw error when response is missing access_token', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          // Missing access_token
          expires_in: 1800
        }
      });

      await expect(authManager.getAccessToken()).rejects.toThrow('Invalid token response from Amadeus API');
    });

    it('should use default expires_in when not provided', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'token_without_expiry'
          // Missing expires_in
        }
      });

      const token = await authManager.getAccessToken();

      expect(token).toBe('token_without_expiry');
      
      // Should still cache with default expiry
      const cachedToken = cache.get('amadeus:token');
      expect(cachedToken).toBe('token_without_expiry');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide token statistics', () => {
      const stats = authManager.getStats();

      expect(stats).toHaveProperty('hasToken');
      expect(stats).toHaveProperty('isExpired');
      expect(stats).toHaveProperty('expiryTime');
      expect(stats).toHaveProperty('cacheStats');
    });

    it('should reflect correct token state in statistics', async () => {
      // Initially no token
      let stats = authManager.getStats();
      expect(stats.hasToken).toBe(false);
      expect(stats.isExpired).toBe(true);

      // Add a valid token
      axios.post.mockResolvedValueOnce({
        data: {
          access_token: 'valid_token',
          expires_in: 1800
        }
      });

      await authManager.getAccessToken();

      stats = authManager.getStats();
      expect(stats.hasToken).toBe(true);
      expect(stats.isExpired).toBe(false);
      expect(stats.expiryTime).toBeGreaterThan(Date.now());
    });
  });
});
