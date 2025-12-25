const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { protectInternal } = require('../../middleware/internalAuth');
const { 
  validateUserLogin, 
  handleValidationErrors 
} = require('../../middleware/validation');

const router = express.Router();

/**
 * Internal Management Authentication Routes
 * Requirements: 32.1, 33.2, 33.3, 33.4, 33.5
 */

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Cookie options for session management
const getCookieOptions = () => {
  return {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/'
  };
};

/**
 * @desc    Staff/Internal user login
 * @route   POST /api/internal/auth/login
 * @access  Public
 * 
 * Authenticates staff users, property owners, and admins for internal management system
 * Requirements: 32.1, 33.2, 33.3, 33.4, 33.5
 */
router.post('/login', validateUserLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has password (not just Firebase auth)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses social login. Please use the customer website.'
      });
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has internal management access
    const hasInternalAccess = 
      user.role === 'admin' || 
      user.role === 'owner' || 
      user.role === 'category_owner' ||
      user.staffRole !== null ||
      user.internalRole !== null;

    if (!hasInternalAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This login is for internal management staff only.'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Set HTTP-only cookie for session management
    res.cookie('auth_token', token, getCookieOptions());

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save({ fields: ['lastLoginAt'] });

    // Prepare user response with internal management specific fields
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      staffRole: user.staffRole,
      internalRole: user.internalRole, // Include internal role for role-based routing
      permissions: user.permissions,
      internalPermissions: user.internalPermissions, // Include internal permissions
      avatar: user.avatar,
      territoryId: user.territoryId,
      managerId: user.managerId,
      commissionRate: user.commissionRate
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Internal login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/internal/auth/logout
 * @access  Public
 * 
 * Logs out the current user (clears session cookie and client-side token)
 * Requirements: 32.1
 */
router.post('/logout', (req, res) => {
  // Clear the HTTP-only cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Get current authenticated user info
 * @route   GET /api/internal/auth/me
 * @access  Private (Internal Management)
 * 
 * Returns the current user's information including role and permissions
 * Requirements: 32.1, 33.2, 33.3, 33.4, 33.5
 */
router.get('/me', protectInternal, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user info with internal management specific fields
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        staffRole: user.staffRole,
        internalRole: user.internalRole,
        permissions: user.permissions,
        internalPermissions: user.internalPermissions,
        avatar: user.avatar,
        territoryId: user.territoryId,
        managerId: user.managerId,
        commissionRate: user.commissionRate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user information'
    });
  }
});

/**
 * @desc    Verify token validity
 * @route   GET /api/internal/auth/verify
 * @access  Private (Internal Management)
 * 
 * Verifies if the current token is valid and returns basic user info
 * Useful for checking authentication status on app load
 */
router.get('/verify', protectInternal, async (req, res) => {
  try {
    res.json({
      success: true,
      valid: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        staffRole: req.user.staffRole,
        internalRole: req.user.internalRole
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token'
    });
  }
});

module.exports = router;
