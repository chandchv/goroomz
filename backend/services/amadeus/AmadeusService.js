/**
 * Amadeus Service
 * 
 * Core integration with Amadeus Hotel API.
 * Handles authenticated requests, error handling, caching, and request tracking.
 */

const axios = require('axios');
const AmadeusAuthManager = require('./AmadeusAuthManager');
const AmadeusErrorHandler = require('./AmadeusErrorHandler');
const { CacheManager } = require('../../utils/cacheManager');
const { getConfig } = require('./config');

/**
 * Amadeus Service class
 */
class AmadeusService {
  constructor(config = null, authManager = null, errorHandler = null, cache = null) {
    this.config = config || getConfig();
    this.authManager = authManager || new AmadeusAuthManager(this.config);
    this.errorHandler = errorHandler || new AmadeusErrorHandler();
    this.cache = cache || new CacheManager({ stdTTL: this.config.searchCacheTTL });
    
    // Request tracking
    this.requestCount = 0;
    this.requestLog = [];
    this.maxLogSize = 1000; // Keep last 1000 requests
  }

  /**
   * Make authenticated request to Amadeus API
   * @param {string} endpoint - API endpoint path
   * @param {Object} params - Query parameters
   * @param {Object} context - Additional context for error handling
   * @returns {Promise<Object>} API response data
   */
  async makeRequest(endpoint, params = {}, context = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Get access token
      const accessToken = await this.authManager.getAccessToken();

      // Build full URL
      const url = `${this.config.baseUrl}${endpoint}`;

      // Log request
      this.logRequest({
        requestId,
        endpoint,
        params,
        timestamp: new Date().toISOString()
      });

      // Make HTTP request
      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      // Log successful response
      const duration = Date.now() - startTime;
      this.logResponse({
        requestId,
        statusCode: response.status,
        duration,
        timestamp: new Date().toISOString()
      });

      // Increment request counter
      this.requestCount++;

      return response.data;

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      this.logError({
        requestId,
        error: error.message,
        statusCode: error.response?.status,
        duration,
        timestamp: new Date().toISOString()
      });

      // Handle error with retry logic
      const errorContext = {
        ...context,
        endpoint,
        params,
        authManager: this.authManager,
        retryFunction: async (retryContext) => {
          return this.makeRequest(endpoint, params, retryContext);
        }
      };

      const errorResult = await this.errorHandler.handleApiError(error, errorContext);

      // If error handler returns a result (from retry), return it
      if (errorResult && errorResult.data) {
        return errorResult.data;
      }

      // Otherwise, throw the formatted error
      throw errorResult;
    }
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log API request
   * @param {Object} logData - Request log data
   */
  logRequest(logData) {
    console.log('[AmadeusService] API Request', {
      requestId: logData.requestId,
      endpoint: logData.endpoint,
      params: logData.params,
      timestamp: logData.timestamp
    });

    // Add to request log
    this.addToRequestLog({
      type: 'request',
      ...logData
    });
  }

  /**
   * Log API response
   * @param {Object} logData - Response log data
   */
  logResponse(logData) {
    console.log('[AmadeusService] API Response', {
      requestId: logData.requestId,
      statusCode: logData.statusCode,
      duration: `${logData.duration}ms`,
      timestamp: logData.timestamp
    });

    // Add to request log
    this.addToRequestLog({
      type: 'response',
      ...logData
    });
  }

  /**
   * Log API error
   * @param {Object} logData - Error log data
   */
  logError(logData) {
    console.error('[AmadeusService] API Error', {
      requestId: logData.requestId,
      error: logData.error,
      statusCode: logData.statusCode,
      duration: `${logData.duration}ms`,
      timestamp: logData.timestamp
    });

    // Add to request log
    this.addToRequestLog({
      type: 'error',
      ...logData
    });
  }

  /**
   * Add entry to request log
   * @param {Object} entry - Log entry
   */
  addToRequestLog(entry) {
    this.requestLog.push(entry);

    // Keep log size under limit
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog.shift();
    }
  }

  /**
   * Get request tracking statistics
   * @returns {Object} Request statistics
   */
  getRequestStats() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentRequests = this.requestLog.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= oneHourAgo;
    });

    const dailyRequests = this.requestLog.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= oneDayAgo;
    });

    const errors = this.requestLog.filter(log => log.type === 'error');
    const recentErrors = errors.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= oneHourAgo;
    });

    const responses = this.requestLog.filter(log => log.type === 'response');
    const avgDuration = responses.length > 0
      ? responses.reduce((sum, log) => sum + log.duration, 0) / responses.length
      : 0;

    return {
      totalRequests: this.requestCount,
      requestsLastHour: recentRequests.filter(log => log.type === 'request').length,
      requestsLast24Hours: dailyRequests.filter(log => log.type === 'request').length,
      totalErrors: errors.length,
      errorsLastHour: recentErrors.length,
      errorRate: this.requestCount > 0 ? ((errors.length / this.requestCount) * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: Math.round(avgDuration) + 'ms',
      cacheStats: this.cache.getStats(),
      authStats: this.authManager.getStats()
    };
  }

  /**
   * Get recent request log entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Recent log entries
   */
  getRecentRequests(limit = 50) {
    return this.requestLog.slice(-limit).reverse();
  }

  /**
   * Clear request log and reset counters
   */
  clearRequestLog() {
    this.requestLog = [];
    this.requestCount = 0;
    console.log('[AmadeusService] Request log cleared', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const stats = this.getRequestStats();
    const recentErrorRate = stats.errorsLastHour / Math.max(stats.requestsLastHour, 1);

    return {
      status: recentErrorRate > 0.5 ? 'degraded' : 'healthy',
      enabled: this.config.isEnabled(),
      stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search hotels by city code
   * @param {Object} params - Search parameters
   * @param {string} params.cityCode - IATA city code (e.g., 'PAR')
   * @param {number} [params.radius] - Search radius in km
   * @param {string} [params.radiusUnit] - 'KM' or 'MILE'
   * @param {string[]} [params.amenities] - Array of amenity codes
   * @param {string[]} [params.ratings] - Array of star ratings
   * @param {string[]} [params.chainCodes] - Array of hotel chain codes
   * @returns {Promise<Array>} Array of transformed hotel objects
   */
  async searchHotelsByCity(params) {
    // Validate required parameters
    if (!params || !params.cityCode) {
      throw new Error('City code is required for hotel search');
    }

    // Validate city code format (3-letter IATA code)
    if (typeof params.cityCode !== 'string' || !/^[A-Z]{3}$/i.test(params.cityCode)) {
      throw new Error('Invalid city code format. Expected 3-letter IATA code (e.g., PAR, LON, NYC)');
    }

    // Build cache key
    const cacheKey = this.buildCacheKey('city', params);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('[AmadeusService] Returning cached city search results', {
        cityCode: params.cityCode,
        cacheKey,
        resultCount: cachedResult.length
      });
      return cachedResult;
    }

    // Build API query parameters
    const queryParams = {
      cityCode: params.cityCode.toUpperCase()
    };

    // Add optional parameters if provided
    if (params.radius !== undefined && params.radius !== null) {
      queryParams.radius = params.radius;
    }

    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit.toUpperCase();
    }

    if (params.amenities && Array.isArray(params.amenities) && params.amenities.length > 0) {
      queryParams.amenities = params.amenities.join(',');
    }

    if (params.ratings && Array.isArray(params.ratings) && params.ratings.length > 0) {
      queryParams.ratings = params.ratings.join(',');
    }

    if (params.chainCodes && Array.isArray(params.chainCodes) && params.chainCodes.length > 0) {
      queryParams.chainCodes = params.chainCodes.join(',');
    }

    try {
      // Make API request
      const response = await this.makeRequest(
        '/v1/reference-data/locations/hotels/by-city',
        queryParams,
        { operation: 'searchHotelsByCity', cityCode: params.cityCode }
      );

      // Extract hotel data from response
      const hotels = response.data || [];

      // Transform hotels to GoRoomz format
      const AmadeusTransformer = require('./AmadeusTransformer');
      const transformer = new AmadeusTransformer();
      const transformedHotels = transformer.transformHotels(hotels);

      // Cache the results
      this.cache.set(cacheKey, transformedHotels);

      console.log('[AmadeusService] City search completed', {
        cityCode: params.cityCode,
        resultCount: transformedHotels.length,
        cached: true
      });

      return transformedHotels;

    } catch (error) {
      // If error is already formatted by error handler, rethrow
      if (error && typeof error === 'object' && error.error && error.success === false) {
        throw error;
      }

      // Otherwise, wrap in standard error format
      throw {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: `Failed to search hotels in city ${params.cityCode}`,
          details: error.message || String(error)
        }
      };
    }
  }

  /**
   * Search hotels by geographic coordinates
   * @param {Object} params - Search parameters
   * @param {number} params.latitude - Latitude (-90 to 90)
   * @param {number} params.longitude - Longitude (-180 to 180)
   * @param {number} [params.radius] - Search radius
   * @param {string} [params.radiusUnit] - 'KM' or 'MILE'
   * @param {string[]} [params.amenities] - Array of amenity codes
   * @param {string[]} [params.ratings] - Array of star ratings
   * @param {string[]} [params.chainCodes] - Array of hotel chain codes
   * @returns {Promise<Array>} Array of transformed hotel objects
   */
  async searchHotelsByGeocode(params) {
    // Validate required parameters
    if (!params || params.latitude === undefined || params.latitude === null) {
      throw new Error('Latitude is required for geocode search');
    }

    if (params.longitude === undefined || params.longitude === null) {
      throw new Error('Longitude is required for geocode search');
    }

    // Validate latitude range (-90 to 90)
    const latitude = parseFloat(params.latitude);
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    // Validate longitude range (-180 to 180)
    const longitude = parseFloat(params.longitude);
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    // Build cache key
    const cacheKey = this.buildCacheKey('geocode', params);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('[AmadeusService] Returning cached geocode search results', {
        latitude,
        longitude,
        cacheKey,
        resultCount: cachedResult.length
      });
      return cachedResult;
    }

    // Build API query parameters
    const queryParams = {
      latitude: latitude,
      longitude: longitude
    };

    // Add optional parameters if provided
    if (params.radius !== undefined && params.radius !== null) {
      queryParams.radius = params.radius;
    }

    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit.toUpperCase();
    }

    if (params.amenities && Array.isArray(params.amenities) && params.amenities.length > 0) {
      queryParams.amenities = params.amenities.join(',');
    }

    if (params.ratings && Array.isArray(params.ratings) && params.ratings.length > 0) {
      queryParams.ratings = params.ratings.join(',');
    }

    if (params.chainCodes && Array.isArray(params.chainCodes) && params.chainCodes.length > 0) {
      queryParams.chainCodes = params.chainCodes.join(',');
    }

    try {
      // Make API request
      const response = await this.makeRequest(
        '/v1/reference-data/locations/hotels/by-geocode',
        queryParams,
        { operation: 'searchHotelsByGeocode', latitude, longitude }
      );

      // Extract hotel data from response
      const hotels = response.data || [];

      // Transform hotels to GoRoomz format
      const AmadeusTransformer = require('./AmadeusTransformer');
      const transformer = new AmadeusTransformer();
      const transformedHotels = transformer.transformHotels(hotels);

      // Cache the results
      this.cache.set(cacheKey, transformedHotels);

      console.log('[AmadeusService] Geocode search completed', {
        latitude,
        longitude,
        resultCount: transformedHotels.length,
        cached: true
      });

      return transformedHotels;

    } catch (error) {
      // If error is already formatted by error handler, rethrow
      if (error && typeof error === 'object' && error.error && error.success === false) {
        throw error;
      }

      // Otherwise, wrap in standard error format
      throw {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: `Failed to search hotels at coordinates (${latitude}, ${longitude})`,
          details: error.message || String(error)
        }
      };
    }
  }

  /**
   * Get hotel details by hotel ID
   * @param {string} hotelId - Amadeus hotel ID (8 characters)
   * @returns {Promise<Object>} Transformed hotel details
   */
  async getHotelDetails(hotelId) {
    // Validate hotel ID
    if (!hotelId || typeof hotelId !== 'string') {
      throw new Error('Hotel ID is required');
    }

    // Validate hotel ID format (8 alphanumeric characters)
    if (!/^[A-Z0-9]{8}$/i.test(hotelId)) {
      throw new Error('Invalid hotel ID format. Expected 8 alphanumeric characters');
    }

    const normalizedHotelId = hotelId.toUpperCase();

    // Build cache key for hotel details (24-hour TTL)
    const cacheKey = `amadeus:hotel:${normalizedHotelId}`;

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      console.log('[AmadeusService] Returning cached hotel details', {
        hotelId: normalizedHotelId,
        cacheKey
      });
      return cachedResult;
    }

    try {
      // Make API request
      const response = await this.makeRequest(
        '/v1/reference-data/locations/hotels/by-hotels',
        { hotelIds: normalizedHotelId },
        { operation: 'getHotelDetails', hotelId: normalizedHotelId }
      );

      // Extract hotel data from response
      const hotels = response.data || [];

      // Check if hotel was found
      if (hotels.length === 0) {
        throw {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with ID ${normalizedHotelId} not found`,
            statusCode: 404
          }
        };
      }

      // Transform hotel to GoRoomz format
      const AmadeusTransformer = require('./AmadeusTransformer');
      const transformer = new AmadeusTransformer();
      const transformedHotel = transformer.transformHotel(hotels[0]);

      // Cache the result with 24-hour TTL
      const hotelCacheTTL = this.config.hotelCacheTTL || 86400; // 24 hours default
      this.cache.set(cacheKey, transformedHotel, hotelCacheTTL);

      console.log('[AmadeusService] Hotel details retrieved', {
        hotelId: normalizedHotelId,
        cached: true
      });

      return transformedHotel;

    } catch (error) {
      // If error is already formatted by error handler, rethrow
      if (error && typeof error === 'object' && error.error && error.success === false) {
        throw error;
      }

      // Handle 404 specifically
      if (error.response?.status === 404) {
        throw {
          success: false,
          error: {
            code: 'HOTEL_NOT_FOUND',
            message: `Hotel with ID ${normalizedHotelId} not found`,
            statusCode: 404
          }
        };
      }

      // Otherwise, wrap in standard error format
      throw {
        success: false,
        error: {
          code: 'DETAILS_RETRIEVAL_FAILED',
          message: `Failed to retrieve details for hotel ${normalizedHotelId}`,
          details: error.message
        }
      };
    }
  }

  /**
   * Get hotel details for multiple hotels (batch retrieval)
   * @param {string[]} hotelIds - Array of Amadeus hotel IDs
   * @returns {Promise<Array>} Array of transformed hotel details
   */
  async getMultipleHotelDetails(hotelIds) {
    // Validate input
    if (!hotelIds || !Array.isArray(hotelIds)) {
      throw new Error('Hotel IDs must be provided as an array');
    }

    if (hotelIds.length === 0) {
      return [];
    }

    // Validate each hotel ID
    const invalidIds = hotelIds.filter(id => 
      !id || typeof id !== 'string' || !/^[A-Z0-9]{8}$/i.test(id)
    );

    if (invalidIds.length > 0) {
      throw new Error(`Invalid hotel ID format: ${invalidIds.join(', ')}. Expected 8 alphanumeric characters`);
    }

    // Normalize hotel IDs
    const normalizedIds = hotelIds.map(id => id.toUpperCase());

    // Check cache for each hotel
    const cachedHotels = [];
    const uncachedIds = [];

    for (const hotelId of normalizedIds) {
      const cacheKey = `amadeus:hotel:${hotelId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        cachedHotels.push(cached);
      } else {
        uncachedIds.push(hotelId);
      }
    }

    console.log('[AmadeusService] Batch hotel details retrieval', {
      totalRequested: normalizedIds.length,
      cachedCount: cachedHotels.length,
      uncachedCount: uncachedIds.length
    });

    // If all hotels are cached, return them
    if (uncachedIds.length === 0) {
      return cachedHotels;
    }

    try {
      // Make API request for uncached hotels
      // Amadeus API supports comma-separated hotel IDs
      const response = await this.makeRequest(
        '/v1/reference-data/locations/hotels/by-hotels',
        { hotelIds: uncachedIds.join(',') },
        { operation: 'getMultipleHotelDetails', hotelIds: uncachedIds }
      );

      // Extract hotel data from response
      const hotels = response.data || [];

      // Transform hotels to GoRoomz format
      const AmadeusTransformer = require('./AmadeusTransformer');
      const transformer = new AmadeusTransformer();
      const transformedHotels = transformer.transformHotels(hotels);

      // Cache each hotel with 24-hour TTL
      const hotelCacheTTL = this.config.hotelCacheTTL || 86400; // 24 hours default
      transformedHotels.forEach(hotel => {
        // Extract original Amadeus hotel ID from the transformed ID
        const amadeusId = hotel.metadata?.amadeusHotelId || hotel.id.replace('amadeus_', '');
        const cacheKey = `amadeus:hotel:${amadeusId}`;
        this.cache.set(cacheKey, hotel, hotelCacheTTL);
      });

      // Combine cached and newly fetched hotels
      const allHotels = [...cachedHotels, ...transformedHotels];

      console.log('[AmadeusService] Batch hotel details completed', {
        totalReturned: allHotels.length,
        fromCache: cachedHotels.length,
        fromAPI: transformedHotels.length
      });

      return allHotels;

    } catch (error) {
      // If error is already formatted, rethrow
      if (error && typeof error === 'object' && error.error && error.success === false) {
        throw error;
      }

      // Otherwise, wrap in standard error format
      throw {
        success: false,
        error: {
          code: 'BATCH_RETRIEVAL_FAILED',
          message: `Failed to retrieve details for hotels: ${uncachedIds.join(', ')}`,
          details: error.message || String(error)
        }
      };
    }
  }

  /**
   * Build cache key for search results
   * @param {string} searchType - Type of search (city, geocode)
   * @param {Object} params - Search parameters
   * @returns {string} Cache key
   */
  buildCacheKey(searchType, params) {
    // Create a stable string representation of params
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => {
        const value = params[key];
        if (Array.isArray(value)) {
          return `${key}:${value.sort().join(',')}`;
        }
        return `${key}:${value}`;
      })
      .join('|');

    return `amadeus:search:${searchType}:${sortedParams}`;
  }
}

module.exports = AmadeusService;
