const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { 
  validateRoom, 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get all rooms with filtering and pagination
// @route   GET /api/rooms
// @access  Public
router.get('/', optionalAuth, validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { isActive: true };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.roomType) {
      filter.roomType = req.query.roomType;
    }
    
    if (req.query.city) {
      filter['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
    }
    
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-asc':
          sort = { price: 1 };
          break;
        case 'price-desc':
          sort = { price: -1 };
          break;
        case 'rating':
          sort = { 'rating.average': -1 };
          break;
        case 'featured':
          sort = { featured: -1, createdAt: -1 };
          break;
      }
    }

    const rooms = await Room.findAll({
      where: filter,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['name', 'email', 'phone']
      }],
      order: Object.entries(sort).map(([key, direction]) => [
        key === 'createdAt' ? 'created_at' : 
        key === 'updatedAt' ? 'updated_at' : 
        key === 'roomType' ? 'room_type' :
        key === 'maxGuests' ? 'max_guests' :
        key === 'isActive' ? 'is_active' :
        key === 'ownerId' ? 'owner_id' : key, 
        direction === -1 ? 'DESC' : 'ASC'
      ]),
      offset: skip,
      limit: limit
    });

    const total = await Room.count({ where: filter });

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
    const roomData = {
      ...req.body,
      owner: req.user._id
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
    if (room.owner.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room'
      });
    }

    room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room'
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
    if (room.owner.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    await Room.findByIdAndDelete(req.params.id);

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

// @desc    Get rooms by owner
// @route   GET /api/rooms/owner/my-rooms
// @access  Private (Owner)
router.get('/owner/my-rooms', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { ownerId: req.user.id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    console.error('Get owner rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your rooms'
    });
  }
});

module.exports = router;
