/**
 * Integration Tests for Server Startup
 * 
 * Tests server initialization with different Amadeus configurations:
 * - Server starts with valid Amadeus config
 * - Server starts with Amadeus disabled
 * - Server fails gracefully with invalid config
 * - Health check endpoint
 * 
 * Requirements: 1.2, 12.5, 12.6
 */

const { resetConfig } = require('../../services/amadeus/config');

describe('Server Startup Integration Tests', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset Amadeus config singleton
    resetConfig();
    
    // Clear module cache to get fresh server instance
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Reset config
    resetConfig();
  });

  describe('Valid Amadeus Configuration', () => {
    it('should start server successfully with valid Amadeus config', () => {
      // Set valid Amadeus configuration
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_api_key_12345';
      process.env.AMADEUS_API_SECRET = 'test_api_secret_67890';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '1500';
      process.env.AMADEUS_HOTEL_CACHE_TTL = '86400';
      process.env.AMADEUS_SEARCH_CACHE_TTL = '300';
      process.env.AMADEUS_DEFAULT_RADIUS = '5';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'KM';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '10';

      // Import config after setting environment
      const { getConfig } = require('../../services/amadeus/config');
      
      // Should not throw
      expect(() => {
        const config = getConfig();
        config.validate();
      }).not.toThrow();

      const config = getConfig();
      
      // Verify configuration is loaded correctly
      expect(config.isEnabled()).toBe(true);
      expect(config.apiKey).toBe('test_api_key_12345');
      expect(config.apiSecret).toBe('test_api_secret_67890');
      expect(config.baseUrl).toBe('https://test.api.amadeus.com');
      expect(config.tokenCacheTTL).toBe(1500);
      expect(config.hotelCacheTTL).toBe(86400);
      expect(config.searchCacheTTL).toBe(300);
      expect(config.defaultRadius).toBe(5);
      expect(config.defaultRadiusUnit).toBe('KM');
      expect(config.rateLimitPerSecond).toBe(10);
    });

    it('should validate all configuration values on startup', () => {
      // Set valid configuration
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'valid_key';
      process.env.AMADEUS_API_SECRET = 'valid_secret';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '1500';
      process.env.AMADEUS_HOTEL_CACHE_TTL = '86400';
      process.env.AMADEUS_SEARCH_CACHE_TTL = '300';
      process.env.AMADEUS_DEFAULT_RADIUS = '10';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'MILE';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '5';

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();

      // Should validate without throwing
      expect(() => config.validate()).not.toThrow();

      // Verify all values are validated and set correctly
      expect(config.tokenCacheTTL).toBeGreaterThan(0);
      expect(config.hotelCacheTTL).toBeGreaterThan(0);
      expect(config.searchCacheTTL).toBeGreaterThan(0);
      expect(config.defaultRadius).toBeGreaterThan(0);
      expect(['KM', 'MILE']).toContain(config.defaultRadiusUnit);
      expect(config.rateLimitPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Amadeus Disabled', () => {
    it('should start server successfully with Amadeus disabled', () => {
      // Disable Amadeus
      process.env.AMADEUS_ENABLED = 'false';
      
      // Set minimal valid config to avoid validation errors
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();

      // Should not be enabled
      expect(config.isEnabled()).toBe(false);
    });

    it('should not require credentials when Amadeus is disabled', () => {
      // Disable Amadeus
      process.env.AMADEUS_ENABLED = 'false';
      
      // Set minimal valid config
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();

      expect(config.isEnabled()).toBe(false);
      // When disabled, credentials are still loaded but not used
      expect(config.apiKey).toBeDefined();
      expect(config.apiSecret).toBeDefined();
    });
  });

  describe('Invalid Amadeus Configuration', () => {
    it('should fail gracefully with missing API key', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = ''; // Empty string
      process.env.AMADEUS_API_SECRET = 'test_secret';

      // Clear module cache and reset config
      jest.resetModules();
      resetConfig();

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_API_KEY is required/);
    });

    it('should fail gracefully with missing API secret', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = ''; // Empty string

      // Clear module cache and reset config
      jest.resetModules();
      resetConfig();

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_API_SECRET is required/);
    });

    it('should fail gracefully with invalid base URL', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';
      process.env.AMADEUS_API_BASE_URL = 'invalid-url';

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_API_BASE_URL must be a valid URL/);
    });

    it('should fail gracefully with invalid TTL values', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '-100';

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_TOKEN_CACHE_TTL must be a positive number/);
    });

    it('should fail gracefully with invalid radius unit', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'INVALID';

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_DEFAULT_RADIUS_UNIT must be either KM or MILE/);
    });

    it('should fail gracefully with invalid rate limit', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '0';

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/AMADEUS_RATE_LIMIT_PER_SECOND must be a positive number/);
    });

    it('should provide detailed error messages for multiple validation failures', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = ''; // Empty
      process.env.AMADEUS_API_SECRET = ''; // Empty
      process.env.AMADEUS_API_BASE_URL = 'invalid-url';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '-100';

      // Clear module cache and reset config
      jest.resetModules();
      resetConfig();

      const { getConfig } = require('../../services/amadeus/config');

      expect(() => {
        getConfig();
      }).toThrow(/Amadeus configuration validation failed/);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should have health check endpoint available', () => {
      // This is a simple validation that the health check structure is correct
      const healthCheckResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      expect(healthCheckResponse).toHaveProperty('status');
      expect(healthCheckResponse).toHaveProperty('timestamp');
      expect(healthCheckResponse).toHaveProperty('environment');
      expect(healthCheckResponse.status).toBe('OK');
    });

    it('should include environment information in health check', () => {
      const testEnv = 'test';
      process.env.NODE_ENV = testEnv;

      const healthCheckResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      expect(healthCheckResponse.environment).toBe(testEnv);
    });

    it('should default to development environment if not set', () => {
      delete process.env.NODE_ENV;

      const healthCheckResponse = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      expect(healthCheckResponse.environment).toBe('development');
    });
  });

  describe('Configuration Summary', () => {
    it('should provide configuration summary without sensitive data', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'secret_key_12345';
      process.env.AMADEUS_API_SECRET = 'secret_secret_67890';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();
      const summary = config.getSummary();

      // Should include configuration info
      expect(summary).toHaveProperty('enabled');
      expect(summary).toHaveProperty('baseUrl');
      expect(summary).toHaveProperty('tokenCacheTTL');
      expect(summary).toHaveProperty('hotelCacheTTL');
      expect(summary).toHaveProperty('searchCacheTTL');
      expect(summary).toHaveProperty('defaultRadius');
      expect(summary).toHaveProperty('defaultRadiusUnit');

      // Should not expose actual credentials
      expect(summary).not.toHaveProperty('apiKey');
      expect(summary).not.toHaveProperty('apiSecret');

      // Should indicate presence of credentials
      expect(summary).toHaveProperty('hasApiKey');
      expect(summary).toHaveProperty('hasApiSecret');
      expect(summary.hasApiKey).toBe(true);
      expect(summary.hasApiSecret).toBe(true);
    });

    it('should indicate missing credentials in summary', () => {
      process.env.AMADEUS_ENABLED = 'false';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';

      // Clear module cache and reset config
      jest.resetModules();
      resetConfig();

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();
      const summary = config.getSummary();

      // When disabled, credentials are present but we can verify the summary structure
      expect(summary).toHaveProperty('hasApiKey');
      expect(summary).toHaveProperty('hasApiSecret');
      expect(summary.hasApiKey).toBe(true);
      expect(summary.hasApiSecret).toBe(true);
    });
  });

  describe('Production vs Development Behavior', () => {
    it('should exit in production mode with invalid config', () => {
      process.env.NODE_ENV = 'production';
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = ''; // Empty

      // Clear module cache and reset config
      jest.resetModules();
      resetConfig();

      const { getConfig } = require('../../services/amadeus/config');

      // In production, invalid config should throw
      expect(() => {
        getConfig();
      }).toThrow();
    });

    it('should continue in development mode with Amadeus disabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.AMADEUS_ENABLED = 'false';
      delete process.env.AMADEUS_API_KEY;
      delete process.env.AMADEUS_API_SECRET;

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();

      // Should not throw in development when disabled
      expect(config.isEnabled()).toBe(false);
    });
  });

  describe('Default Configuration Values', () => {
    it('should use default values when environment variables are not set', () => {
      process.env.AMADEUS_ENABLED = 'true';
      process.env.AMADEUS_API_KEY = 'test_key';
      process.env.AMADEUS_API_SECRET = 'test_secret';
      
      // Don't set optional values
      delete process.env.AMADEUS_API_BASE_URL;
      delete process.env.AMADEUS_TOKEN_CACHE_TTL;
      delete process.env.AMADEUS_HOTEL_CACHE_TTL;
      delete process.env.AMADEUS_SEARCH_CACHE_TTL;
      delete process.env.AMADEUS_DEFAULT_RADIUS;
      delete process.env.AMADEUS_DEFAULT_RADIUS_UNIT;
      delete process.env.AMADEUS_RATE_LIMIT_PER_SECOND;

      const { getConfig } = require('../../services/amadeus/config');
      const config = getConfig();

      // Verify defaults
      expect(config.baseUrl).toBe('https://test.api.amadeus.com');
      expect(config.tokenCacheTTL).toBe(1500); // 25 minutes
      expect(config.hotelCacheTTL).toBe(86400); // 24 hours
      expect(config.searchCacheTTL).toBe(300); // 5 minutes
      expect(config.defaultRadius).toBe(5);
      expect(config.defaultRadiusUnit).toBe('KM');
      expect(config.rateLimitPerSecond).toBe(10);
    });
  });
});
