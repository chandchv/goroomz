const express = require('express');
const router = express.Router();
const { Property, Room, User, Category, sequelize } = require('../../models');
const { protectInternal } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');
const { Op } = require('sequelize');

/**
 * Internal Properties Routes
 * Property management for property owners and staff
 * Requirements: Property owners can view/manage their own properties
 */

/**
 * GET /api/internal/properties
 * Get properties accessible to the current user
 * - Property owners: Only their own properties
 * - Platform staff: All properties (with scoping)
 */
router.get('/',
  protectInternal,
  applyScopingMiddleware,
  async (req, res) => {
    try {
      const { search, status, category, limit = 50, offset = 0 } = req.query;

      // Build base where clause
      const whereClause = {};

      // Apply search filter
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Apply status filter
      if (status) {
        if (status === 'active') {
          whereClause.isActive = true;
        } else if (status === 'inactive') {
          whereClause.isActive = false;
        }
      }

      // Apply category filter
      if (category) {
        whereClause.type = category;
      }

      // Apply data scoping based on user type
      let scopedWhere = whereClause;
      
      if (req.user.role === 'owner' || req.user.role === 'category_owner') {
        // Property owners can only see their own properties
        scopedWhere = {
          ...whereClause,
          ownerId: req.user.id
        };
      } else if (req.user.internalRole) {
        // Platform staff use data scoping middleware
        scopedWhere = applyScopeToWhere(req.dataScope, whereClause, 'ownerId');
      } else {
        // Other users have no access
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Get properties with related data
      const properties = await Property.findAll({
        where: scopedWhere,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Calculate statistics for each property
      const propertiesWithStats = await Promise.all(
        properties.map(async (property) => {
          // Get room statistics
          const roomStats = await Room.aggregate('id', 'count', {
            where: { propertyId: property.id },
            group: ['currentStatus']
          });

          const totalRooms = await Room.count({
            where: { propertyId: property.id, isActive: true }
          });

          const occupiedRooms = await Room.count({
            where: { 
              propertyId: property.id, 
              isActive: true,
              currentStatus: 'occupied'
            }
          });

          const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

          return {
            id: property.id,
            name: property.name,
            description: property.description,
            type: property.type,
            location: property.location,
            amenities: property.amenities,
            rules: property.rules,
            isActive: property.isActive,
            owner: property.owner ? {
              id: property.owner.id,
              name: property.owner.name,
              email: property.owner.email,
              phone: property.owner.phone
            } : null,
            category: property.category ? {
              id: property.category.id,
              name: property.category.name,
              description: property.category.description
            } : null,
            statistics: {
              totalRooms,
              occupiedRooms,
              occupancyRate: Math.round(occupancyRate * 100) / 100
            },
            createdAt: property.created_at,
            updatedAt: property.updated_at
          };
        })
      );

      // Get total count for pagination
      const totalCount = await Property.count({ where: scopedWhere });

      res.json({
        success: true,
        data: propertiesWithStats,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + propertiesWithStats.length < totalCount
        }
      });

    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch properties',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/internal/properties/:id
 * Get a specific property by ID
 */
router.get('/:id',
  protectInternal,
  applyScopingMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Build where clause with scoping
      let whereClause = { id };
      
      if (req.user.role === 'owner' || req.user.role === 'category_owner') {
        // Property owners can only see their own properties
        whereClause.ownerId = req.user.id;
      } else if (req.user.internalRole) {
        // Platform staff use data scoping
        whereClause = applyScopeToWhere(req.dataScope, whereClause, 'ownerId');
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      const property = await Property.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'description']
          }
        ]
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      // Get detailed room statistics
      const roomStats = await Room.findAll({
        where: { propertyId: property.id },
        attributes: [
          'currentStatus',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['currentStatus'],
        raw: true
      });

      const totalRooms = await Room.count({
        where: { propertyId: property.id, isActive: true }
      });

      res.json({
        success: true,
        data: {
          id: property.id,
          name: property.name,
          description: property.description,
          type: property.type,
          location: property.location,
          amenities: property.amenities,
          rules: property.rules,
          isActive: property.isActive,
          owner: property.owner ? {
            id: property.owner.id,
            name: property.owner.name,
            email: property.owner.email,
            phone: property.owner.phone
          } : null,
          category: property.category ? {
            id: property.category.id,
            name: property.category.name,
            description: property.category.description
          } : null,
          roomStatistics: {
            total: totalRooms,
            byStatus: roomStats.reduce((acc, stat) => {
              acc[stat.currentStatus] = parseInt(stat.count);
              return acc;
            }, {})
          },
          createdAt: property.created_at,
          updatedAt: property.updated_at
        }
      });

    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch property',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;