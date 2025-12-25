const express = require('express');
const router = express.Router();
const { Room, RoomStatus, RoomCategory, BedAssignment, User, Booking } = require('../../models');
const { protectInternal, requirePermissions } = require('../../middleware/internalAuth');
const { applyScopingMiddleware, applyScopeToWhere } = require('../../middleware/dataScoping');
const { Op } = require('sequelize');

/**
 * Internal Room Management Routes
 * Requirements: 1.1, 1.2, 7.1, 2.3, 7.2
 */

/**
 * GET /api/internal/rooms/status
 * Get all rooms with current status for a property
 * Requirements: 1.1, 1.2, 2.3
 */
router.get('/status', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    console.log('🔍 /rooms/status - User:', req.user.email, 'Type:', req.user.getUserType());
    console.log('🔍 Data scope:', JSON.stringify(req.dataScope, null, 2));
    
    // Build base where clause with data scoping
    const baseWhere = {
      isActive: true
    };

    // Apply data scoping to filter by accessible properties
    // Use 'propertyId' as the field name because propertyIds contains property IDs
    const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'propertyId');
    console.log('🔍 Scoped where clause:', JSON.stringify(scopedWhere, null, 2));

    const rooms = await Room.findAll({
      where: scopedWhere,
      attributes: [
        'id', 
        'roomNumber', 
        'floorNumber', 
        'currentStatus', 
        'sharingType', 
        'totalBeds', 
        'price',
        'isActive', 
        'propertyId'
      ],
      include: [
        {
          model: BedAssignment,
          as: 'beds',
          attributes: ['id', 'bedNumber', 'status', 'bookingId', 'occupantId'],
          required: false
        }
      ],
      order: [
        ['floorNumber', 'ASC'],
        ['roomNumber', 'ASC']
      ]
    });

    // Calculate occupied beds for each room
    const roomsWithOccupancy = rooms.map(room => {
      const roomData = room.toJSON();
      const beds = roomData.beds || [];
      const occupiedBeds = beds.filter(bed => bed.status === 'occupied').length;
      
      return {
        ...roomData,
        occupiedBeds,
        availableBeds: beds.filter(bed => bed.status === 'vacant').length,
        // Remove beds array from response to keep it clean
        beds: undefined
      };
    });

    // Return complete room data for display
    res.json({
      success: true,
      count: roomsWithOccupancy.length,
      data: roomsWithOccupancy
    });
  } catch (error) {
    console.error('Error fetching room status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/internal/rooms/:id/status
 * Update room status
 * Requirements: 7.1, 2.3, 7.2
 */
router.put('/:id/status', protectInternal, applyScopingMiddleware, requirePermissions('canUpdateRoomStatus'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['occupied', 'vacant_clean', 'vacant_dirty'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the room with data scoping applied
    const scopedWhere = applyScopeToWhere(req.dataScope, { id }, 'propertyId');
    const room = await Room.findOne({ where: scopedWhere });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or access denied.'
      });
    }

    // Update room status
    const previousStatus = room.currentStatus;
    room.currentStatus = status;

    // Update lastCleanedAt if status is being set to vacant_clean
    if (status === 'vacant_clean') {
      room.lastCleanedAt = new Date();
    }

    await room.save();

    // Create status history record
    await RoomStatus.create({
      roomId: room.id,
      status,
      updatedBy: req.user.id,
      notes: notes || null
    });

    res.json({
      success: true,
      message: 'Room status updated successfully.',
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        previousStatus,
        currentStatus: room.currentStatus,
        lastCleanedAt: room.lastCleanedAt,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/rooms/floor/:floorNumber
 * Get all rooms on a specific floor
 * Requirements: 1.1, 1.4, 2.3, 7.2
 */
router.get('/floor/:floorNumber', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    const { floorNumber } = req.params;

    // Validate floor number
    const floor = parseInt(floorNumber);
    if (isNaN(floor) || floor < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor number. Must be a non-negative integer.'
      });
    }

    // Build base where clause with floor filter
    const baseWhere = {
        floorNumber: floor,
        isActive: true
    };

    // Apply data scoping to filter by accessible properties
    const scopedWhere = applyScopeToWhere(req.dataScope, baseWhere, 'propertyId');

    const rooms = await Room.findAll({
      where: scopedWhere,
      attributes: [
        'id', 
        'roomNumber', 
        'floorNumber', 
        'title',
        'category',
        'roomType',
        'sharingType', 
        'totalBeds', 
        'currentStatus',
        'lastCleanedAt',
        'lastMaintenanceAt',
        'price'
      ],
      // Temporarily disabled associations due to model issues
      // include: [
      //   {
      //     model: RoomCategory,
      //     as: 'customCategory',
      //     attributes: ['id', 'name', 'description']
      //   },
      //   {
      //     model: BedAssignment,
      //     as: 'beds',
      //     attributes: ['id', 'bedNumber', 'status', 'bookingId', 'occupantId']
      //   }
      // ],
      order: [['roomNumber', 'ASC']]
    });

    // Format response
    const roomsWithStatus = rooms.map(room => ({
      id: room.id,
      roomNumber: room.roomNumber,
      floorNumber: room.floorNumber,
      title: room.title,
      category: room.category,
      roomType: room.roomType,
      sharingType: room.sharingType,
      totalBeds: room.totalBeds,
      currentStatus: room.currentStatus,
      lastCleanedAt: room.lastCleanedAt,
      lastMaintenanceAt: room.lastMaintenanceAt,
      price: room.price,
      // TODO: Re-enable bed assignments after fixing associations
      beds: [], // Temporarily empty until associations are fixed
      // beds: room.beds?.map(bed => ({
      //   id: bed.id,
      //   bedNumber: bed.bedNumber,
      //   status: bed.status,
      //   bookingId: bed.bookingId,
      //   occupantId: bed.occupantId
      // })) || []
      occupiedBeds: room.beds?.filter(bed => bed.status === 'occupied').length || 0,
      availableBeds: room.beds?.filter(bed => bed.status === 'vacant').length || 0
    }));

    res.json({
      success: true,
      floorNumber: floor,
      count: roomsWithStatus.length,
      data: roomsWithStatus
    });
  } catch (error) {
    console.error('Error fetching rooms by floor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms by floor.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/rooms/:id
 * Get detailed information for a specific room
 * Requirements: 1.1, 1.2, 2.3
 */
router.get('/:id', protectInternal, applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 /rooms/:id - User:', req.user.email, 'Room ID:', id);

    // Check if user has access to this room through data scoping
    const room = await Room.findOne({
      where: { id },
      attributes: [
        'id', 
        'roomNumber', 
        'floorNumber', 
        'currentStatus', 
        'sharingType', 
        'totalBeds', 
        'price',
        'isActive', 
        'propertyId',
        'title',
        'category',
        'roomType',
        'lastCleanedAt',
        'lastMaintenanceAt',
        'amenities'
      ],
      include: [
        {
          model: BedAssignment,
          as: 'beds',
          attributes: ['id', 'bedNumber', 'status', 'bookingId', 'occupantId'],
          required: false
        }
      ]
    });
    
    if (!room) {
      console.log('❌ Room not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check access to room's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        console.log('❌ Access denied for room property:', room.propertyId);
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied.'
        });
      }
    }

    console.log('✅ Room access granted:', room.roomNumber);

    // Calculate bed occupancy
    const roomData = room.toJSON();
    const beds = roomData.beds || [];
    const occupiedBeds = beds.filter(bed => bed.status === 'occupied').length;
    const availableBeds = beds.filter(bed => bed.status === 'vacant').length;

    // Return room details with bed occupancy
    res.json({
      success: true,
      data: {
        ...roomData,
        occupiedBeds,
        availableBeds,
        // Keep beds array for detailed view
        beds: beds.map(bed => ({
          id: bed.id,
          bedNumber: bed.bedNumber,
          status: bed.status,
          bookingId: bed.bookingId,
          occupantId: bed.occupantId
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room details.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/rooms/:id/beds
 * Get all beds for a room
 * Requirements: 6.1
 */
router.get('/:id/beds', applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🛏️ /rooms/:id/beds - User:', req.user.email, 'Room ID:', id);
    console.log('🛏️ Data scope:', JSON.stringify(req.dataScope, null, 2));

    // Check if user has access to this room through data scoping
    // First get the room to check its propertyId, then verify access
    const room = await Room.findOne({
      where: { id }
    });
    
    if (!room) {
      console.log('❌ Room not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Now check if user has access to this room's property
    const roomAccessWhere = applyScopeToWhere(req.dataScope, { id: room.propertyId }, 'id');
    
    console.log('🔍 Room access where clause:', JSON.stringify(roomAccessWhere, null, 2));
    
    // Check if the property ID is accessible
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        console.log('❌ Access denied for room property:', room.propertyId);
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied.'
        });
      }
    }

    console.log('✅ Room access granted:', room.roomNumber);

    // Get all beds for the room
    const beds = await BedAssignment.findAll({
      where: { roomId: id },
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkIn', 'checkOut', 'status'],
          required: false
        },
        {
          model: User,
          as: 'occupant',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        }
      ],
      order: [['bedNumber', 'ASC']]
    });

    res.json({
      success: true,
      roomId: id,
      roomNumber: room.roomNumber,
      sharingType: room.sharingType,
      totalBeds: room.totalBeds,
      count: beds.length,
      data: beds.map(bed => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status,
        bookingId: bed.bookingId,
        booking: bed.booking ? {
          id: bed.booking.id,
          checkInDate: bed.booking.checkIn,
          checkOutDate: bed.booking.checkOut,
          status: bed.booking.status
        } : null,
        occupant: bed.occupant ? {
          id: bed.occupant.id,
          name: bed.occupant.name,
          email: bed.occupant.email,
          phone: bed.occupant.phone
        } : null,
        createdAt: bed.createdAt,
        updatedAt: bed.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch beds.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/rooms/:id/beds
 * Create bed assignments when sharing type is set
 * Requirements: 5.2
 */
router.post('/:id/beds', applyScopingMiddleware, requirePermissions('canManageRooms'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this room through data scoping
    // First get the room to check its propertyId, then verify access
    const room = await Room.findOne({
      where: { id }
    });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Now check if user has access to this room's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied.'
        });
      }
    }

    // Validate room has sharing type and totalBeds
    if (!room.sharingType || !room.totalBeds) {
      return res.status(400).json({
        success: false,
        message: 'Room must have sharingType and totalBeds set before creating bed assignments.'
      });
    }

    // Check if beds already exist
    const existingBeds = await BedAssignment.count({
      where: { roomId: id }
    });

    if (existingBeds > 0) {
      return res.status(400).json({
        success: false,
        message: `Bed assignments already exist for this room (${existingBeds} beds found).`
      });
    }

    // Create bed assignments based on totalBeds
    const beds = [];
    for (let i = 1; i <= room.totalBeds; i++) {
      const bed = await BedAssignment.create({
        roomId: id,
        bedNumber: i,
        status: 'vacant',
        bookingId: null,
        occupantId: null
      });
      beds.push(bed);
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${beds.length} bed assignments for room ${room.roomNumber}.`,
      data: {
        roomId: id,
        roomNumber: room.roomNumber,
        sharingType: room.sharingType,
        totalBeds: room.totalBeds,
        beds: beds.map(bed => ({
          id: bed.id,
          bedNumber: bed.bedNumber,
          status: bed.status
        }))
      }
    });
  } catch (error) {
    console.error('Error creating bed assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bed assignments.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/rooms/:id/bookings
 * Get booking history for a room
 * Requirements: 6.1
 */
router.get('/:id/bookings', applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📚 /rooms/:id/bookings - User:', req.user.email, 'Room ID:', id);

    // Check if user has access to this room through data scoping
    const room = await Room.findOne({
      where: { id }
    });
    
    if (!room) {
      console.log('❌ Room not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check access to room's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        console.log('❌ Access denied for room property:', room.propertyId);
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied.'
        });
      }
    }

    console.log('✅ Room access granted:', room.roomNumber);

    // Get booking history for the room
    const bookings = await Booking.findAll({
      where: { roomId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        }
      ],
      order: [['checkIn', 'DESC']],
      limit: 50 // Limit to last 50 bookings
    });

    const bookingHistory = bookings.map(booking => ({
      id: booking.id,
      guestName: booking.user?.name || booking.guestName || 'Unknown Guest',
      checkInDate: booking.checkIn,
      checkOutDate: booking.checkOut,
      status: booking.status,
      bookingSource: booking.bookingSource || 'offline',
      totalAmount: booking.totalAmount,
      createdAt: booking.createdAt
    }));

    res.json({
      success: true,
      roomId: id,
      roomNumber: room.roomNumber,
      count: bookingHistory.length,
      data: bookingHistory
    });
  } catch (error) {
    console.error('Error fetching room booking history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room booking history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/rooms/:id/status-history
 * Get status change history for a room
 * Requirements: 6.1
 */
router.get('/:id/status-history', applyScopingMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📊 /rooms/:id/status-history - User:', req.user.email, 'Room ID:', id);

    // Check if user has access to this room through data scoping
    const room = await Room.findOne({
      where: { id }
    });
    
    if (!room) {
      console.log('❌ Room not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Room not found.'
      });
    }

    // Check access to room's property
    if (!req.dataScope.canBypassScoping) {
      const hasAccess = req.dataScope.propertyIds.includes(room.propertyId);
      if (!hasAccess) {
        console.log('❌ Access denied for room property:', room.propertyId);
        return res.status(404).json({
          success: false,
          message: 'Room not found or access denied.'
        });
      }
    }

    console.log('✅ Room access granted:', room.roomNumber);

    // Get status history for the room
    const statusHistory = await RoomStatus.findAll({
      where: { roomId: id },
      include: [
        {
          model: User,
          as: 'updatedByUser',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['updated_at', 'DESC']],
      limit: 100 // Limit to last 100 status changes
    });

    const formattedHistory = statusHistory.map(status => ({
      id: status.id,
      roomId: status.roomId,
      status: status.status,
      updatedAt: status.updatedAt,
      updatedBy: status.updatedBy,
      updatedByName: status.updatedByUser?.name || 'System',
      notes: status.notes
    }));

    res.json({
      success: true,
      roomId: id,
      roomNumber: room.roomNumber,
      count: formattedHistory.length,
      data: formattedHistory
    });
  } catch (error) {
    console.error('Error fetching room status history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room status history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
