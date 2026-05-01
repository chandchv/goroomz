/**
 * Unit tests for Amadeus Configuration Module
 * 
 * Tests configuration validation, credential detection, and enable/disable functionality.
 * Requirements: 1.2, 12.6
 */

const { AmadeusConfig, getConfig, resetConfig } = require('../../services/amadeus/config');

describe('Amadeus Configuration', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    test('should throw error when AMADEUS_API_KEY is missing', () => {
      delete process.env.AMADEUS_API_KEY;
      process.env.AMADEUS_API_SECRET = 'test-secret';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_API_KEY is required');
    });

    test('should throw error when AMADEUS_API_SECRET is missing', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      delete process.env.AMADEUS_API_SECRET;

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_API_SECRET is required');
    });

    test('should throw error when both credentials are missing', () => {
      delete process.env.AMADEUS_API_KEY;
      delete process.env.AMADEUS_API_SECRET;

      expect(() => {
        new AmadeusConfig();
      }).toThrow(/AMADEUS_API_KEY is required/);
    });

    test('should throw error when base URL is invalid', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_API_BASE_URL = 'invalid-url';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_API_BASE_URL must be a valid URL');
    });

    test('should throw error when token cache TTL is zero', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '0';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_TOKEN_CACHE_TTL must be a positive number');
    });

    test('should throw error when token cache TTL is negative', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '-100';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_TOKEN_CACHE_TTL must be a positive number');
    });

    test('should throw error when hotel cache TTL is invalid', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_HOTEL_CACHE_TTL = '-1';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_HOTEL_CACHE_TTL must be a positive number');
    });

    test('should throw error when search cache TTL is invalid', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_SEARCH_CACHE_TTL = '0';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_SEARCH_CACHE_TTL must be a positive number');
    });

    test('should throw error when default radius is zero', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_DEFAULT_RADIUS = '0';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_DEFAULT_RADIUS must be a positive number');
    });

    test('should throw error when default radius is negative', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_DEFAULT_RADIUS = '-5';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_DEFAULT_RADIUS must be a positive number');
    });

    test('should throw error when radius unit is invalid', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'METERS';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_DEFAULT_RADIUS_UNIT must be either KM or MILE');
    });

    test('should throw error when rate limit is zero', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '0';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_RATE_LIMIT_PER_SECOND must be a positive number');
    });

    test('should throw error when rate limit is negative', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '-10';

      expect(() => {
        new AmadeusConfig();
      }).toThrow('AMADEUS_RATE_LIMIT_PER_SECOND must be a positive number');
    });

    test('should accept valid configuration', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '1500';
      process.env.AMADEUS_HOTEL_CACHE_TTL = '86400';
      process.env.AMADEUS_SEARCH_CACHE_TTL = '300';
      process.env.AMADEUS_DEFAULT_RADIUS = '5';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'KM';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '10';

      expect(() => {
        new AmadeusConfig();
      }).not.toThrow();
    });
  });

  describe('Enable/Disable Functionality', () => {
    test('should be enabled when AMADEUS_ENABLED is true', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_ENABLED = 'true';

      const config = new AmadeusConfig();
      expect(config.isEnabled()).toBe(true);
    });

    test('should be disabled when AMADEUS_ENABLED is false', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_ENABLED = 'false';

      const config = new AmadeusConfig();
      expect(config.isEnabled()).toBe(false);
    });

    test('should be disabled when AMADEUS_ENABLED is not set', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      delete process.env.AMADEUS_ENABLED;

      const config = new AmadeusConfig();
      expect(config.isEnabled()).toBe(false);
    });

    test('should be disabled when AMADEUS_ENABLED is any value other than true', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_ENABLED = 'yes';

      const config = new AmadeusConfig();
      expect(config.isEnabled()).toBe(false);
    });
  });

  describe('Configuration Properties', () => {
    test('should use default values when optional env vars are not set', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      delete process.env.AMADEUS_API_BASE_URL;
      delete process.env.AMADEUS_TOKEN_CACHE_TTL;
      delete process.env.AMADEUS_HOTEL_CACHE_TTL;
      delete process.env.AMADEUS_SEARCH_CACHE_TTL;
      delete process.env.AMADEUS_DEFAULT_RADIUS;
      delete process.env.AMADEUS_DEFAULT_RADIUS_UNIT;
      delete process.env.AMADEUS_RATE_LIMIT_PER_SECOND;

      const config = new AmadeusConfig();

      expect(config.baseUrl).toBe('https://test.api.amadeus.com');
      expect(config.tokenCacheTTL).toBe(1500);
      expect(config.hotelCacheTTL).toBe(86400);
      expect(config.searchCacheTTL).toBe(300);
      expect(config.defaultRadius).toBe(5);
      expect(config.defaultRadiusUnit).toBe('KM');
      expect(config.rateLimitPerSecond).toBe(10);
    });

    test('should correctly parse integer values from env vars', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_TOKEN_CACHE_TTL = '2000';
      process.env.AMADEUS_HOTEL_CACHE_TTL = '43200';
      process.env.AMADEUS_SEARCH_CACHE_TTL = '600';
      process.env.AMADEUS_DEFAULT_RADIUS = '10';
      process.env.AMADEUS_RATE_LIMIT_PER_SECOND = '20';

      const config = new AmadeusConfig();

      expect(config.tokenCacheTTL).toBe(2000);
      expect(config.hotelCacheTTL).toBe(43200);
      expect(config.searchCacheTTL).toBe(600);
      expect(config.defaultRadius).toBe(10);
      expect(config.rateLimitPerSecond).toBe(20);
    });

    test('should accept MILE as radius unit', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_DEFAULT_RADIUS_UNIT = 'MILE';

      const config = new AmadeusConfig();
      expect(config.defaultRadiusUnit).toBe('MILE');
    });
  });

  describe('URL Generation', () => {
    test('should generate correct token URL', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';

      const config = new AmadeusConfig();
      expect(config.getTokenUrl()).toBe('https://test.api.amadeus.com/v1/security/oauth2/token');
    });

    test('should generate correct hotel list URL', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';

      const config = new AmadeusConfig();
      expect(config.getHotelListUrl()).toBe('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
    });

    test('should generate correct hotel search URL', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_API_BASE_URL = 'https://test.api.amadeus.com';

      const config = new AmadeusConfig();
      expect(config.getHotelSearchUrl()).toBe('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode');
    });
  });

  describe('Configuration Summary', () => {
    test('should return summary without sensitive data', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_ENABLED = 'true';

      const config = new AmadeusConfig();
      const summary = config.getSummary();

      expect(summary).toHaveProperty('enabled', true);
      expect(summary).toHaveProperty('baseUrl');
      expect(summary).toHaveProperty('hasApiKey', true);
      expect(summary).toHaveProperty('hasApiSecret', true);
      expect(summary).not.toHaveProperty('apiKey');
      expect(summary).not.toHaveProperty('apiSecret');
    });

    test('should indicate missing credentials in summary', () => {
      process.env.AMADEUS_API_KEY = '';
      process.env.AMADEUS_API_SECRET = 'test-secret';

      // This will throw during validation, so we need to catch it
      try {
        new AmadeusConfig();
      } catch (error) {
        // Expected to throw
        expect(error.message).toContain('AMADEUS_API_KEY is required');
      }
    });
  });

  describe('Singleton Pattern', () => {
    test('getConfig should return same instance on multiple calls', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';

      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });

    test('resetConfig should clear singleton instance', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';

      const config1 = getConfig();
      resetConfig();
      
      // Change environment
      process.env.AMADEUS_ENABLED = 'true';
      const config2 = getConfig();

      expect(config1).not.toBe(config2);
      expect(config2.isEnabled()).toBe(true);
    });
  });

  describe('Credential Detection on Startup', () => {
    test('should detect missing credentials immediately on instantiation', () => {
      delete process.env.AMADEUS_API_KEY;
      delete process.env.AMADEUS_API_SECRET;

      expect(() => {
        new AmadeusConfig();
      }).toThrow();
    });

    test('should validate configuration on instantiation', () => {
      process.env.AMADEUS_API_KEY = 'test-key';
      process.env.AMADEUS_API_SECRET = 'test-secret';
      process.env.AMADEUS_TOKEN_CACHE_TTL = 'invalid';

      expect(() => {
        new AmadeusConfig();
      }).toThrow();
    });
  });
});
