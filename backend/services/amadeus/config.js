/**
 * Amadeus API Configuration Module
 * 
 * Manages configuration settings for Amadeus Hotel API integration.
 * Validates required credentials and provides configuration access.
 */

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Amadeus API Configuration
 */
class AmadeusConfig {
  constructor() {
    // API Credentials
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    
    // API URLs
    this.baseUrl = process.env.AMADEUS_API_BASE_URL || 'https://test.api.amadeus.com';
    this.tokenEndpoint = '/v1/security/oauth2/token';
    this.hotelListEndpoint = '/v1/reference-data/locations/hotels/by-city';
    this.hotelSearchEndpoint = '/v1/reference-data/locations/hotels/by-geocode';
    
    // Cache TTL (Time To Live) in seconds
    this.tokenCacheTTL = process.env.AMADEUS_TOKEN_CACHE_TTL ? parseInt(process.env.AMADEUS_TOKEN_CACHE_TTL) : 1500; // 25 minutes
    this.hotelCacheTTL = process.env.AMADEUS_HOTEL_CACHE_TTL ? parseInt(process.env.AMADEUS_HOTEL_CACHE_TTL) : 86400; // 24 hours
    this.searchCacheTTL = process.env.AMADEUS_SEARCH_CACHE_TTL ? parseInt(process.env.AMADEUS_SEARCH_CACHE_TTL) : 300; // 5 minutes
    
    // Feature flags
    this.enabled = process.env.AMADEUS_ENABLED === 'true';
    
    // Search defaults
    this.defaultRadius = process.env.AMADEUS_DEFAULT_RADIUS ? parseInt(process.env.AMADEUS_DEFAULT_RADIUS) : 5;
    this.defaultRadiusUnit = process.env.AMADEUS_DEFAULT_RADIUS_UNIT || 'KM';
    
    // Rate limiting
    this.rateLimitPerSecond = process.env.AMADEUS_RATE_LIMIT_PER_SECOND ? parseInt(process.env.AMADEUS_RATE_LIMIT_PER_SECOND) : 10;
    
    // Validate configuration on initialization
    this.validate();
  }

  /**
   * Validate required configuration values
   * @throws {Error} If required configuration is missing or invalid
   */
  validate() {
    const errors = [];

    // Check required credentials
    if (!this.apiKey) {
      errors.push('AMADEUS_API_KEY is required');
    }

    if (!this.apiSecret) {
      errors.push('AMADEUS_API_SECRET is required');
    }

    // Validate base URL format
    if (this.baseUrl && !this.baseUrl.startsWith('http')) {
      errors.push('AMADEUS_API_BASE_URL must be a valid URL starting with http or https');
    }

    // Validate TTL values are positive
    if (isNaN(this.tokenCacheTTL) || this.tokenCacheTTL <= 0) {
      errors.push('AMADEUS_TOKEN_CACHE_TTL must be a positive number');
    }

    if (isNaN(this.hotelCacheTTL) || this.hotelCacheTTL <= 0) {
      errors.push('AMADEUS_HOTEL_CACHE_TTL must be a positive number');
    }

    if (isNaN(this.searchCacheTTL) || this.searchCacheTTL <= 0) {
      errors.push('AMADEUS_SEARCH_CACHE_TTL must be a positive number');
    }

    // Validate radius values
    if (isNaN(this.defaultRadius) || this.defaultRadius <= 0) {
      errors.push('AMADEUS_DEFAULT_RADIUS must be a positive number');
    }

    if (!['KM', 'MILE'].includes(this.defaultRadiusUnit)) {
      errors.push('AMADEUS_DEFAULT_RADIUS_UNIT must be either KM or MILE');
    }

    // Validate rate limit
    if (isNaN(this.rateLimitPerSecond) || this.rateLimitPerSecond <= 0) {
      errors.push('AMADEUS_RATE_LIMIT_PER_SECOND must be a positive number');
    }

    if (errors.length > 0) {
      throw new Error(`Amadeus configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Check if Amadeus integration is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get full token endpoint URL
   * @returns {string}
   */
  getTokenUrl() {
    return `${this.baseUrl}${this.tokenEndpoint}`;
  }

  /**
   * Get full hotel list endpoint URL
   * @returns {string}
   */
  getHotelListUrl() {
    return `${this.baseUrl}${this.hotelListEndpoint}`;
  }

  /**
   * Get full hotel search endpoint URL
   * @returns {string}
   */
  getHotelSearchUrl() {
    return `${this.baseUrl}${this.hotelSearchEndpoint}`;
  }

  /**
   * Get configuration summary (without sensitive data)
   * @returns {Object}
   */
  getSummary() {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      tokenCacheTTL: this.tokenCacheTTL,
      hotelCacheTTL: this.hotelCacheTTL,
      searchCacheTTL: this.searchCacheTTL,
      defaultRadius: this.defaultRadius,
      defaultRadiusUnit: this.defaultRadiusUnit,
      rateLimitPerSecond: this.rateLimitPerSecond,
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret
    };
  }
}

// Export singleton instance
let configInstance = null;

/**
 * Get Amadeus configuration instance
 * @returns {AmadeusConfig}
 */
function getConfig() {
  if (!configInstance) {
    configInstance = new AmadeusConfig();
  }
  return configInstance;
}

/**
 * Reset configuration instance (useful for testing)
 */
function resetConfig() {
  configInstance = null;
}

module.exports = {
  AmadeusConfig,
  getConfig,
  resetConfig
};
