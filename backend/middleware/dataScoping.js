const { Op } = require('sequelize');
const AuditLog = require('../models/AuditLog');
const alertService = require('../services/alertService');

/**
 * Data Scoping Middleware
 * 
 * Automatically scopes database queries based on user type and permissions.
 * Attaches scoping filters to req.dataScope for use in route handlers.
 * 
 * User Types:
 * - property_owner: Can only access their own properties
 * - platform_staff: Access based on role (superuser/admin = all, regional_manager = territory, agent = assigned)
 * - property_staff: Can only access their assigned property
 * - external_user: No internal management access
 */

// Track bypass attempts per user for alerting
const bypassAttempts = new Map();
const BYPASS_ATTEMPT_THRESHOLD = 3; // Number of attempts before alerting
const BYPASS_ATTEMPT_WINDOW = 3600000; // 1 hour in milliseconds

/**
 * Middleware that automatically scopes database queries based on user type
 * Attaches scoping filters to req.dataScope for use in route handlers
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.applyScopingMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for data scoping'
      });
    }

    const userType = req.user.getUserType();
    const scope = {
      userType,
      propertyIds: [],
      canBypassScoping: false
    };

    // Superusers can bypass scoping
    if (req.user.internalRole === 'superuser') {
      scope.canBypassScoping = true;
      req.dataScope = scope;
      return next();
    }

    // Platform admins can also bypass scoping
    if (req.user.internalRole === 'platform_admin') {
      scope.canBypassScoping = true;
      req.dataScope = scope;
      return next();
    }

    // Get accessible property IDs for all other users
    scope.propertyIds = await req.user.getAccessiblePropertyIds();

    // Attach scope to request
    req.dataScope = scope;
    next();
  } catch (error) {
    console.error('Data scoping middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying data scoping'
    });
  }
};

/**
 * Helper function to apply scoping to Sequelize queries
 * Merges data scoping filters with existing WHERE clauses
 * 
 * @param {Object} dataScope - The data scope object from req.dataScope
 * @param {Object} baseWhere - Existing WHERE clause to merge with
 * @param {string} propertyIdField - The field name for property ID (default: 'propertyId')
 * @returns {Object} Merged WHERE clause with scoping applied
 * 
 * @example
 * // In a route handler:
 * const scopedWhere = applyScopeToWhere(req.dataScope, { status: 'active' }, 'roomId');
 * const rooms = await Room.findAll({ where: scopedWhere });
 */
exports.applyScopeToWhere = (dataScope, baseWhere = {}, propertyIdField = 'propertyId') => {
  // If can bypass, return base where unchanged
  if (dataScope.canBypassScoping) {
    return baseWhere;
  }

  // If no accessible properties, return impossible condition
  if (!dataScope.propertyIds || dataScope.propertyIds.length === 0) {
    return {
      ...baseWhere,
      [propertyIdField]: null // Will match nothing
    };
  }

  // If only one property, use direct equality for better performance
  if (dataScope.propertyIds.length === 1) {
    return {
      ...baseWhere,
      [propertyIdField]: dataScope.propertyIds[0]
    };
  }

  // Add property scoping with IN operator for multiple properties
  return {
    ...baseWhere,
    [propertyIdField]: {
      [Op.in]: dataScope.propertyIds
    }
  };
};

/**
 * Validate that a query doesn't attempt to bypass scoping
 * Checks for suspicious patterns that might indicate bypass attempts
 * 
 * @param {Object} req - Express request object
 * @param {Object} queryParams - Query parameters to validate
 * @param {string} resourceType - Type of resource being queried
 * @returns {Object} Validation result { isValid: boolean, reason: string }
 */
exports.validateScopingCompliance = async (req, queryParams = {}, resourceType = 'unknown') => {
  const dataScope = req.dataScope;
  
  // Superusers can bypass - no validation needed
  if (dataScope.canBypassScoping) {
    return { isValid: true };
  }

  const suspiciousPatterns = [];

  // Check for attempts to query all properties
  if (queryParams.propertyId === null || queryParams.propertyId === undefined) {
    // This is only suspicious if the user has limited scope
    if (dataScope.propertyIds && dataScope.propertyIds.length > 0) {
      suspiciousPatterns.push('Attempted to query without property filter');
    }
  }

  // Check for attempts to query properties outside scope
  if (queryParams.propertyId) {
    const requestedPropertyIds = Array.isArray(queryParams.propertyId) 
      ? queryParams.propertyId 
      : [queryParams.propertyId];
    
    const unauthorizedProperties = requestedPropertyIds.filter(
      id => !dataScope.propertyIds.includes(id)
    );

    if (unauthorizedProperties.length > 0) {
      suspiciousPatterns.push(
        `Attempted to access unauthorized properties: ${unauthorizedProperties.join(', ')}`
      );
    }
  }

  // Check for SQL injection patterns in property ID
  if (queryParams.propertyId && typeof queryParams.propertyId === 'string') {
    const sqlInjectionPatterns = [
      /(\bOR\b|\bAND\b).*=/i,
      /--/,
      /;.*DROP/i,
      /UNION.*SELECT/i,
      /'.*OR.*'/i
    ];

    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(queryParams.propertyId)) {
        suspiciousPatterns.push('SQL injection pattern detected in property ID');
        break;
      }
    }
  }

  // Check for attempts to use raw queries or bypass ORM
  if (queryParams.raw === true || queryParams.raw === 'true') {
    suspiciousPatterns.push('Attempted to use raw query mode');
  }

  // If suspicious patterns detected, log and handle
  if (suspiciousPatterns.length > 0) {
    await logBypassAttempt(req, resourceType, suspiciousPatterns);
    return {
      isValid: false,
      reason: suspiciousPatterns.join('; ')
    };
  }

  return { isValid: true };
};

/**
 * Log a scoping bypass attempt
 * Creates audit log entry and tracks repeated attempts
 * 
 * @param {Object} req - Express request object
 * @param {string} resourceType - Type of resource being accessed
 * @param {Array} suspiciousPatterns - List of detected suspicious patterns
 */
async function logBypassAttempt(req, resourceType, suspiciousPatterns) {
  try {
    const userId = req.user?.id;
    const userType = req.user?.getUserType();
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Log to console for immediate visibility
    console.warn('⚠️  SCOPING BYPASS ATTEMPT DETECTED', {
      userId,
      userType,
      resourceType,
      patterns: suspiciousPatterns,
      ipAddress,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Create audit log entry
    await AuditLog.create({
      userId,
      action: 'scoping_bypass_attempt',
      resourceType,
      resourceId: null,
      changes: {
        suspiciousPatterns,
        queryParams: req.query,
        bodyParams: req.body,
        path: req.path,
        method: req.method
      },
      ipAddress,
      userAgent,
      isCritical: true
    });

    // Track repeated attempts for alerting
    await trackBypassAttempts(userId, userType, resourceType, suspiciousPatterns);

  } catch (error) {
    console.error('Error logging bypass attempt:', error);
    // Don't throw - we don't want logging errors to break the request
  }
}

/**
 * Track bypass attempts and generate alerts for repeated attempts
 * 
 * @param {string} userId - User ID attempting bypass
 * @param {string} userType - Type of user
 * @param {string} resourceType - Resource being accessed
 * @param {Array} patterns - Suspicious patterns detected
 */
async function trackBypassAttempts(userId, userType, resourceType, patterns) {
  try {
    const now = Date.now();
    
    // Get or initialize user's attempt history
    if (!bypassAttempts.has(userId)) {
      bypassAttempts.set(userId, []);
    }
    
    const userAttempts = bypassAttempts.get(userId);
    
    // Add current attempt
    userAttempts.push({
      timestamp: now,
      resourceType,
      patterns
    });
    
    // Clean up old attempts outside the window
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt.timestamp < BYPASS_ATTEMPT_WINDOW
    );
    bypassAttempts.set(userId, recentAttempts);
    
    // Check if threshold exceeded
    if (recentAttempts.length >= BYPASS_ATTEMPT_THRESHOLD) {
      await generateBypassAlert(userId, userType, recentAttempts);
      
      // Clear attempts after alerting to avoid duplicate alerts
      bypassAttempts.set(userId, []);
    }
  } catch (error) {
    console.error('Error tracking bypass attempts:', error);
  }
}

/**
 * Generate alert for repeated bypass attempts
 * 
 * @param {string} userId - User ID with repeated attempts
 * @param {string} userType - Type of user
 * @param {Array} attempts - List of recent attempts
 */
async function generateBypassAlert(userId, userType, attempts) {
  try {
    const User = require('../models/User');
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error('User not found for bypass alert:', userId);
      return;
    }

    const resourceTypes = [...new Set(attempts.map(a => a.resourceType))];
    const allPatterns = attempts.flatMap(a => a.patterns);
    
    await alertService.generateSystemErrorAlerts({
      errorType: 'security_scoping_bypass_attempt',
      errorMessage: `User ${user.name} (${user.email}) has made ${attempts.length} scoping bypass attempts in the last hour`,
      affectedProperties: [],
      severity: 'critical',
      metadata: {
        userId,
        userName: user.name,
        userEmail: user.email,
        userType,
        attemptCount: attempts.length,
        resourceTypes,
        suspiciousPatterns: allPatterns,
        timeWindow: '1 hour'
      }
    });

    console.error('🚨 CRITICAL: Repeated scoping bypass attempts detected', {
      userId,
      userName: user.name,
      userEmail: user.email,
      attemptCount: attempts.length,
      resourceTypes
    });

  } catch (error) {
    console.error('Error generating bypass alert:', error);
  }
}

/**
 * Middleware to validate query parameters for scoping compliance
 * Should be used after applyScopingMiddleware
 * 
 * @param {string} resourceType - Type of resource being accessed
 */
exports.validateQueryScoping = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Skip validation for superusers
      if (req.dataScope?.canBypassScoping) {
        return next();
      }

      // Validate query parameters
      const validation = await exports.validateScopingCompliance(
        req,
        { ...req.query, ...req.params },
        resourceType
      );

      if (!validation.isValid) {
        console.warn('Query validation failed:', validation.reason);
        return res.status(403).json({
          success: false,
          message: 'Access denied: Invalid query parameters',
          error: 'SCOPING_VIOLATION'
        });
      }

      next();
    } catch (error) {
      console.error('Error in query scoping validation:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating query parameters'
      });
    }
  };
};

module.exports = exports;
