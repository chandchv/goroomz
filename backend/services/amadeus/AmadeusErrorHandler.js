/**
 * Amadeus Error Handler
 * 
 * Handles errors from Amadeus API with categorization, retry logic, and user-friendly messages.
 * Implements exponential backoff for rate limiting and provides comprehensive error logging.
 */

const logger = console; // Replace with your logging library

class AmadeusErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Handle API errors with appropriate retry and fallback logic
   * @param {Error} error - The error object
   * @param {Object} context - Context information about the request
   * @returns {Promise<Object>} Error response or retry result
   */
  async handleApiError(error, context = {}) {
    // Log error with full context
    this.logError(error, context);

    // Categorize and handle error
    if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(error, context);
    }

    if (this.isAuthError(error)) {
      return this.handleAuthError(error, context);
    }

    if (this.isServerError(error)) {
      return this.handleServerError(error, context);
    }

    if (this.isTimeoutError(error)) {
      return this.handleTimeoutError(error, context);
    }

    // Client error or unknown - return formatted error
    return this.formatErrorResponse(error);
  }

  /**
   * Check if error is a rate limit error (429)
   * @param {Error} error - The error object
   * @returns {boolean}
   */
  isRateLimitError(error) {
    return error.response?.status === 429;
  }

  /**
   * Check if error is an authentication error (401, 403)
   * @param {Error} error - The error object
   * @returns {boolean}
   */
  isAuthError(error) {
    const status = error.response?.status;
    return status === 401 || status === 403;
  }

  /**
   * Check if error is a server error (500, 502, 503, 504)
   * @param {Error} error - The error object
   * @returns {boolean}
   */
  isServerError(error) {
    const status = error.response?.status;
    return status >= 500 && status < 600;
  }

  /**
   * Check if error is a timeout error
   * @param {Error} error - The error object
   * @returns {boolean}
   */
  isTimeoutError(error) {
    return error.code === 'ECONNABORTED' || 
           error.code === 'ETIMEDOUT' ||
           error.message?.includes('timeout');
  }

  /**
   * Handle rate limit errors with exponential backoff
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Retry result or error response
   */
  async handleRateLimitError(error, context) {
    const retryAfter = this.getRetryAfter(error);
    const retryCount = context.retryCount || 0;

    if (retryCount >= this.maxRetries) {
      logger.error('Max retries reached for rate limit error');
      return this.formatErrorResponse(error, 'RATE_LIMIT_EXCEEDED');
    }

    const delay = this.calculateBackoffDelay(retryCount, retryAfter);
    
    logger.warn(`Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

    await this.sleep(delay);

    if (context.retryFunction) {
      return context.retryFunction({ ...context, retryCount: retryCount + 1 });
    }

    return this.formatErrorResponse(error, 'RATE_LIMIT_RETRY_FAILED');
  }

  /**
   * Handle authentication errors
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Retry result or error response
   */
  async handleAuthError(error, context) {
    logger.warn('Authentication error detected');

    // Clear cached token if auth manager is available
    if (context.authManager) {
      context.authManager.clearToken();
    }

    // Retry once if not already retried
    if (!context.isAuthRetry && context.retryFunction) {
      logger.info('Retrying request after clearing auth token');
      return context.retryFunction({ ...context, isAuthRetry: true });
    }

    // If retry also failed, return error
    return this.formatErrorResponse(error, 'AUTH_FAILED');
  }

  /**
   * Handle server errors with retry logic
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Retry result or error response
   */
  async handleServerError(error, context) {
    const retryCount = context.retryCount || 0;

    if (retryCount >= this.maxRetries) {
      logger.error('Max retries reached for server error');
      return this.formatErrorResponse(error, 'SERVER_ERROR');
    }

    const delay = this.calculateBackoffDelay(retryCount);
    
    logger.warn(`Server error. Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

    await this.sleep(delay);

    if (context.retryFunction) {
      return context.retryFunction({ ...context, retryCount: retryCount + 1 });
    }

    return this.formatErrorResponse(error, 'SERVER_ERROR_RETRY_FAILED');
  }

  /**
   * Handle timeout errors with single retry
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   * @returns {Promise<Object>} Retry result or error response
   */
  async handleTimeoutError(error, context) {
    // Retry once for timeout errors
    if (!context.isTimeoutRetry && context.retryFunction) {
      logger.warn('Timeout error. Retrying once');
      return context.retryFunction({ ...context, isTimeoutRetry: true });
    }

    return this.formatErrorResponse(error, 'TIMEOUT');
  }

  /**
   * Calculate exponential backoff delay
   * @param {number} retryCount - Current retry attempt
   * @param {number} minDelay - Minimum delay in seconds (optional)
   * @returns {number} Delay in milliseconds
   */
  calculateBackoffDelay(retryCount, minDelay = null) {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    
    // If minDelay is provided (from Retry-After header), use the larger value
    if (minDelay !== null) {
      const minDelayMs = minDelay * 1000;
      // Cap the final delay at 60 seconds
      return Math.min(Math.max(exponentialDelay, minDelayMs), 60000);
    }

    // Cap at 60 seconds
    return Math.min(exponentialDelay, 60000);
  }

  /**
   * Get retry-after value from error response
   * @param {Error} error - The error object
   * @returns {number|null} Retry-after value in seconds
   */
  getRetryAfter(error) {
    const retryAfter = error.response?.headers['retry-after'];
    
    if (!retryAfter) {
      return null;
    }

    // Retry-After can be in seconds or HTTP date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // If it's a date, calculate seconds until that date
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      const now = new Date();
      return Math.max(0, Math.floor((retryDate - now) / 1000));
    }

    return null;
  }

  /**
   * Format error response for API consumers
   * @param {Error} error - The error object
   * @param {string} errorCode - Custom error code
   * @returns {Object} Formatted error response
   */
  formatErrorResponse(error, errorCode = null) {
    const statusCode = error.response?.status;
    const code = errorCode || this.getErrorCode(statusCode);
    const message = this.getUserFriendlyMessage(error);

    return {
      success: false,
      error: {
        code,
        message,
        statusCode,
        details: error.response?.data
      }
    };
  }

  /**
   * Get error code from status code
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error code
   */
  getErrorCode(statusCode) {
    const codes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };

    return codes[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  getUserFriendlyMessage(error) {
    const statusCode = error.response?.status;

    const messages = {
      400: 'Invalid search parameters provided',
      401: 'Authentication failed with hotel search service',
      403: 'Access denied to hotel search service',
      404: 'Hotel not found',
      429: 'Too many requests. Please try again later',
      500: 'Hotel search service is temporarily unavailable',
      502: 'Hotel search service is experiencing issues',
      503: 'Hotel search service is under maintenance',
      504: 'Hotel search service request timed out'
    };

    return messages[statusCode] || 'An error occurred while searching for hotels';
  }

  /**
   * Log error with context
   * @param {Error} error - The error object
   * @param {Object} context - Context information
   */
  logError(error, context) {
    const logData = {
      message: error.message,
      statusCode: error.response?.status,
      endpoint: context.endpoint,
      params: context.params,
      retryCount: context.retryCount || 0,
      timestamp: new Date().toISOString()
    };

    // Log stack trace for server errors
    if (this.isServerError(error) || !error.response) {
      logData.stack = error.stack;
    }

    logger.error('Amadeus API Error', logData);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AmadeusErrorHandler;
