const express = require('express');
const router = express.Router();
const { Property, Room, User, Booking, Category, sequelize } = require('../../../models');
const { protectInternal, requirePlatformRole } = require('../../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../../middleware/dataScoping');
const { auditLog } = require('../../../middleware/auditLog');
const { Op } = require('sequelize');

/**
 * Platform Properties Routes
 * All-properties view for platform staff only
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * These routes are accessible only to platform staff (users with internalRole)
 * Property owners attempting to access these routes will receive 403 Forbidden
 * 
 * NOTE: Uses Property model (not Room model)
 */

/**
 * GET /api/internal/platform/properties
 * Get all properties across all owners (platform staff view)
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/',
  protectInternal,
  requirePlatformRole(),
  applyScopingMiddleware,
  async (req, res) => {
    try {
      console.log('🔍 Platform properties - User:', req.user.email, 'Role:', req.user.internalRole);
      console.log('🔍 Data scope:', JSON.stringify(req.dataScope, null, 2));
      
      const { 
        search, 
        ownerId, 
        category, 
        status, 
        city, 
        state,
        page = 1, 
        limit = 50 
      } = req.query;

      // Build where clause
      let whereClause = {};

      // Apply data scoping (will filter by territory for regional managers, etc.)
      whereClause = applyScopeToWhere(req.dataScope, whereClause, 'id');
      console.log('🔍 Where clause after scoping:', JSON.stringify(whereClause, null, 2));

      // Search by name or location
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          sequelize.where(
            sequelize.cast(sequelize.col('Property.location'), 'text'),
            { [Op.iLike]: `%${search}%` }
          )
        ];
      }

      // Filter by owner
      if (ownerId) {
        whereClause.ownerId = ownerId;
      }

      // Filter by category (categoryId)
      if (category) {
        whereClause.categoryId = category;
      }

      // Filter by status
      if (status === 'active') {
        whereClause.isActive = true;
      } else if (status === 'inactive') {
        whereClause.isActive = false;
      }

      // Filter by city
      if (city) {
        whereClause['location.city'] = { [Op.iLike]: `%${city}%` };
      }

      // Filter by state
      if (state) {
        whereClause['location.state'] = { [Op.iLike]: `%${state}%` };
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Check if properties table has data, otherwise fall back to rooms table
      const propertiesCount = await Property.count();
      let properties, count;

      if (propertiesCount > 0) {
        // Use properties table (new structure)
        const result = await Property.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'email', 'phone', 'role']
            },
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'description'],
              required: false
            },
            {
              model: Room,
              as: 'rooms',
              attributes: ['id'], // roomNumber, currentStatus don't exist yet
              required: false
            }
          ],
          order: [[sequelize.col('created_at'), 'DESC']],

          limit: parseInt(limit),
          offset,
          distinct: true
        });
        properties = result.rows;
        count = result.count;
      } else {
        // Fallback: Use rooms table where property_id IS NULL (old structure)
        console.log('⚠️  Using rooms table fallback - properties table is empty');
        whereClause.propertyId = null; // Only get properties, not child rooms
        
        const result = await Room.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'name', 'email', 'phone', 'role']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset,
          distinct: true
        });
        properties = result.rows;
        count = result.count;
      }

      // Calculate statistics for each property
      const propertiesWithStats = properties.map(property => {
        const propertyData = property.toJSON();
        const rooms = propertyData.rooms || [];
        
        propertyData.statistics = {
          totalRooms: rooms.length,
          occupiedRooms: rooms.filter(r => r.currentStatus === 'occupied').length,
          vacantCleanRooms: rooms.filter(r => r.currentStatus === 'vacant_clean').length,
          vacantDirtyRooms: rooms.filter(r => r.currentStatus === 'vacant_dirty').length
        };

        // Remove rooms array to reduce payload size
        delete propertyData.rooms;

        return propertyData;
      });

      res.json({
        success: true,
        count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        data: propertiesWithStats
      });
    } catch (error) {
      console.error('Error fetching platform properties:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch properties',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/properties/:id
 * Get detailed property information (platform staff view)
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/:id',
  protectInternal,
  requirePlatformRole(),
  applyScopingMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Build where clause with scoping
      let whereClause = { id };
      whereClause = applyScopeToWhere(req.dataScope, whereClause, 'id');

      const property = await Property.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone', 'role', 'isVerified'],
            required: false
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description'],
            required: false
          },
          {
            model: Room,
            as: 'rooms',
            attributes: ['id', 'room_number', 'floor_number', 'current_status', 'price', 'sharing_type', 'total_beds'],
            required: false,
            include: [
              {
                model: Booking,
                as: 'bookings',
                attributes: ['id', 'status', 'total_amount'],
                required: false
              }
            ]
          }
        ]
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      const propertyData = property.toJSON();
      const rooms = propertyData.rooms || [];

      // Calculate comprehensive statistics
      const allBookings = rooms.flatMap(room => room.bookings || []);
      propertyData.statistics = {
        totalRooms: rooms.length,
        occupiedRooms: rooms.filter(r => r.currentStatus === 'occupied').length,
        vacantCleanRooms: rooms.filter(r => r.currentStatus === 'vacant_clean').length,
        vacantDirtyRooms: rooms.filter(r => r.currentStatus === 'vacant_dirty').length,
        totalBookings: allBookings.length,
        activeBookings: allBookings.filter(b => b.status === 'active').length,
        completedBookings: allBookings.filter(b => b.status === 'completed').length,
        totalRevenue: allBookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0)
      };

      // Clean up nested bookings from rooms to reduce payload
      propertyData.rooms = rooms.map(room => {
        const { bookings, ...roomData } = room;
        return roomData;
      });

      res.json({
        success: true,
        data: propertyData
      });
    } catch (error) {
      console.error('Error fetching property details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property details',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/internal/platform/properties/statistics/overview
 * Get platform-wide property statistics
 * Requirements: 6.1, 6.2, 6.3
 */
router.get('/statistics/overview',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  applyScopingMiddleware,
  async (req, res) => {
    try {
      // Build where clause with scoping
      let whereClause = {};
      whereClause = applyScopeToWhere(req.dataScope, whereClause, 'id');

      // Get total properties
      const totalProperties = await Property.count({
        where: whereClause,
        distinct: true,
        col: 'id'
      });

      // Get active properties
      const activeProperties = await Property.count({
        where: {
          ...whereClause,
          isActive: true
        }
      });

      // Get properties by type
      const propertiesByType = await Property.findAll({
        where: whereClause,
        attributes: [
          'type',
          [sequelize.fn('COUNT', sequelize.col('Property.id')), 'count']
        ],
        group: ['type']
      });

      // Get properties by category
      const propertiesByCategory = await Property.findAll({
        where: whereClause,
        attributes: [
          'categoryId',
          [sequelize.fn('COUNT', sequelize.col('Property.id')), 'count']
        ],
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['name']
          }
        ],
        group: ['categoryId', 'category.id', 'category.name']
      });

      // Get properties by state
      const propertiesByState = await Property.findAll({
        where: whereClause,
        attributes: [
          [sequelize.literal("location->>'state'"), 'state'],
          [sequelize.fn('COUNT', sequelize.col('Property.id')), 'count']
        ],
        group: [sequelize.literal("location->>'state'")],
        limit: 10,
        order: [[sequelize.fn('COUNT', sequelize.col('Property.id')), 'DESC']]
      });

      // Get room and booking statistics
      const properties = await Property.findAll({
        where: whereClause,
        attributes: ['id'],
        include: [
          {
            model: Room,
            as: 'rooms',
            attributes: ['id', 'current_status'],
            include: [
              {
                model: Booking,
                as: 'bookings',
                attributes: ['id', 'status', 'total_amount']
              }
            ]
          }
        ]
      });

      const allRooms = properties.flatMap(p => p.rooms || []);
      const allBookings = allRooms.flatMap(r => r.bookings || []);
      const totalRevenue = allBookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

      res.json({
        success: true,
        data: {
          totalProperties,
          activeProperties,
          inactiveProperties: totalProperties - activeProperties,
          propertiesByType: propertiesByType.map(p => ({
            type: p.type,
            count: parseInt(p.dataValues.count)
          })),
          propertiesByCategory: propertiesByCategory.map(p => ({
            categoryId: p.categoryId,
            categoryName: p.category?.name || 'Unknown',
            count: parseInt(p.dataValues.count)
          })),
          propertiesByState: propertiesByState.map(p => ({
            state: p.dataValues.state,
            count: parseInt(p.dataValues.count)
          })),
          roomStatistics: {
            totalRooms: allRooms.length,
            occupiedRooms: allRooms.filter(r => r.currentStatus === 'occupied').length,
            vacantCleanRooms: allRooms.filter(r => r.currentStatus === 'vacant_clean').length,
            vacantDirtyRooms: allRooms.filter(r => r.currentStatus === 'vacant_dirty').length
          },
          bookingStatistics: {
            totalBookings: allBookings.length,
            activeBookings: allBookings.filter(b => b.status === 'active').length,
            completedBookings: allBookings.filter(b => b.status === 'completed').length,
            totalRevenue: parseFloat(totalRevenue.toFixed(2))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching platform statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform statistics',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/properties/:id/status
 * Update property status (activate/deactivate)
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/status',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin', 'operations_manager'),
  applyScopingMiddleware,
  auditLog('update_property_status', 'property'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }

      // Build where clause with scoping
      let whereClause = { id };
      whereClause = applyScopeToWhere(req.dataScope, whereClause, 'id');

      const property = await Property.findOne({ where: whereClause });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      await property.update({ isActive });

      // Log the reason if provided
      if (reason) {
        console.log(`Property ${id} (${property.name}) status changed to ${isActive ? 'active' : 'inactive'} by ${req.user.name}. Reason: ${reason}`);
      }

      res.json({
        success: true,
        message: `Property ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: property
      });
    } catch (error) {
      console.error('Error updating property status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update property status',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/internal/platform/properties/:id/owner
 * Change property owner
 * Requirements: 6.1, 6.2, 6.3
 */
router.put('/:id/owner',
  protectInternal,
  requirePlatformRole('superuser', 'platform_admin'),
  applyScopingMiddleware,
  auditLog('change_property_owner', 'property'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newOwnerId, reason } = req.body;

      if (!newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'newOwnerId is required'
        });
      }

      // Build where clause with scoping
      let whereClause = { id };
      whereClause = applyScopeToWhere(req.dataScope, whereClause, 'id');

      const property = await Property.findOne({ 
        where: whereClause,
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }]
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      // Verify new owner exists and has appropriate role
      const newOwner = await User.findOne({
        where: {
          id: newOwnerId,
          role: { [Op.in]: ['owner', 'admin'] }
        }
      });

      if (!newOwner) {
        return res.status(404).json({
          success: false,
          message: 'New owner not found or does not have owner/admin role'
        });
      }

      const oldOwnerId = property.ownerId;
      const oldOwnerName = property.owner?.name || 'Unknown';

      // Update property owner
      await property.update({ ownerId: newOwnerId });

      // Log the change
      console.log(`Property ${id} (${property.name}) owner changed from ${oldOwnerName} (${oldOwnerId}) to ${newOwner.name} (${newOwnerId}) by ${req.user.name}. Reason: ${reason || 'Not provided'}`);

      // Fetch updated property with new owner details
      const updatedProperty = await Property.findOne({
        where: { id },
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }]
      });

      res.json({
        success: true,
        message: 'Property owner changed successfully',
        data: updatedProperty,
        changes: {
          oldOwner: {
            id: oldOwnerId,
            name: oldOwnerName
          },
          newOwner: {
            id: newOwner.id,
            name: newOwner.name,
            email: newOwner.email
          }
        }
      });
    } catch (error) {
      console.error('Error changing property owner:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change property owner',
        error: error.message
      });
    }
  }
);

module.exports = router;
