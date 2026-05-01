/**
 * Internal Authentication Routes
 * 
 * Handles authentication for the internal management system.
 * Extracted from the monolithic leads.js file.
 */

const express = require('express');
const User = require('../../models/User');
const { generateToken, INTERNAL_ROLES } = require('../utils/authMiddleware');

const router = express.Router();

/**
 * @desc    Internal login for management system
 * @route   POST /api/internal/auth/login
 * @access  Public
 */
router.post('/internal/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const normalizedEmail = email.toLowerCase();

    // Find user and check if they have internal management access
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user has appropriate role for internal management
    if (!INTERNAL_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    const internalStaffRoles = ['admin', 'superuser', 'agent', 'operations_manager', 'platform_admin', 'regional_manager', 'category_owner'];
    const isInternalStaff = internalStaffRoles.includes(user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        internalRole: isInternalStaff ? user.role : null,
        avatar: user.avatar
      }
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
 * @desc    Get current internal user
 * @route   GET /api/internal/auth/me
 * @access  Private
 */
router.get('/internal/auth/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user still has appropriate role for internal management
    if (!INTERNAL_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const internalStaffRoles = ['admin', 'superuser', 'agent', 'operations_manager', 'platform_admin', 'regional_manager', 'category_owner'];
    const isInternalStaff = internalStaffRoles.includes(user.role);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        internalRole: isInternalStaff ? user.role : null,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Internal auth me error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;
