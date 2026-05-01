/**
 * Shared Authentication Middleware for Internal Management System
 * 
 * This module provides reusable authentication and authorization utilities
 * for the internal management API routes.
 */

const jwt = require('jsonwebtoken');
const User = require('../../models/User');

/**
 * Array of roles allowed to access the internal management system
 */
const INTERNAL_ROLES = ['admin', 'category_owner', 'superuser', 'owner'];

/**
 * Extract JWT token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - The extracted token or null if not found
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} - The decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Generate a JWT token for a user
 * @param {string} id - The user ID to encode in the token
 * @returns {string} - The generated JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Get permissions object based on user role
 * @param {string} role - The user's role
 * @returns {Object} - Object containing permission flags
 */
const getPermissionsForRole = (role) => {
  const permissions = {
    canOnboardProperties: false,
    canApproveOnboardings: false,
    canManageAgents: false,
    canAccessAllProperties: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canManageCommissions: false,
    canManageTerritories: false,
    canManageTickets: false,
    canBroadcastAnnouncements: false
  };

  switch (role) {
    case 'superuser':
    case 'admin':
      return {
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canManageSystemSettings: true,
        canViewAuditLogs: true,
        canManageCommissions: true,
        canManageTerritories: true,
        canManageTickets: true,
        canBroadcastAnnouncements: true
      };
    case 'platform_admin':
      return {
        ...permissions,
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canViewAuditLogs: true,
        canManageTickets: true
      };
    case 'operations_manager':
      return {
        ...permissions,
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canViewAuditLogs: true
      };
    case 'regional_manager':
      return {
        ...permissions,
        canOnboardProperties: true,
        canManageAgents: true
      };
    case 'agent':
      return {
        ...permissions,
        canOnboardProperties: true
      };
    default:
      return permissions;
  }
};

/**
 * Middleware to authenticate user from JWT token
 * Extracts token, verifies it, and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Middleware factory to require specific roles for access
 * @param {string[]} roles - Array of allowed roles (defaults to INTERNAL_ROLES)
 * @returns {Function} - Express middleware function
 */
const requireRoles = (roles = INTERNAL_ROLES) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    next();
  };
};

module.exports = {
  extractToken,
  verifyToken,
  generateToken,
  authenticateUser,
  requireRoles,
  INTERNAL_ROLES,
  getPermissionsForRole
};
