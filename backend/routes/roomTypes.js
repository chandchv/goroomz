const express = require('express');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');
const { 
  validateObjectId, 
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get room types for a property
// @route   GET /api/room-types/property/:propertyId
// @access  Public
router.get('/property/:propertyId', validateObjectId('propertyId'), handleValidationErrors, async (req, res) => {
  try {
    const roomTypes = await RoomType.findAll({
      where: { propertyId: req.params.propertyId, isActive: true },
      order: [['pricePerNight', 'ASC']]
    });

    res.json({
      success: true,
      count: roomTypes.length,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room types'
    });
  }
});

// @desc    Get single room type
// @route   GET /api/room-types/:id
// @access  Public
router.get('/:id', validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const roomType = await RoomType.findByPk(req.params.id, {
      include: [{
        model: Room,
        as: 'property',
        attributes: ['id', 'title', 'location']
      }]
    });

    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    res.json({
      success: true,
      data: roomType
    });
  } catch (error) {
    console.error('Get room type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room type'
    });
  }
});

// @desc    Create room type
// @route   POST /api/room-types
// @access  Private (Owner/Admin)
router.post('/', protect, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { propertyId, ...roomTypeData } = req.body;

    // Verify property ownership
    const property = await Room.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add room types to this property'
      });
    }

    // Calculate available beds/rooms
    const availableRooms = roomTypeData.totalRooms || 1;
    const availableBeds = roomTypeData.totalBeds || null;

    const roomType = await RoomType.create({
      propertyId,
      ...roomTypeData,
      availableRooms,
      availableBeds
    });

    res.status(201).json({
      success: true,
      message: 'Room type created successfully',
      data: roomType
    });
  } catch (error) {
    console.error('Create room type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating room type'
    });
  }
});

// @desc    Update room type
// @route   PUT /api/room-types/:id
// @access  Private (Owner/Admin)
router.put('/:id', protect, authorize('owner', 'admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const roomType = await RoomType.findByPk(req.params.id, {
      include: [{
        model: Room,
        as: 'property'
      }]
    });

    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    // Verify ownership
    if (roomType.property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room type'
      });
    }

    await roomType.update(req.body);

    res.json({
      success: true,
      message: 'Room type updated successfully',
      data: roomType
    });
  } catch (error) {
    console.error('Update room type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room type'
    });
  }
});

// @desc    Delete room type
// @route   DELETE /api/room-types/:id
// @access  Private (Owner/Admin)
router.delete('/:id', protect, authorize('owner', 'admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const roomType = await RoomType.findByPk(req.params.id, {
      include: [{
        model: Room,
        as: 'property'
      }]
    });

    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    // Verify ownership
    if (roomType.property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room type'
      });
    }

    await roomType.destroy();

    res.json({
      success: true,
      message: 'Room type deleted successfully'
    });
  } catch (error) {
    console.error('Delete room type error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room type'
    });
  }
});

// @desc    Check room type availability
// @route   GET /api/room-types/:id/availability
// @access  Public
router.get('/:id/availability', validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    const roomType = await RoomType.findByPk(req.params.id);
    if (!roomType) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }

    // TODO: Implement actual availability checking based on bookings
    // For now, return current availability
    const available = roomType.isDormitory 
      ? roomType.availableBeds > 0 
      : roomType.availableRooms > 0;

    res.json({
      success: true,
      data: {
        available,
        availableRooms: roomType.availableRooms,
        availableBeds: roomType.availableBeds,
        isDormitory: roomType.isDormitory
      }
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking availability'
    });
  }
});

module.exports = router;

