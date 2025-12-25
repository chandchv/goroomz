const express = require('express');
const router = express.Router();
const { User, Property, Room, AuditLog } = require('../../models');
const { protectInternal } = require('../../middleware/internalAuth');
const { applyScopingMiddleware } = require('../../middleware/dataScoping');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Property Staff Management Routes for Property Owners
 * Requirements: 7.1, 7.4, 10.1, 10.3, 10.5
 * 
 * These routes allow property owners to manage staff assigned to their properties
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
 * Helper function to create audit log entry
 */
const createAuditLog = async (userId, action, resourceType, resourceId, changes, req) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      changes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      isCritical: ['deactivate_staff', 'delete_staff', 'modify_permissions'].includes(action)
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't fail the request if audit logging fails
  }
};

/**
 * GET /api/internal/property-staff
 * Get all staff assigned to the property owner's properties
 * Requirements: 7.1, 7.4
 */
router.get('/', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can manage property staff.'
      });
    }

    const { propertyId, staffRole, isActive } = req.query;

    // Get all properties owned by this user
    const ownedProperties = await Property.findAll({
      where: { owner_id: req.user.id },
      attributes: ['id', 'name']
    });

    const ownedPropertyIds = ownedProperties.map(p => p.id);

    if (ownedPropertyIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Build where clause for staff
    const whereClause = {
      staffRole: {
        [Op.not]: null
      },
      assignedPropertyId: {
        [Op.in]: ownedPropertyIds
      }
    };

    // Filter by specific property if provided
    if (propertyId) {
      // Verify the property belongs to this owner
      if (!ownedPropertyIds.includes(propertyId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this property.'
        });
      }
      whereClause.assignedPropertyId = propertyId;
    }

    // Filter by staff role if provided
    if (staffRole && ['front_desk', 'housekeeping', 'maintenance', 'manager'].includes(staffRole)) {
      whereClause.staffRole = staffRole;
    }

    // Filter by active status if provided
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const staff = await User.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'email',
        'phone',
        'staffRole',
        'permissions',
        'assignedPropertyId',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt'
      ],
      include: [
        {
          model: Property,
          as: 'assignedProperty',
          attributes: ['id', 'name'],
          required: false
        }
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
    console.error('Error fetching property staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/property-staff
 * Create a new staff member and assign to owner's property
 * Requirements: 7.1, 7.4, 10.1
 */
router.post('/', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can create property staff.'
      });
    }

    const { name, email, phone, staffRole, assignedPropertyId, permissions, generatePasswordFlag } = req.body;

    // Validate required fields
    if (!name || !email || !staffRole || !assignedPropertyId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, staff role, and assigned property are required.'
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

    // Verify the property belongs to this owner (Requirement 10.1)
    const property = await Property.findOne({
      where: {
        id: assignedPropertyId,
        owner_id: req.user.id
      }
    });

    if (!property) {
      return res.status(403).json({
        success: false,
        message: 'Property not found or you do not have permission to assign staff to this property.'
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

    // Set requesting user context for validation
    const staffUser = User.build({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      password,
      role: 'user', // Base role is user
      staffRole,
      permissions: staffPermissions,
      assignedPropertyId,
      isVerified: true, // Staff accounts are pre-verified
      isActive: true
    });

    // Set context for validation (Requirement 10.4)
    staffUser.setRequestingUserContext(req.user.id, req.user.getUserType());

    await staffUser.save();

    // Create audit log (Requirement 10.5)
    await createAuditLog(
      req.user.id,
      'create_staff',
      'user',
      staffUser.id,
      {
        after: {
          name: staffUser.name,
          email: staffUser.email,
          staffRole: staffUser.staffRole,
          assignedPropertyId: staffUser.assignedPropertyId,
          permissions: staffUser.permissions
        }
      },
      req
    );

    // Return created user (password will be excluded by toJSON method)
    const response = {
      success: true,
      message: 'Property staff created successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        phone: staffUser.phone,
        staffRole: staffUser.staffRole,
        assignedPropertyId: staffUser.assignedPropertyId,
        permissions: staffUser.permissions,
        isVerified: staffUser.isVerified,
        createdAt: staffUser.createdAt
      }
    };

    // Include generated password in response if it was generated
    if (generatePasswordFlag) {
      response.generatedPassword = password;
      response.message += ' Please save the generated password securely.';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating property staff:', error);
    
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
      message: 'Failed to create property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/property-staff/:id
 * Update a staff member's details
 * Requirements: 7.1, 7.4, 10.1, 10.2
 */
router.put('/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can update property staff.'
      });
    }

    const { id } = req.params;
    const { name, email, phone, staffRole, assignedPropertyId, permissions } = req.body;

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

    // Verify the staff is assigned to one of the owner's properties
    if (staffUser.assignedPropertyId) {
      const property = await Property.findOne({
        where: {
          id: staffUser.assignedPropertyId,
          owner_id: req.user.id
        }
      });

      if (!property) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this staff member.'
        });
      }
    }

    // Store old values for audit log
    const oldValues = {
      name: staffUser.name,
      email: staffUser.email,
      phone: staffUser.phone,
      staffRole: staffUser.staffRole,
      assignedPropertyId: staffUser.assignedPropertyId,
      permissions: staffUser.permissions
    };

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

    // If changing assigned property, verify new property belongs to owner (Requirement 10.1)
    if (assignedPropertyId && assignedPropertyId !== staffUser.assignedPropertyId) {
      const newProperty = await Property.findOne({
        where: {
          id: assignedPropertyId,
          owner_id: req.user.id
        }
      });

      if (!newProperty) {
        return res.status(403).json({
          success: false,
          message: 'Property not found or you do not have permission to assign staff to this property.'
        });
      }

      staffUser.assignedPropertyId = assignedPropertyId;
    }

    if (permissions) {
      staffUser.permissions = permissions;
    }

    // Set context for validation (Requirement 10.2)
    staffUser.setRequestingUserContext(req.user.id, req.user.getUserType());

    await staffUser.save();

    // Create audit log (Requirement 10.5)
    await createAuditLog(
      req.user.id,
      'update_staff',
      'user',
      staffUser.id,
      {
        before: oldValues,
        after: {
          name: staffUser.name,
          email: staffUser.email,
          phone: staffUser.phone,
          staffRole: staffUser.staffRole,
          assignedPropertyId: staffUser.assignedPropertyId,
          permissions: staffUser.permissions
        }
      },
      req
    );

    res.json({
      success: true,
      message: 'Property staff updated successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        phone: staffUser.phone,
        staffRole: staffUser.staffRole,
        assignedPropertyId: staffUser.assignedPropertyId,
        permissions: staffUser.permissions,
        updatedAt: staffUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating property staff:', error);
    
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
      message: 'Failed to update property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/property-staff/:id/deactivate
 * Deactivate a staff member (immediate access revocation)
 * Requirements: 10.3
 */
router.put('/:id/deactivate', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can deactivate property staff.'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

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

    // Verify the staff is assigned to one of the owner's properties
    if (staffUser.assignedPropertyId) {
      const property = await Room.findOne({
        where: {
          id: staffUser.assignedPropertyId,
          ownerId: req.user.id
        }
      });

      if (!property) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this staff member.'
        });
      }
    }

    // Check if already deactivated
    if (!staffUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Staff member is already deactivated.'
      });
    }

    // Store old values for audit log
    const oldValues = {
      isActive: staffUser.isActive
    };

    // Deactivate the staff member (Requirement 10.3: immediate access revocation)
    staffUser.isActive = false;
    await staffUser.save();

    // Create audit log (Requirement 10.5)
    await createAuditLog(
      req.user.id,
      'deactivate_staff',
      'user',
      staffUser.id,
      {
        before: oldValues,
        after: {
          isActive: staffUser.isActive,
          reason: reason || 'No reason provided'
        }
      },
      req
    );

    res.json({
      success: true,
      message: 'Property staff deactivated successfully. Access has been revoked immediately.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        isActive: staffUser.isActive,
        updatedAt: staffUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error deactivating property staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/property-staff/:id/reactivate
 * Reactivate a deactivated staff member
 * Requirements: 7.1, 7.4
 */
router.put('/:id/reactivate', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can reactivate property staff.'
      });
    }

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

    // Verify the staff is assigned to one of the owner's properties
    if (staffUser.assignedPropertyId) {
      const property = await Room.findOne({
        where: {
          id: staffUser.assignedPropertyId,
          ownerId: req.user.id
        }
      });

      if (!property) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this staff member.'
        });
      }
    }

    // Check if already active
    if (staffUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Staff member is already active.'
      });
    }

    // Store old values for audit log
    const oldValues = {
      isActive: staffUser.isActive
    };

    // Reactivate the staff member
    staffUser.isActive = true;
    await staffUser.save();

    // Create audit log (Requirement 10.5)
    await createAuditLog(
      req.user.id,
      'reactivate_staff',
      'user',
      staffUser.id,
      {
        before: oldValues,
        after: {
          isActive: staffUser.isActive
        }
      },
      req
    );

    res.json({
      success: true,
      message: 'Property staff reactivated successfully.',
      data: {
        id: staffUser.id,
        name: staffUser.name,
        email: staffUser.email,
        isActive: staffUser.isActive,
        updatedAt: staffUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error reactivating property staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/internal/property-staff/:id
 * Delete a staff member
 * Requirements: 7.1, 7.4
 */
router.delete('/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can delete property staff.'
      });
    }

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

    // Verify the staff is assigned to one of the owner's properties
    if (staffUser.assignedPropertyId) {
      const property = await Room.findOne({
        where: {
          id: staffUser.assignedPropertyId,
          ownerId: req.user.id
        }
      });

      if (!property) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this staff member.'
        });
      }
    }

    // Store values for audit log before deletion
    const deletedValues = {
      id: staffUser.id,
      name: staffUser.name,
      email: staffUser.email,
      staffRole: staffUser.staffRole,
      assignedPropertyId: staffUser.assignedPropertyId
    };

    // Delete the staff user
    await staffUser.destroy();

    // Create audit log (Requirement 10.5)
    await createAuditLog(
      req.user.id,
      'delete_staff',
      'user',
      id,
      {
        before: deletedValues
      },
      req
    );

    res.json({
      success: true,
      message: 'Property staff deleted successfully.',
      data: deletedValues
    });
  } catch (error) {
    console.error('Error deleting property staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property staff.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/property-staff/audit-logs
 * Get audit logs for staff management actions
 * Requirements: 10.5
 */
router.get('/audit-logs', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    // Verify user is a property owner
    if (!req.user.isPropertyOwner()) {
      return res.status(403).json({
        success: false,
        message: 'Only property owners can view staff audit logs.'
      });
    }

    const { staffId, action, startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Get all staff assigned to owner's properties
    const ownedProperties = await Room.findAll({
      where: { ownerId: req.user.id },
      attributes: ['id']
    });

    const ownedPropertyIds = ownedProperties.map(p => p.id);

    if (ownedPropertyIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Get staff IDs for owned properties
    const staffUsers = await User.findAll({
      where: {
        staffRole: {
          [Op.not]: null
        },
        assignedPropertyId: {
          [Op.in]: ownedPropertyIds
        }
      },
      attributes: ['id']
    });

    const staffIds = staffUsers.map(s => s.id);

    // Build where clause for audit logs
    const whereClause = {
      resourceType: 'user',
      resourceId: {
        [Op.in]: staffIds
      },
      action: {
        [Op.in]: ['create_staff', 'update_staff', 'deactivate_staff', 'reactivate_staff', 'delete_staff', 'modify_permissions']
      }
    };

    // Filter by specific staff member if provided
    if (staffId) {
      if (!staffIds.includes(staffId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this staff member\'s audit logs.'
        });
      }
      whereClause.resourceId = staffId;
    }

    // Filter by action if provided
    if (action) {
      whereClause.action = action;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const auditLogs = await AuditLog.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalCount = await AuditLog.count({ where: whereClause });

    res.json({
      success: true,
      count: auditLogs.length,
      total: totalCount,
      data: auditLogs
    });
  } catch (error) {
    console.error('Error fetching staff audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff audit logs.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
