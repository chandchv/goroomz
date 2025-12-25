const express = require('express');
const router = express.Router();
const { User, Property, Room, Booking, sequelize } = require('../../../models');
const { protectInternal, requirePlatformRole } = require('../../../middleware/internalAuth');
const { auditLog } = require('../../../middleware/auditLog');
const { sendEmail } = require('../../../utils/emailService');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Platform Property Owner Management Routes
 * For managing property owners across the platform
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * These routes are accessible only to platform staff (users with internalRole)
 * Property owners attempting to access these routes will receive 403 Forbidden
 */

/**
 * GET /api/internal/platform/owners
 * Get all property owners
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/',
  protectInternal,
  requirePlatformRole(),
  async (req, res) => {
    try {
      const { 
        search, 
        status, 
        role,
        city,
        state,
        page = 1, 
        limit = 50 
      } = req.query;

      // Build where clause
      const whereClause = {
        role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
      };

      // Search by name or email
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Filter by verification status
      if (status === 'active') {
        whereClause.isVerified = true;
      } else if (status === 'inactive') {
        whereClause.isVerified = false;
      }

      // Filter by specific role
      if (role && ['owner', 'category_owner', 'admin'].includes(role)) {
        whereClause.role = role;
      }

      // Filter by city
      if (city) {
        whereClause.city = { [Op.iLike]: `%${city}%` };
      }

      // Filter by state
      if (state) {
        whereClause.state = { [Op.iLike]: `%${state}%` };
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Fetch property owners
      const { count, rows: owners } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 'name', 'email', 'phone', 'role', 
          'isVerified', 'isActive', 'city', 'state', 
          'createdAt', 'lastLoginAt'
        ],
        include: [
          {
            model: Room,
            as: 'ownedRooms',
            attributes: ['id', 'title', 'category', 'isActive', 'currentStatus'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      // Calculate statistics for each owner
      const ownersWithStats = owners.map(owner => {
        const ownerData = owner.toJSON();
        const properties = ownerData.ownedRooms || [];
        
        ownerData.statistics = {
          totalProperties: properties.length,
          activeProperties: properties.filter(p => p.isActive).length,
          occupiedRooms: properties.filter(p => p.currentStatus === 'occupied').length
        };

        // Transform ownedRooms to properties for frontend compatibility
        ownerData.properties = properties.map(room => ({
          id: room.id,
          name: room.title,
          type: room.category === 'PG' ? 'pg' : room.category === 'Hotel Room' ? 'hotel' : 'hostel',
          status: room.isActive ? 'active' : 'inactive'
        }));

        delete ownerData.ownedRooms;
        return ownerData;
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: ownersWithStats
      });
    } catch (error) {
      console.error('Error fetching property owners:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property owners',
        error: error.message
      });
    }
  }
);

/**
 * POST /api/internal/platform/owners
 * Create new property owner
 * Requirements: 6.1, 6.2, 6.3
 */
router.post('/',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  auditLog('create_property_owner', 'user'),
  async (req, res) => {
    try {
      const { 
        name, 
        email, 
        phone, 
        role = 'owner',
        address,
        city,
        state,
        country,
        pincode,
        sendCredentials = true 
      } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Validate role
      if (!['owner', 'category_owner', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be owner, category_owner, or admin'
        });
      }

      // Check if user already exists with this email
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Check if user already exists with this phone number
      if (phone) {
        const existingPhoneUser = await User.findOne({ where: { phone: phone.trim() } });
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            message: 'User with this phone number already exists'
          });
        }
      }

      // Generate random password
      const generatedPassword = crypto.randomBytes(8).toString('hex');

      // Create property owner
      const propertyOwner = await User.create({
        name,
        email,
        phone,
        role,
        password: generatedPassword,
        address,
        city,
        state,
        country,
        pincode,
        isVerified: true,
        isActive: true
      });

      // Send credentials email if requested
      if (sendCredentials) {
        try {
          await sendEmail({
            to: email,
            subject: 'Welcome to GoRoomz - Your Account Credentials',
            html: `
              <h2>Welcome to GoRoomz</h2>
              <p>Hello ${name},</p>
              <p>Your property owner account has been created successfully.</p>
              <p><strong>Login Credentials:</strong></p>
              <p>Email: ${email}<br>Password: ${generatedPassword}</p>
              <p>Please login and change your password immediately.</p>
              <p>Best regards,<br>GoRoomz Team</p>
            `
          });
        } catch (emailError) {
          console.error('Error sending credentials email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Property owner created successfully',
        data: {
          propertyOwner: {
            id: propertyOwner.id,
            name: propertyOwner.name,
            email: propertyOwner.email,
            phone: propertyOwner.phone,
            role: propertyOwner.role
          },
          credentials: sendCredentials ? {
            email,
            password: generatedPassword
          } : undefined
        }
      });
    } catch (error) {
      console.error('Error creating property owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create property owner',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/owners/:id
 * Get property owner details
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/:id',
  protectInternal,
  requirePlatformRole(),
  async (req, res) => {
    try {
      const { id } = req.params;

      const propertyOwner = await User.findOne({
        where: {
          id,
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        },
        attributes: { exclude: ['password', 'verificationToken', 'passwordResetToken'] },
        include: [
          {
            model: Room,
            as: 'ownedRooms',
            attributes: ['id', 'title', 'category', 'roomType', 'price', 'location', 'isActive', 'currentStatus', 'created_at'],
            include: [
              {
                model: Booking,
                as: 'bookings',
                attributes: ['id', 'status', 'totalAmount', 'checkInDate', 'checkOutDate'],
                required: false
              }
            ]
          }
        ]
      });

      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      const ownerData = propertyOwner.toJSON();
      const rooms = ownerData.ownedRooms || [];

      // Transform ownedRooms to properties format
      ownerData.properties = rooms.map(room => ({
        id: room.id,
        name: room.title,
        type: room.category === 'PG' ? 'pg' : room.category === 'Hotel Room' ? 'hotel' : 'hostel',
        address: room.location?.address || '',
        city: room.location?.city || '',
        state: room.location?.state || '',
        status: room.isActive ? 'active' : 'inactive',
        currentStatus: room.currentStatus,
        price: room.price,
        createdAt: room.created_at,
        bookings: room.bookings || []
      }));

      // Calculate comprehensive statistics
      const allBookings = rooms.flatMap(r => r.bookings || []);
      ownerData.statistics = {
        totalProperties: rooms.length,
        activeProperties: rooms.filter(p => p.isActive).length,
        totalRooms: rooms.length,
        occupiedRooms: rooms.filter(r => r.currentStatus === 'occupied').length,
        totalBookings: allBookings.length,
        activeBookings: allBookings.filter(b => b.status === 'active').length,
        completedBookings: allBookings.filter(b => b.status === 'completed').length,
        totalRevenue: allBookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
      };

      delete ownerData.ownedRooms;

      res.json({
        success: true,
        data: ownerData
      });
    } catch (error) {
      console.error('Error fetching property owner details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property owner details',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/owners/:id
 * Update property owner
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  auditLog('update_property_owner', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        name, 
        email, 
        phone, 
        role,
        address,
        city,
        state,
        country,
        pincode
      } = req.body;

      const propertyOwner = await User.findOne({
        where: {
          id,
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        }
      });

      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      // Check if email is being changed and if it's already in use
      if (email && email !== propertyOwner.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use'
          });
        }
      }

      // Check if phone is being changed and if it's already in use
      if (phone !== undefined && phone !== propertyOwner.phone) {
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
              message: 'Phone number is already in use'
            });
          }
        }
      }

      // Validate role if being changed
      if (role && !['owner', 'category_owner', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be owner, category_owner, or admin'
        });
      }

      // Update fields
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (country) updateData.country = country;
      if (pincode) updateData.pincode = pincode;

      await propertyOwner.update(updateData);

      res.json({
        success: true,
        message: 'Property owner updated successfully',
        data: {
          id: propertyOwner.id,
          name: propertyOwner.name,
          email: propertyOwner.email,
          phone: propertyOwner.phone,
          role: propertyOwner.role
        }
      });
    } catch (error) {
      console.error('Error updating property owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update property owner',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/owners/:id/deactivate
 * Deactivate property owner account
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/deactivate',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin'),
  auditLog('deactivate_property_owner', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const propertyOwner = await User.findOne({
        where: {
          id,
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        }
      });

      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      // Deactivate owner account
      await propertyOwner.update({
        isVerified: false,
        isActive: false
      });

      // Deactivate all their properties
      await Property.update(
        { is_active: false },
        { where: { owner_id: id } }
      );

      // Send notification email
      try {
        await sendEmail({
          to: propertyOwner.email,
          subject: 'Account Deactivation Notice',
          html: `
            <h2>Account Deactivation</h2>
            <p>Hello ${propertyOwner.name},</p>
            <p>Your property owner account has been deactivated.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is an error, please contact support.</p>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending deactivation email:', emailError);
      }

      res.json({
        success: true,
        message: 'Property owner deactivated successfully',
        data: {
          id: propertyOwner.id,
          name: propertyOwner.name,
          email: propertyOwner.email,
          isActive: false
        }
      });
    } catch (error) {
      console.error('Error deactivating property owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate property owner',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/owners/:id/activate
 * Reactivate property owner account
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/activate',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin'),
  auditLog('activate_property_owner', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const propertyOwner = await User.findOne({
        where: {
          id,
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        }
      });

      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      // Reactivate owner account
      await propertyOwner.update({
        isVerified: true,
        isActive: true
      });

      // Send notification email
      try {
        await sendEmail({
          to: propertyOwner.email,
          subject: 'Account Reactivation Notice',
          html: `
            <h2>Account Reactivation</h2>
            <p>Hello ${propertyOwner.name},</p>
            <p>Your property owner account has been reactivated.</p>
            <p>You can now login and manage your properties.</p>
            <p>Best regards,<br>GoRoomz Team</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending reactivation email:', emailError);
      }

      res.json({
        success: true,
        message: 'Property owner activated successfully',
        data: {
          id: propertyOwner.id,
          name: propertyOwner.name,
          email: propertyOwner.email,
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error activating property owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate property owner',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/owners/statistics/overview
 * Get platform-wide owner statistics
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/statistics/overview',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  async (req, res) => {
    try {
      // Get total owners
      const totalOwners = await User.count({
        where: {
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        }
      });

      // Get active owners
      const activeOwners = await User.count({
        where: {
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] },
          isVerified: true,
          isActive: true
        }
      });

      // Get owners by role
      const ownersByRole = await User.findAll({
        where: {
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] }
        },
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['role']
      });

      // Get owners by state
      const ownersByState = await User.findAll({
        where: {
          role: { [Op.in]: ['owner', 'category_owner', 'admin'] },
          state: { [Op.ne]: null }
        },
        attributes: [
          'state',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['state'],
        limit: 10,
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
      });

      res.json({
        success: true,
        data: {
          totalOwners,
          activeOwners,
          inactiveOwners: totalOwners - activeOwners,
          ownersByRole: ownersByRole.map(o => ({
            role: o.role,
            count: parseInt(o.dataValues.count)
          })),
          ownersByState: ownersByState.map(o => ({
            state: o.state,
            count: parseInt(o.dataValues.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching owner statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch owner statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
