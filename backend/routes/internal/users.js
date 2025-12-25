const express = require('express');
const router = express.Router();
const { User, Territory, InternalRole } = require('../../models');
const { protectInternal, authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { sendEmail } = require('../../utils/emailService');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Internal User Management Routes
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */

/**
 * Helper function to get default permissions for a role
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

  return rolePermissions[roleName] || null;
};

/**
 * GET /api/internal/users
 * Get all internal users
 * Requirements: 7.1
 */
router.get('/', 
  protectInternal, 
  authorizeInternalRoles('platform_admin', 'superuser', 'regional_manager'),
  async (req, res) => {
    try {
      const { role, isActive, territoryId, search, page = 1, limit = 50 } = req.query;

      // Build where clause
      const whereClause = {
        internalRole: {
          [Op.ne]: null
        }
      };

      // Filter by role
      if (role) {
        whereClause.internalRole = role;
      }

      // Filter by active status
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      // Filter by territory (for regional managers)
      if (territoryId) {
        whereClause.territoryId = territoryId;
      }

      // Regional managers can only see users in their territories
      if (req.user.internalRole === 'regional_manager') {
        // Get territories managed by this regional manager
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        // Filter to users in these territories or the regional manager themselves
        whereClause[Op.or] = [
          { territoryId: { [Op.in]: territoryIds } },
          { id: req.user.id }
        ];
      }

      // Search by name or email
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch users
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
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
          'last_login_at',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'regionalManagerId']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ],
        order: [
          ['isActive', 'DESC'],
          ['name', 'ASC']
        ],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: users
      });
    } catch (error) {
      console.error('Error fetching internal users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch internal users.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/users
 * Create internal user
 * Requirements: 7.1, 7.3
 */
router.post('/',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  auditLog('create_internal_user', 'user'),
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        internalRole,
        territoryId,
        managerId,
        commissionRate,
        customPermissions
      } = req.body;

      // Validate required fields
      if (!name || !email || !internalRole) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and internal role are required.'
        });
      }

      // Validate internal role
      const validRoles = ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'];
      if (!validRoles.includes(internalRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid internal role. Must be one of: ${validRoles.join(', ')}`
        });
      }

      // Platform admins cannot create superusers
      if (req.user.internalRole === 'platform_admin' && internalRole === 'superuser') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot create superuser accounts.'
        });
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists.'
        });
      }

      // Check if user with this phone number already exists
      if (phone) {
        const existingPhoneUser = await User.findOne({
          where: { phone: phone.trim() }
        });

        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            message: 'A user with this phone number already exists.'
          });
        }
      }

      // Validate territory if provided
      if (territoryId) {
        const territory = await Territory.findByPk(territoryId);
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found.'
          });
        }
      }

      // Validate manager if provided
      if (managerId) {
        const manager = await User.findByPk(managerId);
        if (!manager || !manager.internalRole) {
          return res.status(404).json({
            success: false,
            message: 'Manager not found or is not an internal user.'
          });
        }
      }

      // Validate commission rate if provided
      if (commissionRate !== undefined) {
        const rate = parseFloat(commissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          return res.status(400).json({
            success: false,
            message: 'Commission rate must be between 0 and 100.'
          });
        }
      }

      // Generate secure password
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);

      // Get default permissions for role or use custom permissions
      const permissions = customPermissions || getDefaultPermissionsForRole(internalRole);

      if (!permissions) {
        return res.status(400).json({
          success: false,
          message: 'Could not determine permissions for this role.'
        });
      }

      // Create the user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password: tempPassword,
        role: 'user', // Internal users should have role 'user', not 'admin'
        internalRole,
        internalPermissions: permissions,
        territoryId: territoryId || null,
        managerId: managerId || null,
        commissionRate: commissionRate || null,
        isActive: true,
        isVerified: true
      });

      // Send credentials email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Welcome to GoRoomz Internal Management',
          html: `
            <h2>Welcome to GoRoomz Internal Management System</h2>
            <p>Hello ${user.name},</p>
            <p>Your account has been created with the role: <strong>${internalRole.replace('_', ' ').toUpperCase()}</strong></p>
            <p>Your login credentials:</p>
            <ul>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            </ul>
            <p>Please log in and change your password immediately.</p>
            <p>Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login</p>
            <br>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending credentials email:', emailError);
        // Continue even if email fails - admin can manually share credentials
      }

      // Return user without password
      const userResponse = user.toJSON();

      res.status(201).json({
        success: true,
        message: 'Internal user created successfully. Credentials sent via email.',
        data: {
          user: userResponse,
          tempPassword: tempPassword // Include in response as backup
        }
      });
    } catch (error) {
      console.error('Error creating internal user:', error);

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
        message: 'Failed to create internal user.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/users/:id
 * Get user details
 * Requirements: 7.1
 */
router.get('/:id',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser', 'regional_manager', 'operations_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
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
          'last_login_at',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description', 'regionalManagerId']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email', 'internalRole']
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Regional managers can only view users in their territories
      if (req.user.internalRole === 'regional_manager') {
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(user.territoryId) && user.id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view users in your territories.'
          });
        }
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user details.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/users/:id
 * Update user
 * Requirements: 7.4
 */
router.put('/:id',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  auditLog('update_internal_user', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        phone,
        internalRole,
        territoryId,
        managerId,
        commissionRate
      } = req.body;

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Platform admins cannot modify superusers
      if (req.user.internalRole === 'platform_admin' && user.internalRole === 'superuser') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot modify superuser accounts.'
        });
      }

      // Validate internal role if being changed
      if (internalRole && internalRole !== user.internalRole) {
        const validRoles = ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'];
        if (!validRoles.includes(internalRole)) {
          return res.status(400).json({
            success: false,
            message: `Invalid internal role. Must be one of: ${validRoles.join(', ')}`
          });
        }

        // Platform admins cannot create/promote to superuser
        if (req.user.internalRole === 'platform_admin' && internalRole === 'superuser') {
          return res.status(403).json({
            success: false,
            message: 'Platform administrators cannot promote users to superuser.'
          });
        }

        // Update permissions when role changes
        const newPermissions = getDefaultPermissionsForRole(internalRole);
        if (newPermissions) {
          user.internalPermissions = newPermissions;
        }
      }

      // Check if email is being changed and if it's already in use
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email: email.toLowerCase(),
            id: { [Op.ne]: id }
          }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'A user with this email already exists.'
          });
        }
        user.email = email.toLowerCase();
      }

      // Check if phone is being changed and if it's already in use
      if (phone !== undefined && phone !== user.phone) {
        if (phone) {
          const existingPhoneUser = await User.findOne({
            where: {
              phone: phone.trim(),
              id: { [Op.ne]: id }
            }
          });

          if (existingPhoneUser) {
            return res.status(400).json({
              success: false,
              message: 'A user with this phone number already exists.'
            });
          }
        }
        user.phone = phone;
      }

      // Validate territory if provided
      if (territoryId !== undefined) {
        if (territoryId) {
          const territory = await Territory.findByPk(territoryId);
          if (!territory) {
            return res.status(404).json({
              success: false,
              message: 'Territory not found.'
            });
          }
        }
        user.territoryId = territoryId;
      }

      // Validate manager if provided
      if (managerId !== undefined) {
        if (managerId) {
          const manager = await User.findByPk(managerId);
          if (!manager || !manager.internalRole) {
            return res.status(404).json({
              success: false,
              message: 'Manager not found or is not an internal user.'
            });
          }
        }
        user.managerId = managerId;
      }

      // Validate commission rate if provided
      if (commissionRate !== undefined) {
        if (commissionRate !== null) {
          const rate = parseFloat(commissionRate);
          if (isNaN(rate) || rate < 0 || rate > 100) {
            return res.status(400).json({
              success: false,
              message: 'Commission rate must be between 0 and 100.'
            });
          }
        }
        user.commissionRate = commissionRate;
      }

      // Update other fields
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (internalRole) user.internalRole = internalRole;

      await user.save();

      // Fetch updated user with associations
      const updatedUser = await User.findOne({
        where: { id: user.id },
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
          'last_login_at',
          'created_at',
          'updated_at'
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Internal user updated successfully.',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error updating internal user:', error);

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
        message: 'Failed to update internal user.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * DELETE /api/internal/users/:id
 * Deactivate user (soft delete)
 * Requirements: 7.5
 * Implements Property 28: User deactivation access revocation
 */
router.delete('/:id',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  auditLog('deactivate_internal_user', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Platform admins cannot deactivate superusers
      if (req.user.internalRole === 'platform_admin' && user.internalRole === 'superuser') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot deactivate superuser accounts.'
        });
      }

      // Prevent self-deactivation
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.'
        });
      }

      // Check if user is already deactivated
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'User is already deactivated.'
        });
      }

      // Deactivate the user (soft delete)
      user.isActive = false;
      await user.save();

      res.json({
        success: true,
        message: 'Internal user deactivated successfully. Historical data preserved.',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Error deactivating internal user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate internal user.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;

/**
 * PUT /api/internal/users/:id/permissions
 * Update user permissions
 * Requirements: 7.2
 */
router.put('/:id/permissions',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  auditLog('update_user_permissions', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Permissions object is required.'
        });
      }

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Platform admins cannot modify superuser permissions
      if (req.user.internalRole === 'platform_admin' && user.internalRole === 'superuser') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot modify superuser permissions.'
        });
      }

      // Validate permission keys
      const validPermissions = [
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

      const providedKeys = Object.keys(permissions);
      const invalidKeys = providedKeys.filter(key => !validPermissions.includes(key));

      if (invalidKeys.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permission keys: ${invalidKeys.join(', ')}`,
          validPermissions
        });
      }

      // Validate all values are boolean
      for (const key of providedKeys) {
        if (typeof permissions[key] !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `Permission ${key} must be a boolean value.`
          });
        }
      }

      // Update permissions (merge with existing)
      user.internalPermissions = {
        ...user.internalPermissions,
        ...permissions
      };

      await user.save();

      res.json({
        success: true,
        message: 'User permissions updated successfully.',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          internalRole: user.internalRole,
          internalPermissions: user.internalPermissions
        }
      });
    } catch (error) {
      console.error('Error updating user permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user permissions.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * PUT /api/internal/users/:id/territory
 * Assign territory to user
 * Requirements: 4.1
 */
router.put('/:id/territory',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser', 'regional_manager'),
  auditLog('assign_user_territory', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { territoryId } = req.body;

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Validate territory if provided
      if (territoryId) {
        const territory = await Territory.findByPk(territoryId);
        
        if (!territory) {
          return res.status(404).json({
            success: false,
            message: 'Territory not found.'
          });
        }

        // Regional managers can only assign users to their own territories
        if (req.user.internalRole === 'regional_manager') {
          if (territory.regionalManagerId !== req.user.id) {
            return res.status(403).json({
              success: false,
              message: 'You can only assign users to territories you manage.'
            });
          }
        }
      }

      // Update territory
      user.territoryId = territoryId || null;
      await user.save();

      // Fetch updated user with territory details
      const updatedUser = await User.findOne({
        where: { id: user.id },
        attributes: [
          'id',
          'name',
          'email',
          'internalRole',
          'territoryId',
          'managerId'
        ],
        include: [
          {
            model: Territory,
            as: 'territory',
            attributes: ['id', 'name', 'description', 'regionalManagerId']
          }
        ]
      });

      res.json({
        success: true,
        message: territoryId ? 'Territory assigned successfully.' : 'Territory removed successfully.',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error assigning territory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign territory.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/users/:id/performance
 * Get user performance metrics
 * Requirements: 3.2
 */
router.get('/:id/performance',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser', 'regional_manager', 'operations_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        },
        attributes: ['id', 'name', 'email', 'internalRole', 'territoryId', 'commissionRate']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Regional managers can only view performance of users in their territories
      if (req.user.internalRole === 'regional_manager') {
        const territories = await Territory.findAll({
          where: { regionalManagerId: req.user.id },
          attributes: ['id']
        });

        const territoryIds = territories.map(t => t.id);

        if (!territoryIds.includes(user.territoryId) && user.id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only view performance of users in your territories.'
          });
        }
      }

      // Build date filter
      const dateFilter = {};
      if (startDate) {
        dateFilter[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        dateFilter[Op.lte] = new Date(endDate);
      }

      // Initialize performance metrics
      const performance = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          internalRole: user.internalRole,
          territoryId: user.territoryId,
          commissionRate: user.commissionRate
        },
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        metrics: {
          propertiesOnboarded: 0,
          leadsCreated: 0,
          leadsInProgress: 0,
          leadsApproved: 0,
          leadsRejected: 0,
          conversionRate: 0,
          commissionEarned: 0,
          commissionPending: 0,
          commissionPaid: 0,
          averageTimeToClose: 0
        }
      };

      // Only calculate metrics for agents and regional managers
      if (user.internalRole === 'agent' || user.internalRole === 'regional_manager') {
        const { Lead, Commission } = require('../../models');

        // Build lead where clause
        const leadWhere = { agentId: user.id };
        if (Object.keys(dateFilter).length > 0) {
          leadWhere.createdAt = dateFilter;
        }

        // Get lead statistics
        const leads = await Lead.findAll({
          where: leadWhere,
          attributes: ['id', 'status', 'created_at', 'approvedAt']
        });

        performance.metrics.leadsCreated = leads.length;
        performance.metrics.leadsInProgress = leads.filter(l => 
          ['contacted', 'in_progress', 'pending_approval'].includes(l.status)
        ).length;
        performance.metrics.leadsApproved = leads.filter(l => l.status === 'approved').length;
        performance.metrics.leadsRejected = leads.filter(l => l.status === 'rejected').length;
        performance.metrics.propertiesOnboarded = performance.metrics.leadsApproved;

        // Calculate conversion rate
        if (leads.length > 0) {
          performance.metrics.conversionRate = 
            ((performance.metrics.leadsApproved / leads.length) * 100).toFixed(2);
        }

        // Calculate average time to close for approved leads
        const approvedLeads = leads.filter(l => l.status === 'approved' && l.approvedAt);
        if (approvedLeads.length > 0) {
          const totalDays = approvedLeads.reduce((sum, lead) => {
            const days = Math.ceil(
              (new Date(lead.approvedAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0);
          performance.metrics.averageTimeToClose = Math.round(totalDays / approvedLeads.length);
        }

        // Get commission statistics
        const commissionWhere = { agentId: user.id };
        if (Object.keys(dateFilter).length > 0) {
          commissionWhere.earnedDate = dateFilter;
        }

        const commissions = await Commission.findAll({
          where: commissionWhere,
          attributes: ['id', 'amount', 'status']
        });

        performance.metrics.commissionEarned = commissions
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
          .toFixed(2);

        performance.metrics.commissionPending = commissions
          .filter(c => c.status === 'pending_payment')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
          .toFixed(2);

        performance.metrics.commissionPaid = commissions
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
          .toFixed(2);
      }

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error fetching user performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user performance.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/internal/users/:id/reset-password
 * Reset user password
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
router.post('/:id/reset-password',
  protectInternal,
  authorizeInternalRoles('platform_admin', 'superuser'),
  auditLog('reset_user_password', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the user
      const user = await User.findOne({
        where: {
          id,
          internalRole: { [Op.ne]: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Internal user not found.'
        });
      }

      // Platform admins cannot reset superuser passwords
      if (req.user.internalRole === 'platform_admin' && user.internalRole === 'superuser') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot reset superuser passwords.'
        });
      }

      // Prevent resetting own password through this endpoint
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'You cannot reset your own password through this endpoint. Use the change password feature instead.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reset password for inactive users.'
        });
      }

      // Generate secure temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);

      // Update user password
      user.password = tempPassword;
      await user.save();

      // Send password reset email
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your GoRoomz Password Has Been Reset',
          html: `
            <h2>Password Reset Notification</h2>
            <p>Hello ${user.name},</p>
            <p>Your password has been reset by an administrator.</p>
            <p>Your new temporary password is:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 16px; margin: 15px 0;">
              <strong>${tempPassword}</strong>
            </div>
            <p><strong>Important:</strong> Please log in and change this password immediately for security reasons.</p>
            <p>Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login</p>
            <br>
            <p>If you did not request this password reset, please contact your administrator immediately.</p>
            <br>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Continue even if email fails - return password in response as backup
      }

      res.json({
        success: true,
        message: 'Password reset successfully. New credentials sent via email.',
        data: {
          tempPassword: tempPassword // Include in response as backup
        }
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
