/**
 * Amadeus Authentication Manager
 * 
 * Manages OAuth2 authentication with Amadeus API.
 * Handles token acquisition, caching, and automatic refresh.
 */

const axios = require('axios');
const { getConfig } = require('./config');
const { CacheManager } = require('../../utils/cacheManager');

/**
 * Amadeus Auth Manager class
 */
class AmadeusAuthManager {
  constructor(config = null, cache = null) {
    this.config = config || getConfig();
    this.cache = cache || new CacheManager({ stdTTL: this.config.tokenCacheTTL });
    this.tokenCacheKey = 'amadeus:token';
    this.tokenExpiryKey = 'amadeus:token:expiry';
  }

  /**
   * Get a valid access token (from cache or by requesting new one)
   * @returns {Promise<string>} Access token
   * @throws {Error} If authentication fails
   */
  async getAccessToken() {
    // Check if we have a valid cached token
    const cachedToken = this.cache.get(this.tokenCacheKey);
    
    if (cachedToken && !this.isTokenExpired()) {
      return cachedToken;
    }

    // Request new token
    const tokenData = await this.requestAccessToken();
    
    // Cache the token with expiration
    this.cacheToken(tokenData.access_token, tokenData.expires_in);
    
    return tokenData.access_token;
  }

  /**
   * Request a new access token from Amadeus
   * @returns {Promise<{access_token: string, expires_in: number}>}
   * @throws {Error} If authentication fails
   */
  async requestAccessToken() {
    const tokenUrl = this.config.getTokenUrl();
    
    try {
      const response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid token response from Amadeus API');
      }

      // Log successful authentication (without exposing token)
      console.log('[AmadeusAuth] Successfully obtained access token', {
        timestamp: new Date().toISOString(),
        expiresIn: response.data.expires_in
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 1799 // Default to ~30 minutes
      };
    } catch (error) {
      // Log authentication error with context
      const errorContext = {
        timestamp: new Date().toISOString(),
        endpoint: tokenUrl,
        statusCode: error.response?.status,
        message: error.message
      };

      console.error('[AmadeusAuth] Authentication failed', errorContext);

      // Throw meaningful error
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid Amadeus API credentials');
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Authentication request timed out');
      }

      if (error.response?.status >= 500) {
        throw new Error('Amadeus authentication service unavailable');
      }

      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Cache token with expiration tracking
   * @param {string} token - Access token
   * @param {number} expiresIn - Token lifetime in seconds
   */
  cacheToken(token, expiresIn) {
    // Cache token with TTL slightly less than actual expiry (buffer of 5 minutes)
    const cacheTTL = Math.max(expiresIn - 300, 60); // At least 1 minute
    
    this.cache.set(this.tokenCacheKey, token, cacheTTL);
    
    // Store expiry timestamp
    const expiryTime = Date.now() + (expiresIn * 1000);
    this.cache.set(this.tokenExpiryKey, expiryTime, expiresIn);
  }

  /**
   * Check if current token is expired
   * @returns {boolean}
   */
  isTokenExpired() {
    const expiryTime = this.cache.get(this.tokenExpiryKey);
    
    if (!expiryTime) {
      return true;
    }

    // Consider token expired if less than 5 minutes remaining
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() >= (expiryTime - bufferTime);
  }

  /**
   * Clear cached token (force refresh on next request)
   */
  clearToken() {
    this.cache.delete(this.tokenCacheKey);
    this.cache.delete(this.tokenExpiryKey);
    
    console.log('[AmadeusAuth] Token cache cleared', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get token cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      hasToken: this.cache.has(this.tokenCacheKey),
      isExpired: this.isTokenExpired(),
      expiryTime: this.cache.get(this.tokenExpiryKey),
      cacheStats: this.cache.getStats()
    };
  }
}

module.exports = AmadeusAuthManager;
