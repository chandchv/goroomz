const express = require('express');
const { Room, User } = require('../models');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { 
  validateRoom, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const { Op } = require('sequelize');

const router = express.Router();

// @desc    Get all rooms with filtering and pagination
// @route   GET /api/rooms
// @access  Public
router.get('/', optionalAuth, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Build filter object using Sequelize syntax
    let whereClause = { 
      isActive: true,
      approvalStatus: 'approved' // Only show approved rooms
    };
    
    if (req.query.category) {
      whereClause.category = req.query.category;
    }
    
    if (req.query.roomType) {
      whereClause.roomType = req.query.roomType;
    }
    
    if (req.query.city) {
      whereClause['location.city'] = { [Op.iLike]: `%${req.query.city}%` };
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      whereClause.price = {};
      if (req.query.minPrice) whereClause.price[Op.gte] = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) whereClause.price[Op.lte] = parseFloat(req.query.maxPrice);
    }
    
    if (req.query.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { 'location.city': { [Op.iLike]: `%${req.query.search}%` } },
        { 'location.address': { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    // Area filter
    if (req.query.area) {
      whereClause[Op.or] = [
        { 'location.city': { [Op.iLike]: `%${req.query.area}%` } },
        { 'location.address': { [Op.iLike]: `%${req.query.area}%` } }
      ];
    }

    // Amenities filter
    if (req.query.amenities) {
      const amenities = req.query.amenities.split(',');
      whereClause.amenities = { [Op.contains]: amenities };
    }

    // Guests filter
    if (req.query.minGuests) {
      whereClause.maxGuests = { [Op.gte]: parseInt(req.query.minGuests) };
    }

    // Featured filter
    if (req.query.featured === 'true') {
      whereClause.featured = true;
    }

    // Owner filter
    if (req.query.owner === 'me' && req.user) {
      whereClause.ownerId = req.user.id;
    }

    // Build sort object
    let orderClause = [['created_at', 'DESC']];
    if (req.query.sort || req.query.sortBy) {
      const sortValue = req.query.sort || req.query.sortBy;
      switch (sortValue) {
        case 'priceAsc':
        case 'price-asc':
          orderClause = [['price', 'ASC']];
          break;
        case 'priceDesc':
        case 'price-desc':
          orderClause = [['price', 'DESC']];
          break;
        case 'rating':
          // Note: This assumes rating is stored as a JSON field
          orderClause = [['rating', 'DESC']];
          break;
        case 'newest':
          orderClause = [['created_at', 'DESC']];
          break;
        case 'featured':
              orderClause = [['featured', 'DESC'], ['created_at', 'DESC']];
          break;
        default:
          orderClause = [['created_at', 'DESC']];
      }
    }

    const rooms = await Room.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['name', 'email', 'phone']
      }],
      order: orderClause,
      offset: offset,
      limit: parseInt(limit)
    });

    const total = await Room.count({ where: whereClause });

    res.json({
      success: true,
      count: rooms.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rooms'
    });
  }
});

// @desc    Get rooms pending approval (Admin only)
// @route   GET /api/rooms/pending
// @access  Private (Admin)
router.get('/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { approvalStatus: 'pending' },
      include: [{
        model: User,
        as: 'categoryOwner',
        attributes: ['name', 'email', 'phone']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get pending rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending rooms'
    });
  }
});

// @desc    Get owner's rooms
// @route   GET /api/rooms/owner/my-rooms
// @access  Private (Owner/Admin)
router.get('/owner/my-rooms', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { 
        ownerId: req.user.id
      },
      include: [{
        model: User,
        as: 'owner',
        attributes: ['name', 'email', 'phone']
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get my rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your rooms'
    });
  }
});

// @desc    Get owner statistics
// @route   GET /api/rooms/owner/stats
// @access  Private (Owner/Admin)
router.get('/owner/stats', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const totalProperties = await Room.count({ where: { ownerId: req.user.id } });
    const activeProperties = await Room.count({ 
      where: { 
        ownerId: req.user.id, 
        isActive: true 
      } 
    });
    const approvedProperties = await Room.count({ 
      where: { 
        ownerId: req.user.id, 
        approvalStatus: 'approved' 
      } 
    });
    const pendingProperties = await Room.count({ 
      where: { 
        ownerId: req.user.id, 
        approvalStatus: 'pending' 
      } 
    });

    res.json({
      success: true,
      data: {
        totalProperties,
        activeProperties,
        approvedProperties,
        pendingProperties
      }
    });
  } catch (error) {
    console.error('Get owner stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching owner statistics'
    });
  }
});

// @desc    Get admin statistics
// @route   GET /api/rooms/admin/stats
// @access  Private (Admin)
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const totalRooms = await Room.count();
    const approvedRooms = await Room.count({ where: { approvalStatus: 'approved' } });
    const pendingRooms = await Room.count({ where: { approvalStatus: 'pending' } });
    const rejectedRooms = await Room.count({ where: { approvalStatus: 'rejected' } });
    const categoryOwnedRooms = await Room.count({ 
      where: { 
        categoryOwnerId: { [Op.ne]: null } 
      } 
    });

    res.json({
      success: true,
      data: {
        totalRooms,
        approvedRooms,
        pendingRooms,
        rejectedRooms,
        categoryOwnedRooms
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin statistics'
    });
  }
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Public
router.get('/:id', validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'owner',
        attributes: ['name', 'email', 'phone']
      }]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room not available'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room'
    });
  }
});

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Owner/Admin)
router.post('/', protect, authorize('owner', 'admin'), validateRoom, handleValidationErrors, async (req, res) => {
  try {
    // Handle legacy location format (convert string to object if needed)
    let locationData = req.body.location;
    if (typeof locationData === 'string') {
      locationData = {
        address: locationData,
        city: req.body.city || '',
        state: '',
        pincode: '',
        coordinates: { lat: 0, lng: 0 }
      };
    } else if (!locationData) {
      locationData = {
        address: req.body.address || '',
        city: req.body.city || '',
        state: req.body.state || '',
        pincode: req.body.pincode || '',
        coordinates: { lat: 0, lng: 0 }
      };
    }

    // Determine roomType from category if not provided
    let roomType = req.body.roomType;
    if (!roomType) {
      if (req.body.category === 'Hotel Room') {
        roomType = 'Hotel Room';
      } else if (req.body.category === 'PG') {
        roomType = 'PG';
      } else if (req.body.propertyType) {
        roomType = req.body.propertyType === 'entire_place' ? 'Entire Place' : 'Private Room';
      } else {
        roomType = 'Private Room';
      }
    }

    const roomData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      roomType: roomType,
      location: locationData,
      price: req.body.price || 0,
      maxGuests: req.body.maxGuests || 1,
      amenities: req.body.amenities || [],
      images: req.body.images || [],
      rules: req.body.rules || [],
      ownerId: req.user.id,
      approvalStatus: 'approved',
      rating: req.body.rating || { average: 0, count: 0 },
      availability: req.body.availability || { isAvailable: true },
      // Category-specific fields
      pricingType: req.body.pricingType || null,
      pgOptions: req.body.pgOptions || null,
      hotelRoomTypes: req.body.hotelRoomTypes || [],
      hotelPrices: req.body.hotelPrices || null,
      propertyDetails: req.body.propertyDetails || null
    };

    const room = await Room.create(roomData);
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room',
      error: error.message
    });
  }
});

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, authorize('owner', 'admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    let room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user owns the room or is admin
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room'
      });
    }

    // Update the room
    await room.update(req.body);

    // Fetch the updated room with owner info
    const updatedRoom = await Room.findByPk(req.params.id, {
      include: [
        {
          model: require('../models/User'),
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: updatedRoom
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room',
      error: error.message
    });
  }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Owner/Admin)
router.delete('/:id', protect, authorize('owner', 'admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user owns the room or is admin
    if (room.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    await room.destroy();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room'
    });
  }
});

// @desc    Create room (Category Owner or Admin)
// @route   POST /api/rooms
// @access  Private (Category Owner, Admin)
router.post('/', protect, authorize('category_owner', 'admin'), validateRoom, handleValidationErrors, async (req, res) => {
  try {
    const roomData = {
      ...req.body,
      ownerId: req.user.id,
      categoryOwnerId: req.user.role === 'category_owner' ? req.user.id : null,
      approvalStatus: 'approved', // Auto-approval for now
      approvedAt: new Date(),
      approvedBy: req.user.role === 'admin' ? req.user.id : null
    };

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room'
    });
  }
});

// @desc    Approve room (Admin only)
// @route   PUT /api/rooms/:id/approve
// @access  Private (Admin)
router.put('/:id/approve', protect, authorize('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    await room.update({
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user.id,
      rejectionReason: null
    });

    res.json({
      success: true,
      message: 'Room approved successfully',
      data: room
    });
  } catch (error) {
    console.error('Approve room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving room'
    });
  }
});

// @desc    Reject room (Admin only)
// @route   PUT /api/rooms/:id/reject
// @access  Private (Admin)
router.put('/:id/reject', protect, authorize('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const room = await Room.findByPk(req.params.id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    await room.update({
      approvalStatus: 'rejected',
      rejectionReason: rejectionReason || 'Room does not meet our standards'
    });

    res.json({
      success: true,
      message: 'Room rejected successfully',
      data: room
    });
  } catch (error) {
    console.error('Reject room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting room'
    });
  }
});

module.exports = router;
