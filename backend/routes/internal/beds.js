const express = require('express');
const router = express.Router();
const { BedAssignment, Room, Booking, User } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');

/**
 * Internal Bed Management Routes (for PG shared rooms)
 * Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3
 */

// Bed routes for rooms are now handled in rooms.js to match frontend expectations
// GET /api/internal/rooms/:id/beds - moved to rooms.js
// POST /api/internal/rooms/:id/beds - moved to rooms.js

/**
 * PUT /api/internal/beds/:id/status
 * Update bed status
 * Requirements: 5.3
 */
router.put('/:id/status', protectInternal, applyScopingMiddleware, requirePermissions('canUpdateRoomStatus'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, bookingId, occupantId } = req.body;

    // Validate status
    const validStatuses = ['occupied', 'vacant'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find bed with room info
    const bed = await BedAssignment.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'propertyId']
        }
      ]
    });

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found.'
      });
    }

    // Check if user has access to this room through data scoping
    const roomAccessWhere = applyScopeToWhere(req.dataScope, { id: bed.room.id }, 'id');
    const roomAccessCheck = await Room.findOne({
      where: roomAccessWhere
    });

    if (!roomAccessCheck) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this bed.'
      });
    }

    // Update bed status
    const previousStatus = bed.status;
    bed.status = status;

    if (status === 'occupied') {
      // When marking as occupied, require bookingId
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required when marking bed as occupied.'
        });
      }

      // Verify booking exists
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found.'
        });
      }

      bed.bookingId = bookingId;
      bed.occupantId = occupantId || booking.userId;
    } else {
      // When marking as vacant, clear booking and occupant
      bed.bookingId = null;
      bed.occupantId = null;
    }

    await bed.save();

    res.json({
      success: true,
      message: 'Bed status updated successfully.',
      data: {
        id: bed.id,
        bedNumber: bed.bedNumber,
        roomId: bed.roomId,
        roomNumber: bed.room.roomNumber,
        previousStatus,
        currentStatus: bed.status,
        bookingId: bed.bookingId,
        occupantId: bed.occupantId,
        updatedAt: bed.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating bed status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bed status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/beds/:id/occupant
 * Get occupant info for a bed
 * Requirements: 6.3
 */
router.get('/:id/occupant', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Find bed with occupant and booking info
    const bed = await BedAssignment.findByPk(id, {
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['id', 'roomNumber', 'floorNumber', 'propertyId']
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkInDate', 'checkOutDate', 'status', 'totalAmount'],
          required: false
        },
        {
          model: User,
          as: 'occupant',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        }
      ]
    });

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: 'Bed not found.'
      });
    }

    // Check if user has access to this room through data scoping
    const roomAccessWhere = applyScopeToWhere(req.dataScope, { id: bed.room.id }, 'id');
    const roomAccessCheck = await Room.findOne({
      where: roomAccessWhere
    });

    if (!roomAccessCheck) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this bed information.'
      });
    }

    // If bed is vacant, return appropriate message
    if (bed.status === 'vacant' || !bed.occupant) {
      return res.json({
        success: true,
        data: {
          bedId: bed.id,
          bedNumber: bed.bedNumber,
          roomNumber: bed.room.roomNumber,
          floorNumber: bed.room.floorNumber,
          status: bed.status,
          occupant: null,
          booking: null,
          message: 'Bed is currently vacant.'
        }
      });
    }

    // Return occupant information
    res.json({
      success: true,
      data: {
        bedId: bed.id,
        bedNumber: bed.bedNumber,
        roomNumber: bed.room.roomNumber,
        floorNumber: bed.room.floorNumber,
        status: bed.status,
        occupant: {
          id: bed.occupant.id,
          name: bed.occupant.name,
          email: bed.occupant.email,
          phone: bed.occupant.phone
        },
        booking: bed.booking ? {
          id: bed.booking.id,
          checkInDate: bed.booking.checkInDate,
          checkOutDate: bed.booking.checkOutDate,
          status: bed.booking.status,
          totalAmount: bed.booking.totalAmount
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching bed occupant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bed occupant information.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
