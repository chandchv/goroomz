const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Internal Staff Management Routes
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 2.4, 7.2
 */

/**
 * Helper function to generate a random password
 */
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Helper function to get default permissions based on staff role
 */
const getDefaultPermissions = (staffRole) => {
  const permissionSets = {
    front_desk: {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: false,
      canRecordPayments: true,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    },
    housekeeping: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: true,
      canManageMaintenance: false
    },
    maintenance: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: true
    },
    manager: {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: true,
      canRecordPayments: true,
      canViewReports: true,
      canManageStaff: true,
      canUpdateRoomStatus: true,
      canManageMaintenance: true
    }
  };

  return permissionSets[staffRole] || {
    canCheckIn: false,
    canCheckOut: false,
    canManageRooms: false,
    canRecordPayments: false,
    canViewReports: false,
    canManageStaff: false,
    canUpdateRoomStatus: false,
    canManageMaintenance: false
  };
};

/**
 * GET /api/internal/staff
 * Get all staff users for a property
 * Requirements: 33.1, 2.4, 7.2
 */
router.get('/', protectInternal, applyScopingMiddleware, requirePermissions('canManageStaff'), async (req, res) => {
  try {
    const { propertyId, role, active } = req.query;

    // Build where clause
    const whereClause = {
      staffRole: {
        [Op.not]: null
      }
    };

    // Filter by staff role if provided
    if (role && ['front_desk', 'housekeeping', 'maintenance', 'manager'].includes(role)) {
      whereClause.staffRole = role;
    }

    // For property owners, we might want to filter staff by property
    // For now, we'll return all staff users
    // In a more complete implementation, we'd have a staff-property association table

    const staff = await User.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'email',
        'phone',
        'role',
        'staffRole',
        'permissions',
        'avatar',
        'isVerified',
        'created_at',
        'updated_at'
      ],
      order: [
        ['staffRole', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff users.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/staff
 * Create a new staff user
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 2.4, 7.2
 */
router.post('/', protectInternal, applyScopingMiddleware, requirePermissions('canManageStaff'), async (req, res) => {
  try {
    const { name, email, phone, staffRole, permissions, generatePasswordFlag } = req.body;

    // Validate required fields
    if (!name || !email || !staffRole) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and staff role are required.'
      });
    }

    // Validate staff role
    const validStaffRoles = ['front_desk', 'housekeeping', 'maintenance', 'manager'];
    if (!validStaffRoles.includes(staffRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid staff role. Must be one of: ${validStaffRoles.join(', ')}`
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    // Generate password if requested
    const password = generatePasswordFlag ? generatePassword() : req.body.password;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required or set generatePasswordFlag to true.'
      });
    }

    // Get default permissions for the role or use provided permissions
    const staffPermissions = permissions || getDefaultPermissions(staffRole);

    // Create staff user
    const staffUser = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      password,
      role: 'user', // Base role is user, staffRole determines internal access
      staffRole,
      permissions: staffPermissions,
      isVerified: true // Staff accounts are pre-verified
    });

    // Return created user (password will be excluded by toJSON method)
    const response = {
      success: true,
      message: 'Staff user created successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        phone: staffUser.phone,
        role: staffUser.role,
        staffRole: staffUser.staffRole,
        permissions: staffUser.permissions,
        isVerified: staffUser.isVerified,
        created_at: staffUser.createdAt
      }
    };

    // Include generated password in response if it was generated
    if (generatePasswordFlag) {
      response.generatedPassword = password;
      response.message += ' Please save the generated password securely.';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating staff user:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create staff user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/staff/:id
 * Update a staff user
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 2.4, 7.2
 */
router.put('/:id', protectInternal, applyScopingMiddleware, requirePermissions('canManageStaff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, staffRole, permissions, isActive } = req.body;

    // Find the staff user
    const staffUser = await User.findByPk(id);

    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found.'
      });
    }

    // Verify this is actually a staff user
    if (!staffUser.staffRole) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a staff member.'
      });
    }

    // Prevent modifying admin or owner accounts through this endpoint
    if (staffUser.role === 'admin' || staffUser.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin or owner accounts through staff management.'
      });
    }

    // Update fields if provided
    if (name) staffUser.name = name;
    if (email) staffUser.email = email.toLowerCase();
    if (phone !== undefined) staffUser.phone = phone;
    
    if (staffRole) {
      const validStaffRoles = ['front_desk', 'housekeeping', 'maintenance', 'manager'];
      if (!validStaffRoles.includes(staffRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid staff role. Must be one of: ${validStaffRoles.join(', ')}`
        });
      }
      staffUser.staffRole = staffRole;
      
      // Update permissions to match new role if permissions not explicitly provided
      if (!permissions) {
        staffUser.permissions = getDefaultPermissions(staffRole);
      }
    }

    if (permissions) {
      staffUser.permissions = permissions;
    }

    await staffUser.save();

    res.json({
      success: true,
      message: 'Staff user updated successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        phone: staffUser.phone,
        role: staffUser.role,
        staffRole: staffUser.staffRole,
        permissions: staffUser.permissions,
        updated_at: staffUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating staff user:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update staff user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/internal/staff/:id
 * Delete a staff user
 * Requirements: 33.1, 2.4, 7.2
 */
router.delete('/:id', protectInternal, applyScopingMiddleware, requirePermissions('canManageStaff'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find the staff user
    const staffUser = await User.findByPk(id);

    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found.'
      });
    }

    // Verify this is actually a staff user
    if (!staffUser.staffRole) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a staff member.'
      });
    }

    // Prevent deleting admin or owner accounts
    if (staffUser.role === 'admin' || staffUser.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin or owner accounts through staff management.'
      });
    }

    // Prevent users from deleting themselves
    if (staffUser.id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    // Delete the staff user
    await staffUser.destroy();

    res.json({
      success: true,
      message: 'Staff user deleted successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email
      }
    });
  } catch (error) {
    console.error('Error deleting staff user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/staff/:id/permissions
 * Update staff user permissions
 * Requirements: 33.2, 33.3, 33.4, 33.5, 2.4, 7.2
 */
router.put('/:id/permissions', protectInternal, applyScopingMiddleware, requirePermissions('canManageStaff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid permissions object is required.'
      });
    }

    // Find the staff user
    const staffUser = await User.findByPk(id);

    if (!staffUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found.'
      });
    }

    // Verify this is actually a staff user
    if (!staffUser.staffRole) {
      return res.status(400).json({
        success: false,
        message: 'This user is not a staff member.'
      });
    }

    // Validate permission keys
    const validPermissionKeys = [
      'canCheckIn',
      'canCheckOut',
      'canManageRooms',
      'canRecordPayments',
      'canViewReports',
      'canManageStaff',
      'canUpdateRoomStatus',
      'canManageMaintenance'
    ];

    const providedKeys = Object.keys(permissions);
    const invalidKeys = providedKeys.filter(key => !validPermissionKeys.includes(key));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
        validKeys: validPermissionKeys
      });
    }

    // Update permissions (merge with existing)
    staffUser.permissions = {
      ...staffUser.permissions,
      ...permissions
    };

    await staffUser.save();

    res.json({
      success: true,
      message: 'Staff permissions updated successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        staffRole: staffUser.staffRole,
        permissions: staffUser.permissions,
        updated_at: staffUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff permissions.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
