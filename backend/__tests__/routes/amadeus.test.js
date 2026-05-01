/**
 * Unit Tests for Amadeus Monitoring Routes
 * 
 * Tests the monitoring endpoints for Amadeus API integration.
 * Validates: Requirements 6.1, 6.4, 11.1, 11.2, 11.3
 */

const request = require('supertest');
const express = require('express');
const amadeusRoutes = require('../../routes/amadeus');
const AmadeusService = require('../../services/amadeus/AmadeusService');
const { getConfig, resetConfig } = require('../../services/amadeus/config');

// Mock the Amadeus service and config
jest.mock('../../services/amadeus/config');

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  protect: (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    };
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `User role ${req.user?.role} is not authorized`
      });
    }
  }
}));

describe('Amadeus Monitoring Routes', () => {
  let app;
  let mockService;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the service singleton
    amadeusRoutes.resetService();

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/amadeus', amadeusRoutes);

    // Create mock service instance
    mockService = {
      getRequestStats: jest.fn(),
      getHealthStatus: jest.fn(),
      getRecentRequests: jest.fn(),
      clearRequestLog: jest.fn()
    };

    // Create mock config
    mockConfig = {
      isEnabled: jest.fn().mockReturnValue(true),
      getSummary: jest.fn().mockReturnValue({
        enabled: true,
        baseUrl: 'https://test.api.amadeus.com',
        tokenCacheTTL: 1500,
        hotelCacheTTL: 86400,
        searchCacheTTL: 300,
        defaultRadius: 5,
        defaultRadiusUnit: 'KM',
        rateLimitPerSecond: 10,
        hasApiKey: true,
        hasApiSecret: true
      })
    };

    // Mock getConfig to return mock config
    getConfig.mockReturnValue(mockConfig);

    // Set the mock service
    amadeusRoutes.setService(mockService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    amadeusRoutes.resetService();
  });

  describe('GET /api/amadeus/metrics', () => {
    it('should return comprehensive metrics when service is available', async () => {
      // Arrange
      const mockStats = {
        totalRequests: 150,
        requestsLastHour: 25,
        requestsLast24Hours: 120,
        totalErrors: 5,
        errorsLastHour: 1,
        errorRate: '3.33%',
        averageResponseTime: '245ms',
        cacheStats: {
          hits: 80,
          misses: 70,
          hitRate: '53.33%',
          size: 45
        },
        authStats: {
          tokenRefreshCount: 3,
          lastRefresh: '2025-01-10T10:00:00.000Z'
        }
      };

      mockService.getRequestStats.mockReturnValue(mockStats);

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('configuration');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.metrics).toEqual(mockStats);
      expect(response.body.data.configuration).toEqual(mockConfig.getSummary());
      expect(mockService.getRequestStats).toHaveBeenCalledTimes(1);
    });

    it('should return 503 when Amadeus service is not enabled', async () => {
      // Arrange
      amadeusRoutes.resetService();
      mockConfig.isEnabled.mockReturnValue(false);

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(503);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(response.body.error.message).toContain('not enabled');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockService.getRequestStats.mockImplementation(() => {
        throw new Error('Stats retrieval failed');
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('METRICS_ERROR');
      expect(response.body.error.message).toContain('Failed to retrieve');
    });

    it('should include timestamp in response', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 10,
        errorRate: '0%'
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.timestamp).toBeDefined();
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/amadeus/health', () => {
    it('should return healthy status when service is healthy', async () => {
      // Arrange
      const mockHealth = {
        status: 'healthy',
        enabled: true,
        stats: {
          totalRequests: 100,
          errorRate: '2%',
          averageResponseTime: '200ms'
        },
        timestamp: '2025-01-10T10:00:00.000Z'
      };

      mockService.getHealthStatus.mockReturnValue(mockHealth);

      // Act
      const response = await request(app)
        .get('/api/amadeus/health')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.enabled).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(mockService.getHealthStatus).toHaveBeenCalledTimes(1);
    });

    it('should return 503 when service is degraded', async () => {
      // Arrange
      const mockHealth = {
        status: 'degraded',
        enabled: true,
        stats: {
          totalRequests: 100,
          errorRate: '55%',
          averageResponseTime: '1500ms'
        },
        timestamp: '2025-01-10T10:00:00.000Z'
      };

      mockService.getHealthStatus.mockReturnValue(mockHealth);

      // Act
      const response = await request(app)
        .get('/api/amadeus/health')
        .expect(503);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('degraded');
    });

    it('should return 503 when service is not enabled', async () => {
      // Arrange
      amadeusRoutes.resetService();
      mockConfig.isEnabled.mockReturnValue(false);

      // Act
      const response = await request(app)
        .get('/api/amadeus/health')
        .expect(503);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('unavailable');
      expect(response.body.message).toContain('not enabled');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockService.getHealthStatus.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/health')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Failed to check');
    });
  });

  describe('GET /api/amadeus/requests', () => {
    it('should return recent request log entries', async () => {
      // Arrange
      const mockRequests = [
        {
          type: 'request',
          requestId: 'req_123',
          endpoint: '/v1/reference-data/locations/hotels/by-city',
          params: { cityCode: 'PAR' },
          timestamp: '2025-01-10T10:00:00.000Z'
        },
        {
          type: 'response',
          requestId: 'req_123',
          statusCode: 200,
          duration: 245,
          timestamp: '2025-01-10T10:00:01.000Z'
        }
      ];

      mockService.getRecentRequests.mockReturnValue(mockRequests);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toEqual(mockRequests);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.limit).toBe(50); // Default limit
      expect(mockService.getRecentRequests).toHaveBeenCalledWith(50);
    });

    it('should respect custom limit parameter', async () => {
      // Arrange
      mockService.getRecentRequests.mockReturnValue([]);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests?limit=100')
        .expect(200);

      // Assert
      expect(response.body.data.limit).toBe(100);
      expect(mockService.getRecentRequests).toHaveBeenCalledWith(100);
    });

    it('should enforce maximum limit of 500', async () => {
      // Arrange
      mockService.getRecentRequests.mockReturnValue([]);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests?limit=1000')
        .expect(200);

      // Assert
      expect(response.body.data.limit).toBe(500); // Capped at 500
      expect(mockService.getRecentRequests).toHaveBeenCalledWith(500);
    });

    it('should return 503 when service is not enabled', async () => {
      // Arrange
      amadeusRoutes.resetService();
      mockConfig.isEnabled.mockReturnValue(false);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(503);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockService.getRecentRequests.mockImplementation(() => {
        throw new Error('Request log retrieval failed');
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REQUESTS_ERROR');
    });
  });

  describe('POST /api/amadeus/clear-log', () => {
    it('should clear request log successfully', async () => {
      // Arrange
      mockService.clearRequestLog.mockReturnValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/amadeus/clear-log')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleared successfully');
      expect(response.body.timestamp).toBeDefined();
      expect(mockService.clearRequestLog).toHaveBeenCalledTimes(1);
    });

    it('should return 503 when service is not enabled', async () => {
      // Arrange
      amadeusRoutes.resetService();
      mockConfig.isEnabled.mockReturnValue(false);

      // Act
      const response = await request(app)
        .post('/api/amadeus/clear-log')
        .expect(503);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockService.clearRequestLog.mockImplementation(() => {
        throw new Error('Clear log failed');
      });

      // Act
      const response = await request(app)
        .post('/api/amadeus/clear-log')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CLEAR_LOG_ERROR');
    });
  });

  describe('GET /api/amadeus/config', () => {
    it('should return configuration summary', async () => {
      // Act
      const response = await request(app)
        .get('/api/amadeus/config')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConfig.getSummary());
      expect(response.body.data.hasApiKey).toBe(true);
      expect(response.body.data.hasApiSecret).toBe(true);
      expect(response.body.timestamp).toBeDefined();
      expect(mockConfig.getSummary).toHaveBeenCalled();
    });

    it('should not expose sensitive credentials', async () => {
      // Act
      const response = await request(app)
        .get('/api/amadeus/config')
        .expect(200);

      // Assert
      expect(response.body.data).not.toHaveProperty('apiKey');
      expect(response.body.data).not.toHaveProperty('apiSecret');
      expect(response.body.data.hasApiKey).toBe(true); // Only boolean flag
      expect(response.body.data.hasApiSecret).toBe(true); // Only boolean flag
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockConfig.getSummary.mockImplementation(() => {
        throw new Error('Config retrieval failed');
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/config')
        .expect(500);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('Logging Format and Content', () => {
    it('should log requests with proper structure', async () => {
      // Arrange
      const mockRequests = [
        {
          type: 'request',
          requestId: 'req_123',
          endpoint: '/v1/reference-data/locations/hotels/by-city',
          params: { cityCode: 'PAR', radius: 5 },
          timestamp: '2025-01-10T10:00:00.000Z'
        }
      ];

      mockService.getRecentRequests.mockReturnValue(mockRequests);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(200);

      // Assert
      const logEntry = response.body.data.requests[0];
      expect(logEntry).toHaveProperty('type', 'request');
      expect(logEntry).toHaveProperty('requestId');
      expect(logEntry).toHaveProperty('endpoint');
      expect(logEntry).toHaveProperty('params');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should log responses with duration and status code', async () => {
      // Arrange
      const mockRequests = [
        {
          type: 'response',
          requestId: 'req_123',
          statusCode: 200,
          duration: 245,
          timestamp: '2025-01-10T10:00:01.000Z'
        }
      ];

      mockService.getRecentRequests.mockReturnValue(mockRequests);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(200);

      // Assert
      const logEntry = response.body.data.requests[0];
      expect(logEntry).toHaveProperty('type', 'response');
      expect(logEntry).toHaveProperty('statusCode', 200);
      expect(logEntry).toHaveProperty('duration', 245);
      expect(logEntry).toHaveProperty('timestamp');
    });

    it('should log errors with error details', async () => {
      // Arrange
      const mockRequests = [
        {
          type: 'error',
          requestId: 'req_456',
          error: 'Rate limit exceeded',
          statusCode: 429,
          duration: 150,
          timestamp: '2025-01-10T10:05:00.000Z'
        }
      ];

      mockService.getRecentRequests.mockReturnValue(mockRequests);

      // Act
      const response = await request(app)
        .get('/api/amadeus/requests')
        .expect(200);

      // Assert
      const logEntry = response.body.data.requests[0];
      expect(logEntry).toHaveProperty('type', 'error');
      expect(logEntry).toHaveProperty('error');
      expect(logEntry).toHaveProperty('statusCode', 429);
      expect(logEntry).toHaveProperty('duration');
    });
  });

  describe('Metrics Collection', () => {
    it('should track total request count', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 250,
        requestsLastHour: 30,
        requestsLast24Hours: 200,
        totalErrors: 10,
        errorsLastHour: 2,
        errorRate: '4%',
        averageResponseTime: '300ms'
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.metrics.totalRequests).toBe(250);
      expect(response.body.data.metrics.requestsLastHour).toBe(30);
      expect(response.body.data.metrics.requestsLast24Hours).toBe(200);
    });

    it('should track error rates', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 100,
        totalErrors: 15,
        errorsLastHour: 5,
        errorRate: '15%'
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.metrics.totalErrors).toBe(15);
      expect(response.body.data.metrics.errorsLastHour).toBe(5);
      expect(response.body.data.metrics.errorRate).toBe('15%');
    });

    it('should track response times', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 50,
        averageResponseTime: '425ms'
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.metrics.averageResponseTime).toBe('425ms');
    });

    it('should include cache statistics', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 100,
        cacheStats: {
          hits: 60,
          misses: 40,
          hitRate: '60%',
          size: 35
        }
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.metrics.cacheStats).toBeDefined();
      expect(response.body.data.metrics.cacheStats.hits).toBe(60);
      expect(response.body.data.metrics.cacheStats.misses).toBe(40);
      expect(response.body.data.metrics.cacheStats.hitRate).toBe('60%');
    });

    it('should include authentication statistics', async () => {
      // Arrange
      mockService.getRequestStats.mockReturnValue({
        totalRequests: 100,
        authStats: {
          tokenRefreshCount: 5,
          lastRefresh: '2025-01-10T09:30:00.000Z'
        }
      });

      // Act
      const response = await request(app)
        .get('/api/amadeus/metrics')
        .expect(200);

      // Assert
      expect(response.body.data.metrics.authStats).toBeDefined();
      expect(response.body.data.metrics.authStats.tokenRefreshCount).toBe(5);
      expect(response.body.data.metrics.authStats.lastRefresh).toBeDefined();
    });
  });
});
