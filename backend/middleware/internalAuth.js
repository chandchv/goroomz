const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Internal Management Authentication Middleware
 * Verifies JWT tokens for internal management system users (staff, property owners, admins)
 * Requirements: 32.1, 33.1, 3.4, 3.5, 6.2, 6.3, 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Middleware Chaining Pattern:
 * Routes should chain middleware in this order:
 * 1. protectInternal - Verifies authentication
 * 2. Role-specific middleware (requirePlatformRole, requirePropertyOwner, requirePropertyStaff)
 * 3. Data scoping middleware (applyScopingMiddleware from dataScoping.js)
 * 
 * Example usage:
 * router.get('/platform/properties', 
 *   protectInternal, 
 *   requirePlatformRole('superuser', 'platform_admin'),
 *   applyScopingMiddleware,
 *   controller.getAllProperties
 * );
 */

/**
 * Protect internal management routes - require authentication
 * Verifies JWT token and ensures user has appropriate role for internal management
 */
exports.protectInternal = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // If not in headers, check for cookie
    else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or no longer exists.'
        });
      }

      // Check if user has internal management access
      // Internal management is for: admin, owner, category_owner, staff with staffRole, or internal role users
      const hasInternalAccess = 
        user.role === 'admin' || 
        user.role === 'owner' || 
        user.role === 'category_owner' ||
        user.staffRole !== null ||
        user.internalRole !== null;

      if (!hasInternalAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This endpoint is for internal management only.'
        });
      }

      // Check if user is active (for internal role users)
      if (user.internalRole && !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Your account has been deactivated.'
        });
      }

      // Update last login time for internal role users
      if (user.internalRole) {
        user.lastLoginAt = new Date();
        await user.save({ fields: ['lastLoginAt'] });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or has expired.'
      });
    }
  } catch (error) {
    console.error('Internal auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

/**
 * Role-based authorization for internal management
 * Checks if user has one of the specified roles
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'owner', 'manager')
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Staff role-based authorization
 * Checks if user has one of the specified staff roles
 * @param {...string} staffRoles - Allowed staff roles (e.g., 'front_desk', 'housekeeping', 'maintenance', 'manager')
 */
exports.authorizeStaffRoles = (...staffRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Admins and owners can access all staff functions
    if (req.user.role === 'admin' || req.user.role === 'owner') {
      return next();
    }

    // Check staff role
    if (!req.user.staffRole || !staffRoles.includes(req.user.staffRole)) {
      return res.status(403).json({
        success: false,
        message: `Staff role '${req.user.staffRole || 'none'}' is not authorized. Required roles: ${staffRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Permission-based authorization
 * Checks if user has specific permissions
 * @param {...string} permissions - Required permissions (e.g., 'canCheckIn', 'canManageRooms')
 */
exports.requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Admins have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has permissions object
    if (!req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: 'User does not have permission configuration.'
      });
    }

    // Check if user has all required permissions
    const missingPermissions = permissions.filter(
      permission => !req.user.permissions[permission]
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Missing required permissions: ${missingPermissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Superuser authorization (admin or internal superuser)
 * For managing property owners and system-wide settings
 */
exports.requireSuperuser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Allow admin role (property owners), superuser, and platform_admin roles
  const isSuperuser = 
    req.user.role === 'admin' || 
    req.user.internalRole === 'superuser' || 
    req.user.internalRole === 'platform_admin';
  
  if (!isSuperuser) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Superuser privileges required.'
    });
  }

  next();
};

// Alias for backward compatibility
exports.internalAuth = exports.protectInternal;

/**
 * Check specific permission
 * Wrapper around requirePermissions for single permission check
 * @param {string} permission - Required permission (e.g., 'canCheckIn', 'canRecordPayments')
 */
exports.checkPermission = (permission) => {
  return exports.requirePermissions(permission);
};

/**
 * Internal role-based authorization
 * Checks if user has one of the specified internal roles
 * @param {...string} roles - Allowed internal roles (e.g., 'agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser')
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
exports.authorizeInternalRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user has an internal role
    if (!req.user.internalRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint requires an internal role.'
      });
    }

    // Check if user's internal role is in the allowed roles
    if (!roles.includes(req.user.internalRole)) {
      return res.status(403).json({
        success: false,
        message: `Internal role '${req.user.internalRole}' is not authorized to access this route. Required roles: ${roles.join(', ')}`
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your account has been deactivated.'
      });
    }

    next();
  };
};

/**
 * Internal permission-based authorization
 * Checks if user has specific internal permissions
 * @param {...string} permissions - Required internal permissions (e.g., 'canOnboardProperties', 'canApproveOnboardings')
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
exports.requireInternalPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user has an internal role
    if (!req.user.internalRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint requires an internal role.'
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your account has been deactivated.'
      });
    }

    // Superusers have all permissions
    if (req.user.internalRole === 'superuser') {
      return next();
    }

    // Check if user has internalPermissions object
    if (!req.user.internalPermissions) {
      return res.status(403).json({
        success: false,
        message: 'User does not have internal permission configuration.'
      });
    }

    // Check if user has all required permissions
    const missingPermissions = permissions.filter(
      permission => !req.user.internalPermissions[permission]
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Missing required internal permissions: ${missingPermissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Require platform role middleware for platform routes
 * Ensures only platform staff (users with internalRole) can access platform routes
 * Requirements: 3.4, 3.5, 6.2, 6.3, 9.1, 9.2
 * @param {...string} allowedRoles - Optional specific internal roles allowed (e.g., 'superuser', 'platform_admin')
 */
exports.requirePlatformRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user has platform staff role (internalRole)
    if (!req.user.isPlatformStaff()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is for platform staff only.',
        userType: req.user.getUserType()
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your account has been deactivated.'
      });
    }

    // If specific roles are required, check them
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.internalRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required platform roles: ${allowedRoles.join(', ')}`,
        currentRole: req.user.internalRole
      });
    }

    next();
  };
};

/**
 * Require property owner middleware for owner routes
 * Ensures only property owners can access owner-specific routes
 * Requirements: 9.3
 * @param {boolean} allowPlatformOverride - If true, platform staff with override permissions can access
 */
exports.requirePropertyOwner = (allowPlatformOverride = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user is a property owner
    if (req.user.isPropertyOwner()) {
      return next();
    }

    // Optional: Allow platform staff with override permissions
    if (allowPlatformOverride && req.user.isPlatformStaff()) {
      // Check if platform staff has override permissions
      if (req.user.internalRole === 'superuser' || req.user.internalRole === 'platform_admin') {
        return next();
      }
      
      // Check for explicit override permission
      if (req.user.internalPermissions && req.user.internalPermissions.canAccessOwnerRoutes) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. This endpoint is for property owners only.',
      userType: req.user.getUserType()
    });
  };
};

/**
 * Require property staff middleware for staff routes
 * Ensures only property staff can access staff-specific routes
 * Requirements: 9.4
 * @param {boolean} allowOwnerAccess - If true, property owners can also access
 */
exports.requirePropertyStaff = (allowOwnerAccess = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Check if user is property staff
    if (req.user.isPropertyStaff()) {
      // Check if staff is active
      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Your account has been deactivated.'
        });
      }
      return next();
    }

    // Optional: Allow property owners to access staff routes
    if (allowOwnerAccess && req.user.isPropertyOwner()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. This endpoint is for property staff only.',
      userType: req.user.getUserType()
    });
  };
};
