/**
 * Simplified End-to-End Integration Tests for Amadeus Hotel API Integration
 * 
 * These tests verify the Amadeus integration without requiring database connectivity.
 * They focus on:
 * - Authentication with real Amadeus API credentials
 * - Hotel search by city and coordinates
 * - Hotel details retrieval
 * - Caching behavior
 * - Error handling
 * - Performance metrics
 * 
 * Requirements: All Amadeus-specific requirements
 */

const AmadeusService = require('../../services/amadeus/AmadeusService');
const AmadeusAuthManager = require('../../services/amadeus/AmadeusAuthManager');
const AmadeusTransformer = require('../../services/amadeus/AmadeusTransformer');
const AmadeusErrorHandler = require('../../services/amadeus/AmadeusErrorHandler');
const { CacheManager } = require('../../utils/cacheManager');
const { getConfig } = require('../../services/amadeus/config');

// Get config instance
const amadeusConfig = getConfig();

describe('Amadeus E2E Integration Tests (Simplified)', () => {
  let amadeusService;
  let authManager;
  let cacheManager;
  let transformer;
  let errorHandler;

  beforeAll(async () => {
    // Initialize services
    cacheManager = new CacheManager();
    authManager = new AmadeusAuthManager();
    transformer = new AmadeusTransformer();
    errorHandler = new AmadeusErrorHandler();
    
    // AmadeusService constructor: (config, authManager, errorHandler, cache)
    amadeusService = new AmadeusService(null, authManager, errorHandler, cacheManager);

    // Verify Amadeus is enabled
    if (!amadeusConfig.enabled) {
      console.warn('⚠️  Amadeus integration is disabled. Set AMADEUS_ENABLED=true to run these tests.');
    }
  });

  afterAll(() => {
    // Clean up
    cacheManager.clear();
  });

  beforeEach(() => {
    // Clear cache before each test for isolation
    cacheManager.clear();
  });

  describe('Authentication Flow', () => {
    test('should successfully authenticate with Amadeus API', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const token = await authManager.getAccessToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    }, 30000);

    test('should cache and reuse authentication tokens', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Get token first time
      const token1 = await authManager.getAccessToken();
      
      // Get token second time (should be cached)
      const token2 = await authManager.getAccessToken();
      
      // Should be the same token
      expect(token1).toBe(token2);
    }, 30000);

    test('should handle authentication errors gracefully', async () => {
      // Create auth manager with invalid credentials
      const invalidAuthManager = new AmadeusAuthManager({
        apiKey: 'invalid_key_12345',
        apiSecret: 'invalid_secret_12345',
        baseUrl: amadeusConfig.baseUrl
      });

      await expect(invalidAuthManager.getAccessToken()).rejects.toThrow();
    }, 30000);
  });

  describe('Hotel Search by City', () => {
    test('should search hotels by city code (Paris)', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const results = await amadeusService.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5,
        radiusUnit: 'KM'
      });

      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        const hotel = results[0];
        expect(hotel.id).toBeDefined();
        expect(hotel.title).toBeDefined();
        expect(hotel.source).toBe('amadeus');
        expect(hotel.isExternal).toBe(true);
        expect(hotel.metadata).toBeDefined();
        expect(hotel.metadata.cityCode).toBe('PAR');
      }
    }, 30000);

    test('should search hotels by city code (London)', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const results = await amadeusService.searchHotelsByCity({
        cityCode: 'LON',
        radius: 10
      });

      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        const hotel = results[0];
        expect(hotel.metadata.cityCode).toBe('LON');
      }
    }, 30000);

    test('should handle invalid city code gracefully', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Invalid city code should either return empty array or throw error
      try {
        const results = await amadeusService.searchHotelsByCity({
          cityCode: 'INVALID123'
        });
        
        // If it doesn't throw, should return empty array
        expect(Array.isArray(results)).toBe(true);
      } catch (error) {
        // Error is acceptable for invalid city code
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Hotel Search by Geocode', () => {
    test('should search hotels by coordinates (Paris)', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const results = await amadeusService.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 5,
        radiusUnit: 'KM'
      });

      expect(Array.isArray(results)).toBe(true);
      
      if (results.length > 0) {
        const hotel = results[0];
        expect(hotel.id).toBeDefined();
        expect(hotel.title).toBeDefined();
        expect(hotel.source).toBe('amadeus');
        expect(hotel.location).toBeDefined();
        expect(hotel.location.latitude).toBeDefined();
        expect(hotel.location.longitude).toBeDefined();
      }
    }, 30000);

    test('should search hotels by coordinates (New York)', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const results = await amadeusService.searchHotelsByGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 10
      });

      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    test('should reject invalid latitude', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      await expect(
        amadeusService.searchHotelsByGeocode({
          latitude: 999, // Invalid
          longitude: 2.3522
        })
      ).rejects.toThrow(/latitude/i);
    });

    test('should reject invalid longitude', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      await expect(
        amadeusService.searchHotelsByGeocode({
          latitude: 48.8566,
          longitude: 999 // Invalid
        })
      ).rejects.toThrow(/longitude/i);
    });
  });

  describe('Hotel Details Retrieval', () => {
    test('should retrieve hotel details by ID', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // First, get a hotel ID from search
      const searchResults = await amadeusService.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5
      });

      if (searchResults.length > 0) {
        // Extract the Amadeus hotel ID (remove 'amadeus_' prefix if present)
        const hotelId = searchResults[0].id.replace('amadeus_', '');

        // Get details for that hotel
        const details = await amadeusService.getHotelDetails(hotelId);

        expect(details).toBeDefined();
        expect(details.id).toBeDefined();
        expect(details.title).toBeDefined();
        expect(details.source).toBe('amadeus');
      }
    }, 30000);

    test('should handle not found hotel ID', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Use a non-existent hotel ID
      try {
        await amadeusService.getHotelDetails('NOTFOUND');
      } catch (error) {
        // Should throw an error for not found
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Caching Behavior', () => {
    test('should cache search results', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const params = {
        cityCode: 'NYC',
        radius: 5
      };

      // First request - should hit API
      const startTime1 = Date.now();
      const results1 = await amadeusService.searchHotelsByCity(params);
      const duration1 = Date.now() - startTime1;

      // Second request - should be faster (from cache)
      const startTime2 = Date.now();
      const results2 = await amadeusService.searchHotelsByCity(params);
      const duration2 = Date.now() - startTime2;

      // Second request should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      
      // Results should be identical
      expect(results2).toEqual(results1);
    }, 60000);

    test('should cache hotel details', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Get a hotel ID first
      const searchResults = await amadeusService.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5
      });

      if (searchResults.length > 0) {
        const hotelId = searchResults[0].id.replace('amadeus_', '');

        // First details request
        const startTime1 = Date.now();
        const details1 = await amadeusService.getHotelDetails(hotelId);
        const duration1 = Date.now() - startTime1;

        // Second details request - should be cached
        const startTime2 = Date.now();
        const details2 = await amadeusService.getHotelDetails(hotelId);
        const duration2 = Date.now() - startTime2;

        // Second request should be faster
        expect(duration2).toBeLessThan(duration1 * 0.5);
        
        // Results should be identical
        expect(details2).toEqual(details1);
      }
    }, 60000);

    test('should track cache statistics', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Clear cache to start fresh
      cacheManager.clear();

      const params = {
        cityCode: 'LON',
        radius: 5
      };

      // First request (cache miss)
      await amadeusService.searchHotelsByCity(params);

      // Second request (cache hit)
      await amadeusService.searchHotelsByCity(params);

      // Check cache stats
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.sets).toBeGreaterThan(0);
      expect(stats.hitRate).toBeDefined();
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Create service with invalid base URL
      const invalidAuthManager = new AmadeusAuthManager({
        apiKey: amadeusConfig.apiKey,
        apiSecret: amadeusConfig.apiSecret,
        baseUrl: 'https://invalid-url-that-does-not-exist.com'
      });

      const invalidService = new AmadeusService(
        { ...amadeusConfig, baseUrl: 'https://invalid-url-that-does-not-exist.com' },
        invalidAuthManager,
        errorHandler,
        cacheManager
      );

      // The service should either throw an error or return an empty array
      // depending on how gracefully it handles the error
      try {
        const result = await invalidService.searchHotelsByCity({ cityCode: 'PAR' });
        // If it doesn't throw, it should return an array (graceful degradation)
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // If it throws, that's also acceptable
        expect(error).toBeDefined();
      }
    }, 30000);

    test('should validate required parameters', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Missing city code
      await expect(
        amadeusService.searchHotelsByCity({})
      ).rejects.toThrow();

      // Missing coordinates
      await expect(
        amadeusService.searchHotelsByGeocode({})
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    test('should complete search within reasonable time', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const startTime = Date.now();
      
      await amadeusService.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5
      });
      
      const duration = Date.now() - startTime;

      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
    }, 30000);

    test('should handle multiple concurrent requests', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const startTime = Date.now();
      
      // Make 3 concurrent requests
      const promises = [
        amadeusService.searchHotelsByCity({ cityCode: 'PAR', radius: 5 }),
        amadeusService.searchHotelsByCity({ cityCode: 'LON', radius: 5 }),
        amadeusService.searchHotelsByCity({ cityCode: 'NYC', radius: 5 })
      ];

      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;

      // All should complete
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      // Should complete within 15 seconds
      expect(duration).toBeLessThan(15000);
    }, 45000);
  });

  describe('Data Transformation', () => {
    test('should transform Amadeus response to GoRoomz format', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      const results = await amadeusService.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5
      });

      if (results.length > 0) {
        const hotel = results[0];

        // Verify transformed structure
        expect(hotel.id).toMatch(/^amadeus_/);
        expect(hotel.title).toBeDefined();
        expect(hotel.source).toBe('amadeus');
        expect(hotel.isExternal).toBe(true);
        expect(hotel.bookingType).toBe('external');
        
        // Verify metadata
        expect(hotel.metadata).toBeDefined();
        expect(hotel.metadata.chainCode).toBeDefined();
        expect(hotel.metadata.cityCode).toBeDefined();
        
        // Verify location
        expect(hotel.location).toBeDefined();
        expect(typeof hotel.location.latitude).toBe('number');
        expect(typeof hotel.location.longitude).toBe('number');
        
        // Verify address
        expect(hotel.address).toBeDefined();
        expect(hotel.address.countryCode).toBeDefined();
      }
    }, 30000);
  });

  describe('Configuration', () => {
    test('should respect configuration settings', () => {
      expect(amadeusConfig).toBeDefined();
      expect(amadeusConfig.baseUrl).toBeDefined();
      expect(amadeusConfig.defaultRadius).toBeDefined();
      expect(amadeusConfig.defaultRadiusUnit).toBeDefined();
      expect(amadeusConfig.tokenCacheTTL).toBeDefined();
      expect(amadeusConfig.hotelCacheTTL).toBeDefined();
      expect(amadeusConfig.searchCacheTTL).toBeDefined();
    });

    test('should use default radius from configuration', async () => {
      if (!amadeusConfig.enabled) {
        console.log('Skipping test - Amadeus disabled');
        return;
      }

      // Search without specifying radius
      const results = await amadeusService.searchHotelsByCity({
        cityCode: 'PAR'
      });

      // Should use default radius from config
      expect(Array.isArray(results)).toBe(true);
    }, 30000);
  });
});
