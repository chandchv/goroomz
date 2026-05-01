/**
 * Internal User Management Routes
 * 
 * Handles internal user management for the internal management system.
 * Includes CRUD operations, performance metrics, and owner user queries.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { Op } = require('sequelize');
const { getPermissionsForRole } = require('../utils/authMiddleware');

const router = express.Router();

// @desc    Get internal users with filtering
// @route   GET /api/internal/users
// @access  Private
router.get('/internal/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { role, isActive, territoryId, search, page = 1, limit = 20 } = req.query;

    // Build where clause
    const whereClause = {};
    
    // Filter by internal roles only
    const internalRoles = ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser', 'admin', 'category_owner'];
    whereClause.role = { [Op.in]: internalRoles };

    if (role) {
      whereClause.role = role;
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    // Map users to internal user format
    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      internalRole: user.role,
      internalPermissions: getPermissionsForRole(user.role),
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
      data: mappedUsers
    });

  } catch (error) {
    console.error('Get internal users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching internal users' });
  }
});

// @desc    Create internal user
// @route   POST /api/internal/users
// @access  Private
router.post('/internal/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser', 'platform_admin'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create users' });
    }

    const { name, email, phone, internalRole } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      role: internalRole || 'agent',
      password: tempPassword, // Will be hashed by model hook
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          internalRole: user.role,
          internalPermissions: getPermissionsForRole(user.role),
          isActive: true,
          createdAt: user.createdAt
        },
        tempPassword
      }
    });

  } catch (error) {
    console.error('Create internal user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// @desc    Get internal user by ID
// @route   GET /api/internal/users/:id
// @access  Private
router.get('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        internalRole: user.role,
        internalPermissions: getPermissionsForRole(user.role),
        isActive: user.isActive !== false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get internal user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

// @desc    Update internal user
// @route   PUT /api/internal/users/:id
// @access  Private
router.put('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser', 'platform_admin'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update users' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, email, phone, internalRole, isActive } = req.body;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (internalRole) user.role = internalRole;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        internalRole: user.role,
        internalPermissions: getPermissionsForRole(user.role),
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update internal user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// @desc    Deactivate internal user
// @route   DELETE /api/internal/users/:id
// @access  Private
router.delete('/internal/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser || !['admin', 'superuser'].includes(currentUser.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to deactivate users' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete - just deactivate
    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Deactivate internal user error:', error);
    res.status(500).json({ success: false, message: 'Error deactivating user' });
  }
});

// @desc    Get user performance metrics
// @route   GET /api/internal/users/:id/performance
// @access  Private
router.get('/internal/users/:id/performance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    jwt.verify(token, process.env.JWT_SECRET);

    // Return mock performance data for now
    res.json({
      success: true,
      data: {
        propertiesOnboarded: 0,
        conversionRate: 0,
        averageTimeToClose: 0,
        commissionEarned: 0,
        leadsInPipeline: 0
      }
    });

  } catch (error) {
    console.error('Get user performance error:', error);
    res.status(500).json({ success: false, message: 'Error fetching performance metrics' });
  }
});

// @desc    Get actual property owners (users with owner role) for change ownership
// @route   GET /api/internal/superuser/users/owners
// @access  Private
router.get('/internal/superuser/users/owners', async (req, res) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    try {
      // Get actual users with owner role
      const owners = await User.findAll({
        where: {
          role: 'owner',
          is_verified: true
        },
        attributes: ['id', 'name', 'email', 'phone', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']]
      });

      // Transform to match expected format
      const propertyOwners = owners.map(owner => ({
        id: owner.id,
        name: owner.name || 'Unknown Owner',
        email: owner.email,
        phone: owner.phone,
        isVerified: true,
        createdAt: owner.created_at,
        updatedAt: owner.updated_at,
        propertiesCount: 0 // Could be calculated if needed
      }));

      res.json({
        success: true,
        data: {
          propertyOwners
        },
        count: propertyOwners.length,
        total: propertyOwners.length
      });

    } catch (dbError) {
      console.error('Database error in users/owners endpoint:', dbError);
      
      // Return empty array if database fails
      res.json({
        success: true,
        data: {
          propertyOwners: []
        },
        count: 0,
        total: 0
      });
    }

  } catch (error) {
    console.error('Error in users/owners endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
