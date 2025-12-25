const express = require('express');
const router = express.Router();
const { InternalRole, User } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');

/**
 * Internal Role Management Routes
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

/**
 * Helper function to get default permissions for predefined roles
 */
const getDefaultPermissionsForRole = (roleName) => {
  const rolePermissions = {
    agent: {
      canOnboardProperties: true,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    regional_manager: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    operations_manager: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: true,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    },
    platform_admin: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: false,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    },
    superuser: {
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
    }
  };

  return rolePermissions[roleName] || {
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
};

/**
 * GET /api/internal/roles
 * Get all roles (both predefined and custom)
 * Requirements: 22.1
 */
router.get('/', protectInternal, authorizeInternalRoles('platform_admin', 'superuser'), async (req, res) => {
  try {
    const { includeCustomOnly } = req.query;

    const whereClause = {};
    if (includeCustomOnly === 'true') {
      whereClause.isCustom = true;
    }

    const roles = await InternalRole.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'displayName',
        'description',
        'defaultPermissions',
        'isCustom',
        'createdBy'
      ],
      order: [
        ['isCustom', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/roles
 * Create a custom role (superuser only)
 * Requirements: 22.1, 22.2
 */
router.post('/', protectInternal, authorizeInternalRoles('superuser'), async (req, res) => {
  try {
    const { name, displayName, description, defaultPermissions } = req.body;

    // Validate required fields
    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Name and display name are required.'
      });
    }

    // Validate name format (lowercase, underscores only)
    if (!/^[a-z_]+$/.test(name)) {
      return res.status(400).json({
        success: false,
        message: 'Role name must be lowercase with underscores only (e.g., custom_role_name).'
      });
    }

    // Check if role with this name already exists
    const existingRole = await InternalRole.findOne({
      where: { name }
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'A role with this name already exists.'
      });
    }

    // Validate permissions if provided
    if (defaultPermissions) {
      const requiredKeys = [
        'canOnboardProperties',
        'canApproveOnboardings',
        'canManageAgents',
        'canAccessAllProperties',
        'canManageSystemSettings',
        'canViewAuditLogs',
        'canManageCommissions',
        'canManageTerritories',
        'canManageTickets',
        'canBroadcastAnnouncements'
      ];

      const providedKeys = Object.keys(defaultPermissions);
      const missingKeys = requiredKeys.filter(key => !providedKeys.includes(key));

      if (missingKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required permission keys: ${missingKeys.join(', ')}`,
          requiredKeys
        });
      }

      // Validate all values are boolean
      for (const key of requiredKeys) {
        if (typeof defaultPermissions[key] !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `Permission ${key} must be a boolean value.`
          });
        }
      }
    }

    // Create the custom role
    const role = await InternalRole.create({
      name,
      displayName,
      description: description || null,
      defaultPermissions: defaultPermissions || getDefaultPermissionsForRole('agent'),
      isCustom: true,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Custom role created successfully.',
      data: role
    });
  } catch (error) {
    console.error('Error creating custom role:', error);

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
      message: 'Failed to create custom role.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/roles/:id
 * Update role permissions
 * Requirements: 22.3, 22.4
 */
router.put('/:id', protectInternal, authorizeInternalRoles('superuser'), async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, defaultPermissions } = req.body;

    // Find the role
    const role = await InternalRole.findByPk(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found.'
      });
    }

    // Prevent modifying predefined roles' core structure
    if (!role.isCustom) {
      // Only allow updating permissions for predefined roles
      if (displayName || description) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify display name or description of predefined roles. Only permissions can be updated.'
        });
      }
    }

    // Update fields if provided
    if (displayName && role.isCustom) {
      role.displayName = displayName;
    }

    if (description !== undefined && role.isCustom) {
      role.description = description;
    }

    if (defaultPermissions) {
      // Validate permissions
      const requiredKeys = [
        'canOnboardProperties',
        'canApproveOnboardings',
        'canManageAgents',
        'canAccessAllProperties',
        'canManageSystemSettings',
        'canViewAuditLogs',
        'canManageCommissions',
        'canManageTerritories',
        'canManageTickets',
        'canBroadcastAnnouncements'
      ];

      const providedKeys = Object.keys(defaultPermissions);
      const invalidKeys = providedKeys.filter(key => !requiredKeys.includes(key));

      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
          validKeys: requiredKeys
        });
      }

      // Validate all values are boolean
      for (const key of providedKeys) {
        if (typeof defaultPermissions[key] !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `Permission ${key} must be a boolean value.`
          });
        }
      }

      // Update permissions (merge with existing)
      role.defaultPermissions = {
        ...role.defaultPermissions,
        ...defaultPermissions
      };
    }

    await role.save();

    // Update all users with this role to have the new permissions
    // This implements Property 3: Custom role permission consistency
    const usersWithRole = await User.findAll({
      where: {
        internalRole: role.name
      }
    });

    if (usersWithRole.length > 0) {
      await Promise.all(
        usersWithRole.map(user => {
          user.internalPermissions = role.defaultPermissions;
          return user.save({ fields: ['internalPermissions'] });
        })
      );
    }

    res.json({
      success: true,
      message: `Role updated successfully. ${usersWithRole.length} user(s) permissions updated.`,
      data: {
        role,
        usersUpdated: usersWithRole.length
      }
    });
  } catch (error) {
    console.error('Error updating role:', error);

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
      message: 'Failed to update role.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/internal/roles/:id
 * Delete a custom role
 * Requirements: 22.5
 */
router.delete('/:id', protectInternal, authorizeInternalRoles('superuser'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find the role
    const role = await InternalRole.findByPk(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found.'
      });
    }

    // Prevent deleting predefined roles
    if (!role.isCustom) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete predefined roles.'
      });
    }

    // Check if any users are assigned to this role
    // This implements Property 4: Role deletion protection
    const usersWithRole = await User.count({
      where: {
        internalRole: role.name
      }
    });

    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${usersWithRole} user(s) are currently assigned to this role.`,
        usersCount: usersWithRole
      });
    }

    // Delete the role
    await role.destroy();

    res.json({
      success: true,
      message: 'Custom role deleted successfully.',
      data: {
        id: role.id,
        name: role.name,
        displayName: role.displayName
      }
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/roles/:id/users
 * Get all users with a specific role
 * Requirements: 22.1
 */
router.get('/:id/users', protectInternal, authorizeInternalRoles('platform_admin', 'superuser'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find the role
    const role = await InternalRole.findByPk(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found.'
      });
    }

    // Find all users with this role
    const users = await User.findAll({
      where: {
        internalRole: role.name
      },
      attributes: [
        'id',
        'name',
        'email',
        'phone',
        'internalRole',
        'internalPermissions',
        'territoryId',
        'managerId',
        'commissionRate',
        'isActive',
        'lastLoginAt',
        'created_at'
      ],
      order: [
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      role: {
        id: role.id,
        name: role.name,
        displayName: role.displayName
      },
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users for role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users for role.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
