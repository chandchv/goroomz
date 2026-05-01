/**
 * Unit Tests for Amadeus Service - City Search
 * 
 * Tests specific scenarios for city search functionality including:
 * - Valid city code searches
 * - Optional parameter handling
 * - Empty result handling
 * - API error scenarios
 * - Result caching behavior
 * 
 * Requirements: 2.1, 2.2, 2.5, 2.6
 */

const AmadeusService = require('../../services/amadeus/AmadeusService');
const AmadeusAuthManager = require('../../services/amadeus/AmadeusAuthManager');
const AmadeusErrorHandler = require('../../services/amadeus/AmadeusErrorHandler');
const AmadeusTransformer = require('../../services/amadeus/AmadeusTransformer');
const { CacheManager } = require('../../utils/cacheManager');
const { AmadeusConfig } = require('../../services/amadeus/config');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('AmadeusService - City Search', () => {
  let service;
  let config;
  let authManager;
  let errorHandler;
  let cache;

  beforeEach(() => {
    // Create fresh instances for each test
    config = new AmadeusConfig();
    config.apiKey = 'test_key';
    config.apiSecret = 'test_secret';
    config.baseUrl = 'https://test.api.amadeus.com';
    config.enabled = true;
    config.searchCacheTTL = 300; // 5 minutes

    cache = new CacheManager({ stdTTL: 300 });
    authManager = new AmadeusAuthManager(config, cache);
    errorHandler = new AmadeusErrorHandler();

    service = new AmadeusService(config, authManager, errorHandler, cache);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods to suppress logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cache.clear();
    jest.restoreAllMocks();
  });

  describe('Search with Valid City Code', () => {
    it('should successfully search hotels with valid city code', async () => {
      // Mock authentication
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      // Mock API response
      const mockHotels = [
        {
          hotelId: 'ACPAR419',
          name: 'LE NOTRE DAME',
          chainCode: 'AC',
          iataCode: 'PAR',
          geoCode: { latitude: 48.85341, longitude: 2.34880 }
        },
        {
          hotelId: 'HLPAR123',
          name: 'PARIS HOTEL',
          chainCode: 'HL',
          iataCode: 'PAR',
          geoCode: { latitude: 48.86, longitude: 2.35 }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: mockHotels
        }
      });

      const result = await service.searchHotelsByCity({ cityCode: 'PAR' });

      // Verify API was called correctly
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city',
        expect.objectContaining({
          params: { cityCode: 'PAR' },
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid_token'
          })
        })
      );

      // Verify results are transformed
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('amadeus_ACPAR419');
      expect(result[0].source).toBe('amadeus');
      expect(result[1].id).toBe('amadeus_HLPAR123');
    });

    it('should accept lowercase city codes and convert to uppercase', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByCity({ cityCode: 'lon' });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ cityCode: 'LON' })
        })
      );
    });

    it('should increment request counter on successful search', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const initialCount = service.requestCount;
      await service.searchHotelsByCity({ cityCode: 'NYC' });

      expect(service.requestCount).toBe(initialCount + 1);
    });
  });

  describe('Search with Optional Parameters', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });
    });

    it('should include radius parameter when provided', async () => {
      await service.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 10
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cityCode: 'PAR',
            radius: 10
          })
        })
      );
    });

    it('should include radiusUnit parameter when provided', async () => {
      await service.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 5,
        radiusUnit: 'mile'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cityCode: 'PAR',
            radius: 5,
            radiusUnit: 'MILE'
          })
        })
      );
    });

    it('should include amenities as comma-separated string', async () => {
      await service.searchHotelsByCity({
        cityCode: 'LON',
        amenities: ['WIFI', 'PARKING', 'POOL']
      });

      const callParams = axios.get.mock.calls[0][1].params;
      expect(callParams.cityCode).toBe('LON');
      expect(callParams.amenities).toBeDefined();
      // Amenities should be comma-separated (order may vary)
      const amenitiesArray = callParams.amenities.split(',');
      expect(amenitiesArray).toHaveLength(3);
      expect(amenitiesArray).toContain('WIFI');
      expect(amenitiesArray).toContain('PARKING');
      expect(amenitiesArray).toContain('POOL');
    });

    it('should include ratings as comma-separated string', async () => {
      await service.searchHotelsByCity({
        cityCode: 'NYC',
        ratings: ['4', '5']
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cityCode: 'NYC',
            ratings: '4,5'
          })
        })
      );
    });

    it('should include chainCodes as comma-separated string', async () => {
      await service.searchHotelsByCity({
        cityCode: 'TYO',
        chainCodes: ['HI', 'MC', 'RT']
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cityCode: 'TYO',
            chainCodes: 'HI,MC,RT'
          })
        })
      );
    });

    it('should include all optional parameters when provided', async () => {
      await service.searchHotelsByCity({
        cityCode: 'BER',
        radius: 15,
        radiusUnit: 'KM',
        amenities: ['WIFI', 'GYM'],
        ratings: ['3', '4', '5'],
        chainCodes: ['AC', 'HI']
      });

      const callParams = axios.get.mock.calls[0][1].params;
      expect(callParams.cityCode).toBe('BER');
      expect(callParams.radius).toBe(15);
      expect(callParams.radiusUnit).toBe('KM');
      expect(callParams.ratings).toBe('3,4,5');
      
      // Check amenities and chainCodes are present (order may vary)
      expect(callParams.amenities).toBeDefined();
      expect(callParams.amenities.split(',')).toHaveLength(2);
      expect(callParams.chainCodes).toBe('AC,HI');
    });

    it('should not include empty arrays as parameters', async () => {
      await service.searchHotelsByCity({
        cityCode: 'ROM',
        amenities: [],
        ratings: []
      });

      const callParams = axios.get.mock.calls[0][1].params;
      expect(callParams).not.toHaveProperty('amenities');
      expect(callParams).not.toHaveProperty('ratings');
      expect(callParams).toHaveProperty('cityCode', 'ROM');
    });

    it('should handle radius of 0', async () => {
      await service.searchHotelsByCity({
        cityCode: 'PAR',
        radius: 0
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            radius: 0
          })
        })
      );
    });
  });

  describe('Search with No Results (Empty Response)', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);
    });

    it('should return empty array when API returns no hotels', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const result = await service.searchHotelsByCity({ cityCode: 'XYZ' });

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when API returns null data', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: null }
      });

      const result = await service.searchHotelsByCity({ cityCode: 'ABC' });

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns undefined data', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: {}
      });

      const result = await service.searchHotelsByCity({ cityCode: 'DEF' });

      expect(result).toEqual([]);
    });

    it('should log when no results are found', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByCity({ cityCode: 'GHI' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('City search completed'),
        expect.objectContaining({
          cityCode: 'GHI',
          resultCount: 0
        })
      );
    });
  });

  describe('Search with API Error', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);
    });

    it('should handle 400 Bad Request error', async () => {
      const error = new Error('Bad Request');
      error.response = {
        status: 400,
        data: { error: 'Invalid city code' }
      };

      axios.get.mockRejectedValueOnce(error);

      await expect(service.searchHotelsByCity({ cityCode: 'PAR' }))
        .rejects
        .toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String)
          })
        });
    });

    it('should handle 404 Not Found error', async () => {
      const error = new Error('Not Found');
      error.response = {
        status: 404,
        data: { error: 'City not found' }
      };

      axios.get.mockRejectedValueOnce(error);

      await expect(service.searchHotelsByCity({ cityCode: 'XXX' }))
        .rejects
        .toMatchObject({
          success: false
        });
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = new Error('Internal Server Error');
      error.response = {
        status: 500,
        data: { error: 'Server error' }
      };

      // Mock to fail all retry attempts
      axios.get.mockRejectedValue(error);

      await expect(service.searchHotelsByCity({ cityCode: 'LON' }))
        .rejects
        .toMatchObject({
          success: false
        });
    });

    it('should handle network timeout error', async () => {
      const error = new Error('Timeout');
      error.code = 'ECONNABORTED';

      // Mock to fail all retry attempts
      axios.get.mockRejectedValue(error);

      await expect(service.searchHotelsByCity({ cityCode: 'NYC' }))
        .rejects
        .toMatchObject({
          success: false
        });
    });

    it('should handle rate limit error (429)', async () => {
      const error = new Error('Too Many Requests');
      error.response = {
        status: 429,
        data: { error: 'Rate limit exceeded' },
        headers: {}
      };

      // Mock to fail all retry attempts
      axios.get.mockRejectedValue(error);

      await expect(service.searchHotelsByCity({ cityCode: 'TYO' }))
        .rejects
        .toMatchObject({
          success: false
        });
    });

    it('should log error when API request fails', async () => {
      const error = new Error('API Error');
      error.response = {
        status: 500,
        data: {}
      };

      axios.get.mockRejectedValueOnce(error);

      try {
        await service.searchHotelsByCity({ cityCode: 'BER' });
      } catch (e) {
        // Expected to throw
      }

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API Error'),
        expect.objectContaining({
          error: expect.any(String),
          statusCode: 500
        })
      );
    });

    it('should throw error for missing city code', async () => {
      await expect(service.searchHotelsByCity({}))
        .rejects
        .toThrow('City code is required');
    });

    it('should throw error for invalid city code format', async () => {
      await expect(service.searchHotelsByCity({ cityCode: 'PARIS' }))
        .rejects
        .toThrow('Invalid city code format');

      await expect(service.searchHotelsByCity({ cityCode: 'PA' }))
        .rejects
        .toThrow('Invalid city code format');

      await expect(service.searchHotelsByCity({ cityCode: '123' }))
        .rejects
        .toThrow('Invalid city code format');
    });
  });

  describe('Search Result Caching', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);
    });

    it('should cache search results after first request', async () => {
      const mockHotels = [
        { hotelId: 'TEST001', name: 'Test Hotel' }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: mockHotels }
      });

      // First request - should hit API
      const result1 = await service.searchHotelsByCity({ cityCode: 'PAR' });

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(result1).toHaveLength(1);

      // Second request - should use cache
      const result2 = await service.searchHotelsByCity({ cityCode: 'PAR' });

      expect(axios.get).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2).toHaveLength(1);
      expect(result2).toEqual(result1);
    });

    it('should use different cache keys for different city codes', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByCity({ cityCode: 'PAR' });
      await service.searchHotelsByCity({ cityCode: 'LON' });

      // Should make 2 API calls (different cache keys)
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different parameters', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByCity({ cityCode: 'PAR' });
      await service.searchHotelsByCity({ cityCode: 'PAR', radius: 10 });

      // Should make 2 API calls (different parameters)
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should use same cache key for same parameters in different order', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByCity({
        cityCode: 'NYC',
        amenities: ['WIFI', 'POOL'],
        ratings: ['4', '5']
      });

      await service.searchHotelsByCity({
        cityCode: 'NYC',
        ratings: ['4', '5'],
        amenities: ['WIFI', 'POOL']
      });

      // Should make only 1 API call (same cache key)
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should cache empty results', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const result1 = await service.searchHotelsByCity({ cityCode: 'XYZ' });
      const result2 = await service.searchHotelsByCity({ cityCode: 'XYZ' });

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should log when returning cached results', async () => {
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [{ hotelId: 'TEST001', name: 'Test' }] }
      });

      // First request
      await service.searchHotelsByCity({ cityCode: 'BER' });

      // Clear console mock to check second call
      console.log.mockClear();

      // Second request (cached)
      await service.searchHotelsByCity({ cityCode: 'BER' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Returning cached city search results'),
        expect.objectContaining({
          cityCode: 'BER',
          resultCount: 1
        })
      );
    });

    it('should respect cache TTL', async () => {
      // Create service with very short cache TTL
      const shortCacheService = new AmadeusService(
        config,
        authManager,
        errorHandler,
        new CacheManager({ stdTTL: 1 }) // 1 second TTL
      );

      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      // First request
      await shortCacheService.searchHotelsByCity({ cityCode: 'ROM' });
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second request after expiry
      await shortCacheService.searchHotelsByCity({ cityCode: 'ROM' });
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Parameter Validation', () => {
    it('should throw error when params is null', async () => {
      await expect(service.searchHotelsByCity(null))
        .rejects
        .toThrow('City code is required');
    });

    it('should throw error when params is undefined', async () => {
      await expect(service.searchHotelsByCity(undefined))
        .rejects
        .toThrow('City code is required');
    });

    it('should throw error when cityCode is empty string', async () => {
      await expect(service.searchHotelsByCity({ cityCode: '' }))
        .rejects
        .toThrow('City code is required');
    });

    it('should throw error when cityCode contains numbers', async () => {
      await expect(service.searchHotelsByCity({ cityCode: 'P4R' }))
        .rejects
        .toThrow('Invalid city code format');
    });

    it('should throw error when cityCode contains special characters', async () => {
      await expect(service.searchHotelsByCity({ cityCode: 'PA@' }))
        .rejects
        .toThrow('Invalid city code format');
    });

    it('should throw error when cityCode is too short', async () => {
      await expect(service.searchHotelsByCity({ cityCode: 'PA' }))
        .rejects
        .toThrow('Invalid city code format');
    });

    it('should throw error when cityCode is too long', async () => {
      await expect(service.searchHotelsByCity({ cityCode: 'PARI' }))
        .rejects
        .toThrow('Invalid city code format');
    });
  });
});


/**
 * Unit Tests for Amadeus Service - Geocode Search
 * 
 * Tests specific scenarios for geocode search functionality including:
 * - Valid coordinate searches
 * - Radius parameter handling
 * - Coordinate validation (invalid latitude/longitude)
 * - Result caching behavior
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6
 */
describe('AmadeusService - Geocode Search', () => {
  let service;
  let config;
  let authManager;
  let errorHandler;
  let cache;

  beforeEach(() => {
    // Create fresh instances for each test
    config = new AmadeusConfig();
    config.apiKey = 'test_key';
    config.apiSecret = 'test_secret';
    config.baseUrl = 'https://test.api.amadeus.com';
    config.enabled = true;
    config.searchCacheTTL = 300; // 5 minutes

    cache = new CacheManager({ stdTTL: 300 });
    authManager = new AmadeusAuthManager(config, cache);
    errorHandler = new AmadeusErrorHandler();

    service = new AmadeusService(config, authManager, errorHandler, cache);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods to suppress logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cache.clear();
    jest.restoreAllMocks();
  });

  describe('Search with Valid Coordinates', () => {
    it('should successfully search hotels with valid coordinates', async () => {
      // Mock authentication
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      // Mock API response
      const mockHotels = [
        {
          hotelId: 'ACPAR419',
          name: 'LE NOTRE DAME',
          chainCode: 'AC',
          geoCode: { latitude: 48.85341, longitude: 2.34880 },
          distance: { value: 0.5, unit: 'KM' }
        },
        {
          hotelId: 'HLPAR123',
          name: 'PARIS HOTEL',
          chainCode: 'HL',
          geoCode: { latitude: 48.86, longitude: 2.35 },
          distance: { value: 1.2, unit: 'KM' }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: mockHotels
        }
      });

      const result = await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522
      });

      // Verify API was called correctly
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode',
        expect.objectContaining({
          params: {
            latitude: 48.8566,
            longitude: 2.3522
          },
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid_token'
          })
        })
      );

      // Verify results are transformed
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('amadeus_ACPAR419');
      expect(result[0].source).toBe('amadeus');
      expect(result[1].id).toBe('amadeus_HLPAR123');
    });

    it('should accept string coordinates and convert to numbers', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.searchHotelsByGeocode({
        latitude: '40.7128',
        longitude: '-74.0060'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 40.7128,
            longitude: -74.0060
          })
        })
      );
    });

    it('should handle boundary latitude values', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      // Test minimum latitude
      await service.searchHotelsByGeocode({ latitude: -90, longitude: 0 });
      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ latitude: -90 })
        })
      );

      // Test maximum latitude
      await service.searchHotelsByGeocode({ latitude: 90, longitude: 0 });
      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ latitude: 90 })
        })
      );
    });

    it('should handle boundary longitude values', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      // Test minimum longitude
      await service.searchHotelsByGeocode({ latitude: 0, longitude: -180 });
      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ longitude: -180 })
        })
      );

      // Test maximum longitude
      await service.searchHotelsByGeocode({ latitude: 0, longitude: 180 });
      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ longitude: 180 })
        })
      );
    });

    it('should increment request counter on successful search', async () => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const initialCount = service.requestCount;
      await service.searchHotelsByGeocode({ latitude: 51.5074, longitude: -0.1278 });

      expect(service.requestCount).toBe(initialCount + 1);
    });
  });

  describe('Search with Radius Parameters', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);

      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });
    });

    it('should include radius parameter when provided', async () => {
      await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 10
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 48.8566,
            longitude: 2.3522,
            radius: 10
          })
        })
      );
    });

    it('should include radiusUnit parameter and convert to uppercase', async () => {
      await service.searchHotelsByGeocode({
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5,
        radiusUnit: 'mile'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            latitude: 40.7128,
            longitude: -74.0060,
            radius: 5,
            radiusUnit: 'MILE'
          })
        })
      );
    });

    it('should handle radius of 0', async () => {
      await service.searchHotelsByGeocode({
        latitude: 35.6762,
        longitude: 139.6503,
        radius: 0
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            radius: 0
          })
        })
      );
    });

    it('should include amenities, ratings, and chainCodes when provided', async () => {
      await service.searchHotelsByGeocode({
        latitude: 51.5074,
        longitude: -0.1278,
        radius: 15,
        radiusUnit: 'KM',
        amenities: ['WIFI', 'PARKING'],
        ratings: ['4', '5'],
        chainCodes: ['HI', 'MC']
      });

      const callParams = axios.get.mock.calls[0][1].params;
      expect(callParams.latitude).toBe(51.5074);
      expect(callParams.longitude).toBe(-0.1278);
      expect(callParams.radius).toBe(15);
      expect(callParams.radiusUnit).toBe('KM');
      expect(callParams.ratings).toBe('4,5');
      expect(callParams.chainCodes).toBe('HI,MC');
      
      // Check amenities are present (order may vary)
      expect(callParams.amenities).toBeDefined();
      expect(callParams.amenities.split(',')).toHaveLength(2);
    });
  });

  describe('Coordinate Validation - Invalid Latitude', () => {
    it('should reject latitude below -90', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: -90.01,
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*between -90 and 90/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject latitude above 90', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 90.01,
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*between -90 and 90/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject latitude far outside valid range', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 200,
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*between -90 and 90/i);

      await expect(
        service.searchHotelsByGeocode({
          latitude: -200,
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*between -90 and 90/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject non-numeric latitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 'invalid',
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*between -90 and 90/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject missing latitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*required/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject null latitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: null,
          longitude: 0
        })
      ).rejects.toThrow(/latitude.*required/i);

      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('Coordinate Validation - Invalid Longitude', () => {
    it('should reject longitude below -180', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: -180.01
        })
      ).rejects.toThrow(/longitude.*between -180 and 180/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject longitude above 180', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: 180.01
        })
      ).rejects.toThrow(/longitude.*between -180 and 180/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject longitude far outside valid range', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: 500
        })
      ).rejects.toThrow(/longitude.*between -180 and 180/i);

      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: -500
        })
      ).rejects.toThrow(/longitude.*between -180 and 180/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject non-numeric longitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: 'invalid'
        })
      ).rejects.toThrow(/longitude.*between -180 and 180/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject missing longitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0
        })
      ).rejects.toThrow(/longitude.*required/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject null longitude', async () => {
      await expect(
        service.searchHotelsByGeocode({
          latitude: 0,
          longitude: null
        })
      ).rejects.toThrow(/longitude.*required/i);

      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  describe('Search Result Caching', () => {
    beforeEach(() => {
      cache.set('amadeus:token', 'valid_token', 1800);
      cache.set('amadeus:token:expiry', Date.now() + 1800000, 1800);
    });

    it('should cache geocode search results', async () => {
      const mockHotels = [
        {
          hotelId: 'HOTEL001',
          name: 'Test Hotel',
          geoCode: { latitude: 48.8566, longitude: 2.3522 }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: mockHotels }
      });

      // First call - should hit API
      const result1 = await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522
      });

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(result1).toHaveLength(1);

      // Second call with same params - should use cache
      const result2 = await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522
      });

      expect(axios.get).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2).toHaveLength(1);
      expect(result2).toEqual(result1);
    });

    it('should use different cache keys for different coordinates', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      // First search
      await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522
      });

      // Second search with different coordinates
      await service.searchHotelsByGeocode({
        latitude: 40.7128,
        longitude: -74.0060
      });

      // Both should hit the API
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different radius parameters', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: { data: [] }
      });

      // First search with radius
      await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 10
      });

      // Second search with different radius
      await service.searchHotelsByGeocode({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 20
      });

      // Both should hit the API
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('should return cached results within TTL period', async () => {
      const mockHotels = [
        {
          hotelId: 'HOTEL001',
          name: 'Test Hotel',
          geoCode: { latitude: 51.5074, longitude: -0.1278 }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: mockHotels }
      });

      // First call
      await service.searchHotelsByGeocode({
        latitude: 51.5074,
        longitude: -0.1278,
        radius: 5
      });

      // Multiple subsequent calls within TTL
      for (let i = 0; i < 5; i++) {
        await service.searchHotelsByGeocode({
          latitude: 51.5074,
          longitude: -0.1278,
          radius: 5
        });
      }

      // Should only call API once
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});


describe('Hotel Details Retrieval', () => {
  let service;
  let config;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    config = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
      hotelCacheTTL: 86400,
      isEnabled: () => true
    };

    // Create mock auth manager
    mockAuthManager = {
      getAccessToken: jest.fn().mockResolvedValue('mock_token'),
      getStats: jest.fn().mockReturnValue({
        hasToken: true,
        isExpired: false
      })
    };

    // Create mock error handler
    mockErrorHandler = {
      handleApiError: jest.fn()
    };

    // Create mock cache
    mockCache = new CacheManager({ stdTTL: 86400 });

    // Create service instance
    service = new AmadeusService(config, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  describe('getHotelDetails', () => {
    it('should retrieve hotel details with valid hotel ID', async () => {
      const mockHotelData = {
        hotelId: 'ACPAR419',
        name: 'LE NOTRE DAME',
        chainCode: 'AC',
        iataCode: 'PAR',
        dupeId: 700140792,
        geoCode: {
          latitude: 48.8566,
          longitude: 2.3522
        },
        address: {
          lines: ['123 Test Street'],
          cityName: 'Paris',
          countryCode: 'FR',
          postalCode: '75001'
        }
      };

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [mockHotelData] }
      });

      const result = await service.getHotelDetails('ACPAR419');

      // Verify API was called correctly
      expect(axios.get).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels',
        expect.objectContaining({
          params: { hotelIds: 'ACPAR419' }
        })
      );

      // Verify result is transformed
      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('source', 'amadeus');
      expect(result).toHaveProperty('isExternal', true);
    });

    it('should handle hotel not found (404)', async () => {
      axios.get.mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Not Found'
      });

      mockErrorHandler.handleApiError.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'HOTEL_NOT_FOUND',
          message: 'Hotel with ID NOTFOUND not found',
          statusCode: 404
        }
      });

      await expect(service.getHotelDetails('NOTFOUND')).rejects.toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'HOTEL_NOT_FOUND'
        })
      });
    });

    it('should reject invalid hotel ID format', async () => {
      await expect(service.getHotelDetails('ABC')).rejects.toThrow(/invalid hotel id format/i);
      await expect(service.getHotelDetails('ABCDEFGHI')).rejects.toThrow(/invalid hotel id format/i);
      await expect(service.getHotelDetails('ABC-1234')).rejects.toThrow(/invalid hotel id format/i);
      
      // Verify no API calls were made
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should cache hotel details', async () => {
      const mockHotelData = {
        hotelId: 'HOTEL123',
        name: 'Test Hotel',
        chainCode: 'AC',
        geoCode: { latitude: 48.8566, longitude: 2.3522 },
        address: { countryCode: 'FR' }
      };

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [mockHotelData] }
      });

      // First call
      await service.getHotelDetails('HOTEL123');
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getHotelDetails('HOTEL123');
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Third call - should still use cache
      await service.getHotelDetails('HOTEL123');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValueOnce({
        response: { status: 500 },
        message: 'Internal Server Error'
      });

      mockErrorHandler.handleApiError.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Server error occurred'
        }
      });

      await expect(service.getHotelDetails('HOTEL123')).rejects.toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'SERVER_ERROR'
        })
      });
    });
  });

  describe('getMultipleHotelDetails', () => {
    it('should retrieve multiple hotel details in batch', async () => {
      const mockHotels = [
        {
          hotelId: 'HOTEL001',
          name: 'Hotel One',
          chainCode: 'AC',
          geoCode: { latitude: 48.8566, longitude: 2.3522 },
          address: { countryCode: 'FR' }
        },
        {
          hotelId: 'HOTEL002',
          name: 'Hotel Two',
          chainCode: 'AC',
          geoCode: { latitude: 48.8566, longitude: 2.3522 },
          address: { countryCode: 'FR' }
        },
        {
          hotelId: 'HOTEL003',
          name: 'Hotel Three',
          chainCode: 'AC',
          geoCode: { latitude: 48.8566, longitude: 2.3522 },
          address: { countryCode: 'FR' }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: mockHotels }
      });

      const results = await service.getMultipleHotelDetails(['HOTEL001', 'HOTEL002', 'HOTEL003']);

      // Verify API was called with comma-separated IDs
      expect(axios.get).toHaveBeenCalledWith(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels',
        expect.objectContaining({
          params: { hotelIds: 'HOTEL001,HOTEL002,HOTEL003' }
        })
      );

      // Verify results
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('source', 'amadeus');
        expect(result).toHaveProperty('isExternal', true);
      });
    });

    it('should return empty array for empty input', async () => {
      const results = await service.getMultipleHotelDetails([]);
      expect(results).toEqual([]);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject invalid hotel IDs in batch', async () => {
      await expect(
        service.getMultipleHotelDetails(['HOTEL001', 'ABC', 'HOTEL003'])
      ).rejects.toThrow(/invalid hotel id format/i);

      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should cache each hotel independently', async () => {
      const mockHotels = [
        {
          hotelId: 'HOTEL001',
          name: 'Hotel One',
          chainCode: 'AC',
          geoCode: { latitude: 48.8566, longitude: 2.3522 },
          address: { countryCode: 'FR' }
        },
        {
          hotelId: 'HOTEL002',
          name: 'Hotel Two',
          chainCode: 'AC',
          geoCode: { latitude: 48.8566, longitude: 2.3522 },
          address: { countryCode: 'FR' }
        }
      ];

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: mockHotels }
      });

      // Batch request
      await service.getMultipleHotelDetails(['HOTEL001', 'HOTEL002']);
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Individual requests should use cache
      await service.getHotelDetails('HOTEL001');
      await service.getHotelDetails('HOTEL002');
      
      // Should still be only 1 API call (from batch)
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should only fetch uncached hotels in batch requests', async () => {
      // Pre-cache HOTEL001
      const mockHotel1 = {
        hotelId: 'HOTEL001',
        name: 'Hotel One',
        chainCode: 'AC',
        geoCode: { latitude: 48.8566, longitude: 2.3522 },
        address: { countryCode: 'FR' }
      };

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [mockHotel1] }
      });

      await service.getHotelDetails('HOTEL001');
      expect(axios.get).toHaveBeenCalledTimes(1);

      // Now request batch with one cached and one uncached
      const mockHotel2 = {
        hotelId: 'HOTEL002',
        name: 'Hotel Two',
        chainCode: 'AC',
        geoCode: { latitude: 48.8566, longitude: 2.3522 },
        address: { countryCode: 'FR' }
      };

      axios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [mockHotel2] }
      });

      const results = await service.getMultipleHotelDetails(['HOTEL001', 'HOTEL002']);

      // Should only call API for HOTEL002
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenLastCalledWith(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels',
        expect.objectContaining({
          params: { hotelIds: 'HOTEL002' }
        })
      );

      // Should return both hotels
      expect(results).toHaveLength(2);
    });

    it('should handle API errors in batch retrieval', async () => {
      axios.get.mockRejectedValueOnce({
        response: { status: 500 },
        message: 'Internal Server Error'
      });

      mockErrorHandler.handleApiError.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Server error occurred'
        }
      });

      await expect(
        service.getMultipleHotelDetails(['HOTEL001', 'HOTEL002'])
      ).rejects.toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'SERVER_ERROR'
        })
      });
    });
  });
});
