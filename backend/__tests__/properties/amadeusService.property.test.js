/**
 * Property-Based Tests for Amadeus Service
 * 
 * Tests universal properties of the Amadeus Service using fast-check.
 */

const fc = require('fast-check');
const AmadeusService = require('../../services/amadeus/AmadeusService');
const AmadeusAuthManager = require('../../services/amadeus/AmadeusAuthManager');
const AmadeusErrorHandler = require('../../services/amadeus/AmadeusErrorHandler');
const { CacheManager } = require('../../utils/cacheManager');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Feature: amadeus-hotel-integration, Property 19: Request tracking', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
  });

  /**
   * Property 19: Request Tracking
   * For any API request made to Amadeus, the system should increment the request counter
   * and log the request with timestamp.
   * 
   * Validates: Requirements 6.1
   */
  it('should track all API requests with counter increment and logging', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random endpoint paths
        fc.constantFrom('/v1/hotels', '/v1/search', '/v1/details', '/v1/test'),
        // Generate random query parameters
        fc.record({
          param1: fc.option(fc.string({ maxLength: 10 })),
          param2: fc.option(fc.integer({ min: 0, max: 100 }))
        }),
        async (endpoint, params) => {
          // Mock successful axios response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { success: true }
          });

          // Get initial request count
          const initialCount = service.requestCount;
          const initialLogLength = service.requestLog.length;

          // Make request
          await service.makeRequest(endpoint, params);

          // Verify request counter incremented
          expect(service.requestCount).toBe(initialCount + 1);

          // Verify request was logged
          expect(service.requestLog.length).toBeGreaterThan(initialLogLength);

          // Find the request log entry
          const requestLogEntry = service.requestLog.find(
            log => log.type === 'request' && log.endpoint === endpoint
          );

          // Verify request log entry exists and has required fields
          expect(requestLogEntry).toBeDefined();
          expect(requestLogEntry).toHaveProperty('requestId');
          expect(requestLogEntry).toHaveProperty('timestamp');
          expect(requestLogEntry).toHaveProperty('endpoint', endpoint);

          // Verify timestamp is valid ISO 8601 format
          expect(() => new Date(requestLogEntry.timestamp)).not.toThrow();
          expect(new Date(requestLogEntry.timestamp).toISOString()).toBe(requestLogEntry.timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track request statistics accurately across multiple requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of requests (1-20 requests)
        fc.array(
          fc.record({
            endpoint: fc.constantFrom('/v1/hotels', '/v1/search', '/v1/details'),
            shouldSucceed: fc.boolean()
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (requests) => {
          // Clear previous state
          service.clearRequestLog();

          let successCount = 0;
          let errorCount = 0;

          // Execute all requests
          for (const req of requests) {
            if (req.shouldSucceed) {
              axios.get.mockResolvedValueOnce({
                status: 200,
                data: { success: true }
              });
              await service.makeRequest(req.endpoint, {});
              successCount++;
            } else {
              axios.get.mockRejectedValueOnce({
                response: { status: 500 },
                message: 'Server error'
              });
              mockErrorHandler.handleApiError.mockResolvedValueOnce({
                success: false,
                error: { code: 'SERVER_ERROR' }
              });
              try {
                await service.makeRequest(req.endpoint, {});
              } catch (error) {
                // Expected error
              }
              errorCount++;
            }
          }

          // Verify total request count
          expect(service.requestCount).toBe(successCount);

          // Verify request log contains all requests
          const requestLogs = service.requestLog.filter(log => log.type === 'request');
          expect(requestLogs.length).toBe(requests.length);

          // Verify error logs
          const errorLogs = service.requestLog.filter(log => log.type === 'error');
          expect(errorLogs.length).toBe(errorCount);

          // Verify response logs
          const responseLogs = service.requestLog.filter(log => log.type === 'response');
          expect(responseLogs.length).toBe(successCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain request log size limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate number of requests exceeding max log size
        fc.integer({ min: 1001, max: 1100 }),
        async (numRequests) => {
          // Clear previous state
          service.clearRequestLog();

          // Mock successful responses
          for (let i = 0; i < numRequests; i++) {
            axios.get.mockResolvedValueOnce({
              status: 200,
              data: { success: true }
            });
            await service.makeRequest('/v1/test', { index: i });
          }

          // Verify log size doesn't exceed maximum
          expect(service.requestLog.length).toBeLessThanOrEqual(service.maxLogSize);

          // Verify most recent requests are kept
          // Find the last request log entry (not response)
          const requestLogs = service.requestLog.filter(log => log.type === 'request');
          if (requestLogs.length > 0) {
            const lastRequest = requestLogs[requestLogs.length - 1];
            expect(lastRequest.params.index).toBe(numRequests - 1);
          }
        }
      ),
      { numRuns: 10 } // Reduced runs due to large number of requests
    );
  });

  it('should generate unique request IDs for all requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of requests
        fc.array(
          fc.constant({}),
          { minLength: 10, maxLength: 50 }
        ),
        async (requests) => {
          // Clear previous state
          service.clearRequestLog();

          // Mock successful responses
          for (let i = 0; i < requests.length; i++) {
            axios.get.mockResolvedValueOnce({
              status: 200,
              data: { success: true }
            });
            await service.makeRequest('/v1/test', {});
          }

          // Extract all request IDs
          const requestIds = service.requestLog
            .filter(log => log.type === 'request')
            .map(log => log.requestId);

          // Verify all IDs are unique
          const uniqueIds = new Set(requestIds);
          expect(uniqueIds.size).toBe(requestIds.length);

          // Verify ID format (req_timestamp_random)
          requestIds.forEach(id => {
            expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 4: City Search API Call
 * For any valid IATA city code, the system should correctly construct and execute 
 * an API request to the Amadeus Hotel List endpoint with that city code.
 * 
 * Feature: amadeus-hotel-integration, Property 4: City Search API Call
 * Validates: Requirements 2.1
 */
describe('Feature: amadeus-hotel-integration, Property 4: City Search API Call', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should construct correct API request for any valid IATA city code', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid 3-letter IATA city codes
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        async (cityCode) => {
          // Mock successful Amadeus API response
          const mockHotels = [
            {
              hotelId: 'HOTEL001',
              name: 'Test Hotel',
              geoCode: { latitude: 48.8566, longitude: 2.3522 },
              address: {
                lines: ['123 Test St'],
                cityName: 'Test City',
                countryCode: 'FR'
              }
            }
          ];

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: mockHotels }
          });

          // Execute search
          await service.searchHotelsByCity({ cityCode });

          // Verify axios was called with correct parameters
          expect(axios.get).toHaveBeenCalledWith(
            'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city',
            expect.objectContaining({
              params: expect.objectContaining({
                cityCode: cityCode.toUpperCase()
              }),
              headers: expect.objectContaining({
                'Authorization': 'Bearer mock_token',
                'Accept': 'application/json'
              })
            })
          );

          // Verify the endpoint is correct
          const callArgs = axios.get.mock.calls[0];
          expect(callArgs[0]).toBe('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
        }
      ),
      { numRuns: 50 } // Reduced from 100 for faster execution
    );
  });
});


/**
 * Property 5: Optional Parameters Inclusion
 * For any combination of optional search parameters (radius, amenities, ratings, chain codes),
 * the system should include all provided parameters in the API request.
 * 
 * Feature: amadeus-hotel-integration, Property 5: Optional Parameters Inclusion
 * Validates: Requirements 2.2
 */
describe('Feature: amadeus-hotel-integration, Property 5: Optional Parameters Inclusion', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should include all provided optional parameters in city search API request', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city code
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        // Generate optional parameters
        fc.record({
          radius: fc.option(fc.integer({ min: 1, max: 300 })),
          radiusUnit: fc.option(fc.constantFrom('KM', 'MILE', 'km', 'mile')),
          amenities: fc.option(fc.array(fc.constantFrom('WIFI', 'PARKING', 'POOL', 'GYM', 'SPA'), { minLength: 1, maxLength: 5 })),
          ratings: fc.option(fc.array(fc.constantFrom('1', '2', '3', '4', '5'), { minLength: 1, maxLength: 3 })),
          chainCodes: fc.option(fc.array(fc.constantFrom('AC', 'HI', 'MC', 'RT', 'WI'), { minLength: 1, maxLength: 3 }))
        }),
        async (cityCode, optionalParams) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Build search params
          const searchParams = {
            cityCode,
            ...optionalParams
          };

          // Execute search
          await service.searchHotelsByCity(searchParams);

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Get the LAST call arguments (in case there were previous calls)
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const apiParams = callArgs[1].params;

          // Verify city code is always present
          expect(apiParams).toHaveProperty('cityCode', cityCode.toUpperCase());

          // Verify optional parameters are included when provided
          if (optionalParams.radius !== null && optionalParams.radius !== undefined) {
            expect(apiParams).toHaveProperty('radius', optionalParams.radius);
          } else {
            expect(apiParams).not.toHaveProperty('radius');
          }

          if (optionalParams.radiusUnit !== null && optionalParams.radiusUnit !== undefined) {
            expect(apiParams).toHaveProperty('radiusUnit', optionalParams.radiusUnit.toUpperCase());
          } else {
            expect(apiParams).not.toHaveProperty('radiusUnit');
          }

          if (optionalParams.amenities !== null && optionalParams.amenities !== undefined) {
            expect(apiParams).toHaveProperty('amenities', optionalParams.amenities.join(','));
          } else {
            expect(apiParams).not.toHaveProperty('amenities');
          }

          if (optionalParams.ratings !== null && optionalParams.ratings !== undefined) {
            expect(apiParams).toHaveProperty('ratings', optionalParams.ratings.join(','));
          } else {
            expect(apiParams).not.toHaveProperty('ratings');
          }

          if (optionalParams.chainCodes !== null && optionalParams.chainCodes !== undefined) {
            expect(apiParams).toHaveProperty('chainCodes', optionalParams.chainCodes.join(','));
          } else {
            expect(apiParams).not.toHaveProperty('chainCodes');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work correctly with no optional parameters provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city code
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        async (cityCode) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with only city code
          await service.searchHotelsByCity({ cityCode });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Get the LAST call arguments
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const apiParams = callArgs[1].params;

          // Verify only city code is present
          expect(apiParams).toHaveProperty('cityCode', cityCode.toUpperCase());
          expect(apiParams).not.toHaveProperty('radius');
          expect(apiParams).not.toHaveProperty('radiusUnit');
          expect(apiParams).not.toHaveProperty('amenities');
          expect(apiParams).not.toHaveProperty('ratings');
          expect(apiParams).not.toHaveProperty('chainCodes');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty arrays for optional array parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city code
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        async (cityCode) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with empty arrays
          await service.searchHotelsByCity({
            cityCode,
            amenities: [],
            ratings: [],
            chainCodes: []
          });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Get the LAST call arguments
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const apiParams = callArgs[1].params;

          // Verify empty arrays are not included in API request
          expect(apiParams).toHaveProperty('cityCode', cityCode.toUpperCase());
          expect(apiParams).not.toHaveProperty('amenities');
          expect(apiParams).not.toHaveProperty('ratings');
          expect(apiParams).not.toHaveProperty('chainCodes');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly format array parameters as comma-separated strings', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city code
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        // Generate non-empty arrays
        fc.array(fc.constantFrom('WIFI', 'PARKING', 'POOL'), { minLength: 1, maxLength: 3 }),
        fc.array(fc.constantFrom('3', '4', '5'), { minLength: 1, maxLength: 3 }),
        fc.array(fc.constantFrom('AC', 'HI', 'MC'), { minLength: 1, maxLength: 3 }),
        async (cityCode, amenities, ratings, chainCodes) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with array parameters
          await service.searchHotelsByCity({
            cityCode,
            amenities,
            ratings,
            chainCodes
          });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Get the LAST call arguments
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const apiParams = callArgs[1].params;

          // Verify arrays are formatted as comma-separated strings
          expect(apiParams.amenities).toBe(amenities.join(','));
          expect(apiParams.ratings).toBe(ratings.join(','));
          expect(apiParams.chainCodes).toBe(chainCodes.join(','));

          // Verify no commas in the individual values (proper formatting)
          expect(apiParams.amenities.split(',')).toHaveLength(amenities.length);
          expect(apiParams.ratings.split(',')).toHaveLength(ratings.length);
          expect(apiParams.chainCodes.split(',')).toHaveLength(chainCodes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should normalize radiusUnit to uppercase', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city code
        fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
        // Generate radius unit in various cases
        fc.constantFrom('km', 'KM', 'Km', 'kM', 'mile', 'MILE', 'Mile', 'MiLe'),
        async (cityCode, radiusUnit) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with radius unit
          await service.searchHotelsByCity({
            cityCode,
            radius: 50,
            radiusUnit
          });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Get the LAST call arguments
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const apiParams = callArgs[1].params;

          // Verify radiusUnit is uppercase
          expect(apiParams.radiusUnit).toBe(radiusUnit.toUpperCase());
          expect(apiParams.radiusUnit).toMatch(/^(KM|MILE)$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 9: Geocode Search API Call
 * For any valid latitude and longitude pair, the system should correctly construct 
 * and execute an API request to the Amadeus Hotel List endpoint with those coordinates.
 * 
 * Feature: amadeus-hotel-integration, Property 9: Geocode Search API Call
 * Validates: Requirements 3.1
 */
describe('Feature: amadeus-hotel-integration, Property 9: Geocode Search API Call', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should construct correct API request for any valid latitude and longitude', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid latitude (-90 to 90)
        fc.double({ min: -90, max: 90, noNaN: true }),
        // Generate valid longitude (-180 to 180)
        fc.double({ min: -180, max: 180, noNaN: true }),
        async (latitude, longitude) => {
          // Mock successful Amadeus API response
          const mockHotels = [
            {
              hotelId: 'HOTEL001',
              name: 'Test Hotel',
              geoCode: { latitude, longitude },
              address: {
                lines: ['123 Test St'],
                cityName: 'Test City',
                countryCode: 'FR'
              }
            }
          ];

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: mockHotels }
          });

          // Execute search
          await service.searchHotelsByGeocode({ latitude, longitude });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Verify the endpoint is correct
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          expect(callArgs[0]).toBe('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode');
          
          // Verify parameters are present and correct (handle -0 vs 0 edge case)
          expect(callArgs[1].params).toHaveProperty('latitude');
          expect(callArgs[1].params).toHaveProperty('longitude');
          expect(Math.abs(callArgs[1].params.latitude - latitude)).toBeLessThan(0.0001);
          expect(Math.abs(callArgs[1].params.longitude - longitude)).toBeLessThan(0.0001);
          
          // Verify headers
          expect(callArgs[1].headers).toHaveProperty('Authorization', 'Bearer mock_token');
          expect(callArgs[1].headers).toHaveProperty('Accept', 'application/json');
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 10: Radius Parameter Support
 * For any search request with a radius parameter, the system should include 
 * the radius value and unit in the API request.
 * 
 * Feature: amadeus-hotel-integration, Property 10: Radius Parameter Support
 * Validates: Requirements 3.2, 3.3
 */
describe('Feature: amadeus-hotel-integration, Property 10: Radius Parameter Support', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should include radius and radiusUnit in API request when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid latitude and longitude
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        // Generate radius (1 to 300)
        fc.integer({ min: 1, max: 300 }),
        // Generate radius unit
        fc.constantFrom('KM', 'MILE', 'km', 'mile'),
        async (latitude, longitude, radius, radiusUnit) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with radius parameters
          await service.searchHotelsByGeocode({
            latitude,
            longitude,
            radius,
            radiusUnit
          });

          // Verify axios was called
          expect(axios.get).toHaveBeenCalled();

          // Verify the call parameters
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          expect(callArgs[0]).toBe('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode');
          
          // Verify radius parameters are present
          expect(callArgs[1].params).toHaveProperty('radius', radius);
          expect(callArgs[1].params).toHaveProperty('radiusUnit', radiusUnit.toUpperCase());
          
          // Verify radiusUnit is uppercase
          expect(callArgs[1].params.radiusUnit).toMatch(/^(KM|MILE)$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work without radius parameters when not provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid latitude and longitude
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        async (latitude, longitude) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search without radius parameters
          await service.searchHotelsByGeocode({
            latitude,
            longitude
          });

          // Verify axios was called without radius parameters
          const callArgs = axios.get.mock.calls[0];
          expect(callArgs[1].params).not.toHaveProperty('radius');
          expect(callArgs[1].params).not.toHaveProperty('radiusUnit');
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 11: Coordinate Validation
 * For any latitude value outside the range [-90, 90] or longitude value outside 
 * the range [-180, 180], the system should reject the request with a validation error.
 * 
 * Feature: amadeus-hotel-integration, Property 11: Coordinate Validation
 * Validates: Requirements 3.5, 3.6
 */
describe('Feature: amadeus-hotel-integration, Property 11: Coordinate Validation', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
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
    mockCache = new CacheManager({ stdTTL: 300 });

    // Create service instance
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should reject invalid latitude values outside [-90, 90]', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid latitude values
        fc.oneof(
          fc.double({ min: -1000, max: -90.01, noNaN: true }),
          fc.double({ min: 90.01, max: 1000, noNaN: true })
        ),
        // Generate valid longitude
        fc.double({ min: -180, max: 180, noNaN: true }),
        async (invalidLatitude, validLongitude) => {
          // Attempt search with invalid latitude
          await expect(
            service.searchHotelsByGeocode({
              latitude: invalidLatitude,
              longitude: validLongitude
            })
          ).rejects.toThrow(/latitude.*between -90 and 90/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid longitude values outside [-180, 180]', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid latitude
        fc.double({ min: -90, max: 90, noNaN: true }),
        // Generate invalid longitude values
        fc.oneof(
          fc.double({ min: -1000, max: -180.01, noNaN: true }),
          fc.double({ min: 180.01, max: 1000, noNaN: true })
        ),
        async (validLatitude, invalidLongitude) => {
          // Attempt search with invalid longitude
          await expect(
            service.searchHotelsByGeocode({
              latitude: validLatitude,
              longitude: invalidLongitude
            })
          ).rejects.toThrow(/longitude.*between -180 and 180/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid latitude and longitude at boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate boundary values for latitude
        fc.constantFrom(-90, -89.99, 0, 89.99, 90),
        // Generate boundary values for longitude
        fc.constantFrom(-180, -179.99, 0, 179.99, 180),
        async (latitude, longitude) => {
          // Mock successful Amadeus API response
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Execute search with boundary values
          await service.searchHotelsByGeocode({ latitude, longitude });

          // Verify API call was made successfully
          expect(axios.get).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject missing latitude parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid longitude
        fc.double({ min: -180, max: 180, noNaN: true }),
        async (longitude) => {
          // Attempt search without latitude
          await expect(
            service.searchHotelsByGeocode({ longitude })
          ).rejects.toThrow(/latitude.*required/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject missing longitude parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid latitude
        fc.double({ min: -90, max: 90, noNaN: true }),
        async (latitude) => {
          // Attempt search without longitude
          await expect(
            service.searchHotelsByGeocode({ latitude })
          ).rejects.toThrow(/longitude.*required/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 12: Hotel Details Retrieval
 * For any valid Amadeus hotel ID, the system should successfully query the API 
 * and return hotel details including name, address, coordinates, and chain code.
 * 
 * Feature: amadeus-hotel-integration, Property 12: Hotel Details Retrieval
 * Validates: Requirements 4.1, 4.2
 */
describe('Feature: amadeus-hotel-integration, Property 12: Hotel Details Retrieval', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
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
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should retrieve hotel details for any valid hotel ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid 8-character alphanumeric hotel IDs
        fc.array(
          fc.constantFrom(
            ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
          ),
          { minLength: 8, maxLength: 8 }
        ).map(arr => arr.join('')),
        async (hotelId) => {
          // Mock successful Amadeus API response with hotel details
          const mockHotelData = {
            hotelId: hotelId.toUpperCase(),
            name: 'Test Hotel ' + hotelId,
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

          // Execute hotel details retrieval
          const result = await service.getHotelDetails(hotelId);

          // Verify axios was called with correct endpoint
          expect(axios.get).toHaveBeenCalledWith(
            'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels',
            expect.objectContaining({
              params: expect.objectContaining({
                hotelIds: hotelId.toUpperCase()
              }),
              headers: expect.objectContaining({
                'Authorization': 'Bearer mock_token',
                'Accept': 'application/json'
              })
            })
          );

          // Verify result is transformed and contains required fields
          expect(result).toBeDefined();
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('source', 'amadeus');
          expect(result).toHaveProperty('isExternal', true);
          
          // Verify metadata contains chain code
          expect(result.metadata).toBeDefined();
          expect(result.metadata).toHaveProperty('chainCode');
          
          // Verify location data is present
          expect(result.location).toBeDefined();
          expect(result.location).toHaveProperty('latitude');
          expect(result.location).toHaveProperty('longitude');
          
          // Verify address is present
          expect(result.address).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid hotel ID formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid hotel IDs (wrong length or invalid characters)
        fc.oneof(
          // Too short
          fc.string({ minLength: 1, maxLength: 7 }),
          // Too long
          fc.string({ minLength: 9, maxLength: 20 }),
          // Contains invalid characters
          fc.string({ minLength: 8, maxLength: 8 }).filter(s => /[^A-Z0-9]/i.test(s))
        ),
        async (invalidHotelId) => {
          // Attempt to get hotel details with invalid ID
          await expect(
            service.getHotelDetails(invalidHotelId)
          ).rejects.toThrow(/invalid hotel id format/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle hotel not found (404) gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid hotel ID format
        fc.array(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
          { minLength: 8, maxLength: 8 }
        ).map(arr => arr.join('')),
        async (hotelId) => {
          // Mock 404 response (hotel not found)
          axios.get.mockRejectedValueOnce({
            response: { status: 404 },
            message: 'Not Found'
          });

          // Mock error handler to return formatted error
          mockErrorHandler.handleApiError.mockResolvedValueOnce({
            success: false,
            error: {
              code: 'HOTEL_NOT_FOUND',
              message: `Hotel with ID ${hotelId.toUpperCase()} not found`,
              statusCode: 404
            }
          });

          // Attempt to get hotel details
          try {
            await service.getHotelDetails(hotelId);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            // Verify error format
            expect(error).toHaveProperty('success', false);
            expect(error).toHaveProperty('error');
            expect(error.error).toHaveProperty('code', 'HOTEL_NOT_FOUND');
            expect(error.error).toHaveProperty('statusCode', 404);
          }

          // Verify API call was made
          expect(axios.get).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle empty response data gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid hotel ID
        fc.array(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
          { minLength: 8, maxLength: 8 }
        ).map(arr => arr.join('')),
        async (hotelId) => {
          // Mock empty response (no hotels found)
          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: [] }
          });

          // Attempt to get hotel details
          await expect(
            service.getHotelDetails(hotelId)
          ).rejects.toMatchObject({
            success: false,
            error: expect.objectContaining({
              code: 'HOTEL_NOT_FOUND'
            })
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should retrieve multiple hotel details in batch', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of valid hotel IDs (1-10 hotels)
        fc.array(
          fc.array(
            fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
            { minLength: 8, maxLength: 8 }
          ).map(arr => arr.join('')),
          { minLength: 1, maxLength: 10 }
        ),
        async (hotelIds) => {
          // Mock successful Amadeus API response with multiple hotels
          const mockHotels = hotelIds.map(id => ({
            hotelId: id.toUpperCase(),
            name: 'Test Hotel ' + id,
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          }));

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: mockHotels }
          });

          // Execute batch retrieval
          const results = await service.getMultipleHotelDetails(hotelIds);

          // Verify results array has correct length
          expect(results).toHaveLength(hotelIds.length);

          // Verify all results are transformed
          results.forEach(result => {
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('source', 'amadeus');
            expect(result).toHaveProperty('isExternal', true);
          });

          // Verify API was called with comma-separated IDs
          expect(axios.get).toHaveBeenCalledWith(
            'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-hotels',
            expect.objectContaining({
              params: expect.objectContaining({
                hotelIds: hotelIds.map(id => id.toUpperCase()).join(',')
              })
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject batch retrieval with invalid hotel IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array with at least one invalid ID
        fc.array(
          fc.oneof(
            // Valid IDs
            fc.array(
              fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
              { minLength: 8, maxLength: 8 }
            ).map(arr => arr.join('')),
            // Invalid IDs
            fc.string({ minLength: 1, maxLength: 7 })
          ),
          { minLength: 1, maxLength: 5 }
        ).filter(arr => arr.some(id => id.length !== 8)),
        async (hotelIds) => {
          // Attempt batch retrieval with invalid IDs
          await expect(
            service.getMultipleHotelDetails(hotelIds)
          ).rejects.toThrow(/invalid hotel id format/i);

          // Verify no API call was made
          expect(axios.get).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return empty array for empty hotel IDs array', async () => {
    const result = await service.getMultipleHotelDetails([]);
    expect(result).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });
});


/**
 * Property 13: Hotel Details Caching
 * For any hotel ID, repeated requests for that hotel's details within the cache TTL 
 * should return cached data without making additional API calls.
 * 
 * Feature: amadeus-hotel-integration, Property 13: Hotel Details Caching
 * Validates: Requirements 4.4
 */
describe('Feature: amadeus-hotel-integration, Property 13: Hotel Details Caching', () => {
  let service;
  let mockConfig;
  let mockAuthManager;
  let mockErrorHandler;
  let mockCache;

  beforeEach(() => {
    // Create mock config
    mockConfig = {
      baseUrl: 'https://test.api.amadeus.com',
      searchCacheTTL: 300,
      hotelCacheTTL: 86400, // 24 hours
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
    service = new AmadeusService(mockConfig, mockAuthManager, mockErrorHandler, mockCache);

    // Clear axios mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearRequestLog();
    mockCache.clear();
  });

  it('should cache hotel details and serve from cache on subsequent requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid hotel ID
        fc.array(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
          { minLength: 8, maxLength: 8 }
        ).map(arr => arr.join('')),
        // Generate number of repeat requests (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (hotelId, repeatCount) => {
          // Mock successful Amadeus API response
          const mockHotelData = {
            hotelId: hotelId.toUpperCase(),
            name: 'Test Hotel',
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          };

          axios.get.mockResolvedValue({
            status: 200,
            data: { data: [mockHotelData] }
          });

          // First request - should hit API
          const firstResult = await service.getHotelDetails(hotelId);
          expect(firstResult).toBeDefined();
          expect(axios.get).toHaveBeenCalledTimes(1);

          // Clear mock call count
          axios.get.mockClear();

          // Subsequent requests - should use cache
          for (let i = 0; i < repeatCount - 1; i++) {
            const cachedResult = await service.getHotelDetails(hotelId);
            
            // Verify result is the same
            expect(cachedResult).toEqual(firstResult);
          }

          // Verify no additional API calls were made
          expect(axios.get).not.toHaveBeenCalled();

          // Verify cache hit
          const cacheKey = `amadeus:hotel:${hotelId.toUpperCase()}`;
          expect(mockCache.has(cacheKey)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should cache each hotel independently in batch retrieval', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of unique hotel IDs
        fc.uniqueArray(
          fc.array(
            fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
            { minLength: 8, maxLength: 8 }
          ).map(arr => arr.join('')),
          { minLength: 2, maxLength: 5 }
        ),
        async (hotelIds) => {
          // Mock successful batch response
          const mockHotels = hotelIds.map(id => ({
            hotelId: id.toUpperCase(),
            name: 'Test Hotel ' + id,
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          }));

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: mockHotels }
          });

          // First batch request
          await service.getMultipleHotelDetails(hotelIds);
          expect(axios.get).toHaveBeenCalledTimes(1);

          // Clear mock
          axios.get.mockClear();

          // Request individual hotels - should all be cached
          for (const hotelId of hotelIds) {
            const result = await service.getHotelDetails(hotelId);
            expect(result).toBeDefined();
          }

          // Verify no additional API calls
          expect(axios.get).not.toHaveBeenCalled();

          // Verify all hotels are in cache
          hotelIds.forEach(id => {
            const cacheKey = `amadeus:hotel:${id.toUpperCase()}`;
            expect(mockCache.has(cacheKey)).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only fetch uncached hotels in batch requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two sets of hotel IDs
        fc.uniqueArray(
          fc.array(
            fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
            { minLength: 8, maxLength: 8 }
          ).map(arr => arr.join('')),
          { minLength: 4, maxLength: 6 }
        ),
        async (allHotelIds) => {
          // Split into cached and uncached
          const midpoint = Math.floor(allHotelIds.length / 2);
          const cachedIds = allHotelIds.slice(0, midpoint);
          const uncachedIds = allHotelIds.slice(midpoint);

          // Pre-cache first set
          const cachedMockHotels = cachedIds.map(id => ({
            hotelId: id.toUpperCase(),
            name: 'Cached Hotel ' + id,
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          }));

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: cachedMockHotels }
          });

          await service.getMultipleHotelDetails(cachedIds);
          axios.get.mockClear();

          // Mock response for uncached hotels only
          const uncachedMockHotels = uncachedIds.map(id => ({
            hotelId: id.toUpperCase(),
            name: 'Uncached Hotel ' + id,
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          }));

          axios.get.mockResolvedValueOnce({
            status: 200,
            data: { data: uncachedMockHotels }
          });

          // Request all hotels (cached + uncached)
          const results = await service.getMultipleHotelDetails(allHotelIds);

          // Verify we got all hotels
          expect(results).toHaveLength(allHotelIds.length);

          // Verify API was only called for uncached hotels
          if (uncachedIds.length > 0) {
            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(axios.get).toHaveBeenCalledWith(
              expect.any(String),
              expect.objectContaining({
                params: expect.objectContaining({
                  hotelIds: uncachedIds.map(id => id.toUpperCase()).join(',')
                })
              })
            );
          } else {
            expect(axios.get).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect cache TTL configuration', async () => {
    // Create service with short cache TTL for testing
    const shortTTLConfig = {
      ...mockConfig,
      hotelCacheTTL: 1 // 1 second
    };

    const shortTTLCache = new CacheManager({ stdTTL: 1 });
    const shortTTLService = new AmadeusService(
      shortTTLConfig,
      mockAuthManager,
      mockErrorHandler,
      shortTTLCache
    );

    await fc.assert(
      fc.asyncProperty(
        // Generate valid hotel ID
        fc.array(
          fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
          { minLength: 8, maxLength: 8 }
        ).map(arr => arr.join('')),
        async (hotelId) => {
          // Clear any previous mocks
          jest.clearAllMocks();
          shortTTLCache.clear();
          shortTTLService.clearRequestLog();

          // Mock response
          const mockHotelData = {
            hotelId: hotelId.toUpperCase(),
            name: 'Test Hotel',
            chainCode: 'AC',
            geoCode: { latitude: 48.8566, longitude: 2.3522 },
            address: { countryCode: 'FR' }
          };

          axios.get.mockResolvedValue({
            status: 200,
            data: { data: [mockHotelData] }
          });

          // First request
          await shortTTLService.getHotelDetails(hotelId);
          expect(axios.get).toHaveBeenCalledTimes(1);

          // Wait for cache to expire
          await new Promise(resolve => setTimeout(resolve, 1100));

          // Clear mock call count
          axios.get.mockClear();

          // Second request after TTL - should hit API again
          await shortTTLService.getHotelDetails(hotelId);
          expect(axios.get).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 10 } // Reduced runs due to timeout
    );
  });
});
