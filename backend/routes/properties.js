const express = require('express');
const { Property, Room, User, Category } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const router = express.Router();

// @desc    Create property with optional rooms (for property owners from frontend)
// @route   POST /api/properties
// @access  Private (Owner/Admin)
router.post('/', protect, authorize('owner', 'admin'), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      description,
      type,
      categoryId,
      location,
      contactInfo,
      amenities = [],
      images = [],
      rules = [],
      totalFloors = 1,
      checkInTime,
      checkOutTime,
      // Room data (optional - for single-room properties)
      createRoom = false,
      roomData
    } = req.body;

    // Validate required fields
    if (!name || !type || !categoryId || !location) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, categoryId, location'
      });
    }

    // Validate location structure
    if (!location.address || !location.city || !location.state) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Location must include address, city, and state'
      });
    }

    // Check if category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Create property
    const property = await Property.create({
      name,
      description,
      type,
      categoryId,
      ownerId: req.user.id,
      location,
      contactInfo,
      amenities,
      images,
      rules,
      totalFloors,
      checkInTime,
      checkOutTime,
      approvalStatus: 'pending', // Requires admin approval
      isActive: true
    }, { transaction });

    // If createRoom is true and roomData is provided, create a room
    let room = null;
    if (createRoom && roomData) {
      room = await Room.create({
        propertyId: property.id,
        title: roomData.title || name,
        description: roomData.description || description,
        price: roomData.price || 0,
        maxGuests: roomData.maxGuests || 1,
        category: roomData.category,
        roomType: roomData.roomType,
        pricingType: roomData.pricingType,
        location,
        amenities: roomData.amenities || amenities,
        rules: roomData.rules || rules,
        images: roomData.images || images,
        approvalStatus: 'pending',
        isActive: true,
        // Internal management fields
        roomNumber: roomData.roomNumber || '1',
        floorNumber: roomData.floorNumber || 1,
        sharingType: roomData.sharingType || 'single',
        totalBeds: roomData.totalBeds || 1,
        currentStatus: 'vacant_clean',
        // Store category-specific data in metadata field
        metadata: {
          pgOptions: roomData.pgOptions || null,
          hotelRoomTypes: roomData.hotelRoomTypes || [],
          hotelPrices: roomData.hotelPrices || null,
          propertyDetails: roomData.propertyDetails || null
        }
      }, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Property created successfully and pending approval',
      data: {
        property,
        room
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: error.message
    });
  }
});

// @desc    Get all properties (public - approved only)
// @route   GET /api/properties
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    let whereClause = {
      isActive: true,
      approvalStatus: 'approved'
    };

    // Filters
    if (req.query.type) {
      whereClause.type = req.query.type;
    }

    if (req.query.city) {
      whereClause['location.city'] = { [Op.iLike]: `%${req.query.city}%` };
    }

    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { 'location.city': { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    if (req.query.featured === 'true') {
      whereClause.isFeatured = true;
    }

    // Sort
    let orderClause = [['createdAt', 'DESC']];
    if (req.query.sort === 'rating') {
      orderClause = [[sequelize.literal('"rating"->\'average\''), 'DESC']];
    } else if (req.query.sort === 'newest') {
      orderClause = [['createdAt', 'DESC']];
    }

    const properties = await Property.findAll({
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
      ],
      order: orderClause,
      offset,
      limit
    });

    const total = await Property.count({ where: whereClause });

    res.json({
      success: true,
      count: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties'
    });
  }
});

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
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
        },
        {
          model: Room,
          as: 'rooms',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property'
    });
  }
});

// @desc    Get owner's properties
// @route   GET /api/properties/owner/my-properties
// @access  Private (Owner/Admin)
router.get('/owner/my-properties', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { ownerId: req.user.id },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Room,
          as: 'rooms',
          attributes: ['id', 'title', 'price', 'isActive', 'approvalStatus']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your properties'
    });
  }
});

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this property'
      });
    }

    await property.update(req.body);

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property',
      error: error.message
    });
  }
});

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner/Admin)
router.delete('/:id', protect, authorize('owner', 'admin'), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check ownership
    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this property'
      });
    }

    // Delete associated rooms
    await Room.destroy({
      where: { propertyId: property.id },
      transaction
    });

    // Delete property
    await property.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Property and associated rooms deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting property'
    });
  }
});

module.exports = router;
