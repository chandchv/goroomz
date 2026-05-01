/**
 * Amadeus API Routes
 * 
 * Provides endpoints for Amadeus integration monitoring and health checks.
 */

const express = require('express');
const router = express.Router();
const AmadeusService = require('../services/amadeus/AmadeusService');
const { getConfig } = require('../services/amadeus/config');
const { protect, authorize } = require('../middleware/auth');

// Initialize Amadeus service (singleton pattern)
let amadeusService = null;

/**
 * Get or create Amadeus service instance
 * @returns {AmadeusService|null}
 */
function getAmadeusService() {
  if (!amadeusService) {
    try {
      const config = getConfig();
      if (!config.isEnabled()) {
        return null;
      }
      amadeusService = new AmadeusService();
    } catch (error) {
      console.error('[AmadeusRoutes] Failed to initialize Amadeus service:', error.message);
      return null;
    }
  }
  return amadeusService;
}

/**
 * Reset service instance (for testing)
 */
function resetService() {
  amadeusService = null;
}

/**
 * Set service instance (for testing)
 */
function setService(service) {
  amadeusService = service;
}

/**
 * GET /api/amadeus/metrics
 * Get comprehensive metrics about Amadeus API usage
 * 
 * @access Private - Requires authentication (admin, superuser, or internal_staff)
 */
router.get('/metrics', protect, authorize('admin', 'superuser', 'internal_staff'), (req, res) => {
  try {
    const service = getAmadeusService();
    
    if (!service) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Amadeus integration is not enabled or not configured'
        }
      });
    }

    const stats = service.getRequestStats();
    const config = getConfig();

    res.json({
      success: true,
      data: {
        metrics: stats,
        configuration: config.getSummary(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AmadeusRoutes] Error retrieving metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve Amadeus metrics',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/amadeus/health
 * Get health status of Amadeus integration
 */
router.get('/health', (req, res) => {
  try {
    const service = getAmadeusService();
    
    if (!service) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        message: 'Amadeus integration is not enabled or not configured',
        timestamp: new Date().toISOString()
      });
    }

    const health = service.getHealthStatus();

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health
    });

  } catch (error) {
    console.error('[AmadeusRoutes] Error checking health:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to check Amadeus health',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/amadeus/requests
 * Get recent request log entries
 * 
 * @access Private - Requires authentication (admin, superuser, or internal_staff)
 */
router.get('/requests', protect, authorize('admin', 'superuser', 'internal_staff'), (req, res) => {
  try {
    const service = getAmadeusService();
    
    if (!service) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Amadeus integration is not enabled or not configured'
        }
      });
    }

    // Get limit from query parameter (default 50, max 500)
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);

    const requests = service.getRecentRequests(limit);

    res.json({
      success: true,
      data: {
        requests,
        count: requests.length,
        limit,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AmadeusRoutes] Error retrieving requests:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REQUESTS_ERROR',
        message: 'Failed to retrieve request log',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/amadeus/clear-log
 * Clear request log and reset counters
 * 
 * @access Private - Requires authentication (admin or superuser only)
 */
router.post('/clear-log', protect, authorize('admin', 'superuser'), (req, res) => {
  try {
    const service = getAmadeusService();
    
    if (!service) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Amadeus integration is not enabled or not configured'
        }
      });
    }

    service.clearRequestLog();

    res.json({
      success: true,
      message: 'Request log cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AmadeusRoutes] Error clearing log:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_LOG_ERROR',
        message: 'Failed to clear request log',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/amadeus/config
 * Get Amadeus configuration summary (without sensitive data)
 * 
 * @access Private - Requires authentication (admin, superuser, or internal_staff)
 */
router.get('/config', protect, authorize('admin', 'superuser', 'internal_staff'), (req, res) => {
  try {
    const config = getConfig();
    const summary = config.getSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AmadeusRoutes] Error retrieving config:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_ERROR',
        message: 'Failed to retrieve configuration',
        details: error.message
      }
    });
  }
});

module.exports = router;
module.exports.resetService = resetService;
module.exports.setService = setService;
