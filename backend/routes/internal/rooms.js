/**
 * Internal Room Management Routes
 * 
 * This module handles all room-related operations for the internal management system:
 * - Room status overview
 * - Bed management
 * - Room CRUD operations
 * - Bulk room creation
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../../models');
const User = require('../../models/User');
const router = express.Router();

// @desc    Get room status for internal management
// @route   GET /api/internal/rooms/status
// @access  Private
router.get('/internal/rooms/status', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId } = req.query;
    console.log('Room status request - User:', user.id, 'Role:', user.role, 'PropertyId:', propertyId);

    try {
      // Build where clause for filtering
      let whereClause = {
        isActive: true,
        approvalStatus: 'approved'
      };

      // If propertyId is provided, filter by property
      if (propertyId) {
        // Use raw SQL for JSON filtering - ONLY get rooms with matching propertyId
        const rooms = await sequelize.query(`
          SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId",
                 current_status as "currentStatusDb",
                 property_details as "propertyDetails", created_at as "createdAt", updated_at as "updatedAt"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = :propertyId
          ORDER BY title
        `, {
          replacements: { propertyId },
          type: sequelize.QueryTypes.SELECT
        });

        console.log('Found', rooms.length, 'rooms for propertyId:', propertyId);

        // Transform rooms to match frontend expectations
        const transformedRooms = rooms.map(room => {
          const propertyDetails = room.propertyDetails || {};
          const roomNumber = room.roomNumber || room.room_number || room.title.replace('Room ', '');
          // Use the actual DB column — fall back to JSONB only if column is missing
          const status = room.currentStatusDb || propertyDetails.currentStatus || 'vacant_clean';
          
          return {
            id: room.id,
            roomNumber: roomNumber,
            room_number: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            currentStatus: status,
            current_status: status,
            sharingType: propertyDetails.sharingType || 'single',
            sharing_type: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
            total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            occupied_beds: propertyDetails.occupiedBeds || 0,
            price: propertyDetails.dailyRate || room.price || 0,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            propertyId: propertyDetails.propertyId || propertyId,
            property_id: propertyDetails.propertyId || propertyId,
            isActive: true,
            roomType: 'standard',
            category: propertyDetails.sharingType || 'single',
            pricingType: propertyDetails.pricingType || 'daily',
            lastCleanedAt: null,
            lastMaintenanceAt: null
          };
        });

        res.json({
          success: true,
          message: 'Room status retrieved successfully',
          data: {
            rooms: transformedRooms,
            total: transformedRooms.length,
            propertyId: propertyId || null
          }
        });
        return;
      } else if (user.role === 'owner') {
        // Property owners can only see their own rooms - use raw SQL
        const rooms = await sequelize.query(`
          SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId",
                 current_status as "currentStatusDb",
                 property_details as "propertyDetails"
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND owner_id = :ownerId
          ORDER BY title
        `, {
          replacements: { ownerId: user.id },
          type: sequelize.QueryTypes.SELECT
        });

        console.log('Found rooms:', rooms.length, 'rooms for owner:', user.id);

        // Transform rooms to match frontend expectations
        const transformedRooms = rooms.map(room => {
          const propertyDetails = room.propertyDetails || {};
          const roomNumber = (room.title || '').replace('Room ', '');
          const status = room.currentStatusDb || propertyDetails.currentStatus || 'vacant_clean';
          
          return {
            id: room.id,
            roomNumber: roomNumber,
            room_number: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            currentStatus: status,
            current_status: status,
            sharingType: propertyDetails.sharingType || 'single',
            sharing_type: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
            total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            occupied_beds: propertyDetails.occupiedBeds || 0,
            price: propertyDetails.dailyRate || room.price || 0,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            propertyId: propertyDetails.propertyId || null,
            property_id: propertyDetails.propertyId || null,
            isActive: true,
            roomType: 'standard',
            category: propertyDetails.sharingType || 'single',
            pricingType: propertyDetails.pricingType || 'daily',
            lastCleanedAt: null,
            lastMaintenanceAt: null
          };
        });

        res.json({
          success: true,
          message: 'Room status retrieved successfully',
          data: {
            rooms: transformedRooms,
            total: transformedRooms.length,
            propertyId: null
          }
        });
        return;
      }

      // For admin/superuser - get all rooms using raw SQL
      const rooms = await sequelize.query(`
        SELECT id, title, price, max_guests as "maxGuests", owner_id as "ownerId",
               current_status as "currentStatusDb",
               property_details as "propertyDetails"
        FROM rooms 
        WHERE is_active = true 
        AND approval_status = 'approved'
        ORDER BY title
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      console.log('Found rooms:', rooms.length, 'rooms for propertyId:', propertyId);

      // Transform rooms to match frontend expectations
      const transformedRooms = rooms.map(room => {
        const propertyDetails = room.propertyDetails || {};
        const roomNumber = room.roomNumber || room.room_number || room.title.replace('Room ', '');
        const status = room.currentStatusDb || propertyDetails.currentStatus || 'vacant_clean';
        
        return {
          id: room.id,
          roomNumber: roomNumber,
          room_number: roomNumber,
          floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          floor_number: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
          currentStatus: status,
          current_status: status,
          sharingType: propertyDetails.sharingType || 'single',
          sharing_type: propertyDetails.sharingType || 'single',
          totalBeds: propertyDetails.totalBeds || room.maxGuests || 1,
          total_beds: propertyDetails.totalBeds || room.maxGuests || 1,
          occupiedBeds: propertyDetails.occupiedBeds || 0,
          occupied_beds: propertyDetails.occupiedBeds || 0,
          price: propertyDetails.dailyRate || room.price || 0,
          dailyRate: propertyDetails.dailyRate || room.price || 0,
          monthlyRate: propertyDetails.monthlyRate || 0,
          propertyId: propertyDetails.propertyId || null,
          property_id: propertyDetails.propertyId || null,
          isActive: true,
          roomType: 'standard',
          category: propertyDetails.sharingType || 'single',
          pricingType: propertyDetails.pricingType || 'daily',
          lastCleanedAt: null,
          lastMaintenanceAt: null
        };
      });

      res.json({
        success: true,
        message: 'Room status retrieved successfully',
        data: {
          rooms: transformedRooms,
          total: transformedRooms.length,
          propertyId: propertyId || null
        }
      });

    } catch (dbError) {
      console.error('Database error in room status:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching room status',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching room status'
    });
  }
});

// @desc    Get beds for a specific room
// @route   GET /api/internal/rooms/:roomId/beds
// @access  Private
router.get('/internal/rooms/:roomId/beds', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { roomId } = req.params;
    
    // Get room details
    const [rooms] = await sequelize.query(
      `SELECT id, title, total_beds, max_guests, property_details FROM rooms WHERE id = $1`,
      { bind: [roomId] }
    );

    if (!rooms || rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const room = rooms[0];
    const propertyDetails = room.property_details || {};
    
    // Get total beds from property_details or fallback to total_beds column or max_guests
    const totalBeds = propertyDetails.totalBeds || room.total_beds || room.max_guests || 1;
    const occupiedBeds = propertyDetails.occupiedBeds || 0;
    
    // Check for existing bookings to determine which beds are occupied
    const [activeBookings] = await sequelize.query(
      `SELECT id, bed_id FROM bookings 
       WHERE room_id = $1 
       AND status IN ('confirmed', 'pending')
       AND check_out > NOW()`,
      { bind: [roomId] }
    );
    
    // Create a map of occupied bed IDs
    const occupiedBedIds = new Set();
    if (activeBookings) {
      activeBookings.forEach(booking => {
        if (booking.bed_id) {
          occupiedBedIds.add(booking.bed_id);
        }
      });
    }
    
    // Generate virtual beds based on total bed count
    const beds = [];
    for (let i = 1; i <= totalBeds; i++) {
      const bedId = `${roomId}-bed-${i}`;
      const bedNumber = `Bed ${i}`;
      const isOccupied = occupiedBedIds.has(bedId);
      
      beds.push({
        id: bedId,
        bedNumber: bedNumber,
        bed_number: bedNumber,
        roomId: roomId,
        room_id: roomId,
        status: isOccupied ? 'occupied' : 'vacant',
        guestName: null,
        guest_name: null
      });
    }

    res.json({
      success: true,
      message: 'Beds retrieved successfully',
      data: beds
    });

  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching beds for room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update room details
// @route   PUT /api/internal/rooms/:id
// @access  Private
router.put('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;
    const { title, description, dailyRate, monthlyRate, maxGuests, sharingType, currentStatus, amenities, isActive } = req.body;

    try {
      // Check if room exists and user has permission to edit it
      const [existingRoom] = await sequelize.query(`
        SELECT r.*, p.owner_id 
        FROM rooms r 
        LEFT JOIN properties p ON r.owner_id = p.owner_id 
        WHERE r.id = $1
      `, { bind: [id] });

      if (!existingRoom || existingRoom.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const room = existingRoom[0];

      // For property owners, ensure they own the room
      if (user.role === 'owner' && room.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only edit your own rooms.'
        });
      }

      // Update room using raw SQL to avoid enum conflicts
      const amenitiesValue = Array.isArray(amenities) ? `{${amenities.map(a => `"${a}"`).join(',')}}` : null;
      const [result] = await sequelize.query(`
        UPDATE rooms 
        SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          max_guests = COALESCE($4, max_guests),
          current_status = COALESCE($5::varchar, current_status::varchar)::enum_rooms_new_current_status,
          amenities = COALESCE($6::varchar[], amenities),
          is_active = COALESCE($7, is_active),
          property_details = property_details || $8::jsonb,
          updated_at = NOW()
        WHERE id = $9
        RETURNING id, title, description, price, max_guests, current_status, amenities, is_active, property_details
      `, {
        bind: [
          title || null,
          description || null,
          dailyRate || null,
          maxGuests || null,
          currentStatus || null,
          amenitiesValue,
          isActive !== undefined ? isActive : null,
          JSON.stringify({
            sharingType: sharingType || undefined,
            currentStatus: currentStatus || undefined,
            dailyRate: dailyRate !== undefined ? dailyRate : undefined,
            monthlyRate: monthlyRate !== undefined ? monthlyRate : undefined,
            totalBeds: maxGuests || undefined,
          }),
          id
        ]
      });

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update room'
        });
      }

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: result[0]
      });

    } catch (dbError) {
      console.error('Database error in room update:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while updating room',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating room'
    });
  }
});

// @desc    Delete room
// @route   DELETE /api/internal/rooms/:id
// @access  Private
router.delete('/internal/rooms/:id', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { id } = req.params;

    try {
      // Check if room exists and user has permission to delete it
      const [existingRoom] = await sequelize.query(`
        SELECT r.*, p.owner_id 
        FROM rooms r 
        LEFT JOIN properties p ON r.owner_id = p.owner_id 
        WHERE r.id = $1
      `, { bind: [id] });

      if (!existingRoom || existingRoom.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      const room = existingRoom[0];

      // For property owners, ensure they own the room
      if (user.role === 'owner' && room.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own rooms.'
        });
      }

      // Check if room has active bookings (in a real system)
      // For now, we'll allow deletion but could add booking checks here

      // Delete room
      const [result] = await sequelize.query(`
        DELETE FROM rooms WHERE id = $1 RETURNING id, title
      `, { bind: [id] });

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete room'
        });
      }

      res.json({
        success: true,
        message: 'Room deleted successfully',
        data: result[0]
      });

    } catch (dbError) {
      console.error('Database error in room deletion:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while deleting room',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting room'
    });
  }
});

// @desc    Bulk create rooms (Working endpoint with Room model)
// @route   POST /api/internal/rooms/bulk-create
// @access  Private
router.post('/internal/rooms/bulk-create', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user has appropriate role for internal management
    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions for internal management system.'
      });
    }

    const { propertyId, floorType = 'regular', floorNumber, startRoom, endRoom, categoryId, sharingType, dailyRate, monthlyRate } = req.body;

    // Validation
    if (!propertyId || !floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate rates - at least one rate must be provided
    if (!dailyRate && !monthlyRate) {
      return res.status(400).json({
        success: false,
        message: 'At least one rate (dailyRate or monthlyRate) must be provided'
      });
    }

    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number must be less than or equal to end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 100 rooms at once'
      });
    }

    try {
      // Check if property exists
      const [propertyCheck] = await sequelize.query(
        'SELECT id, owner_id FROM properties WHERE id = $1',
        { bind: [propertyId] }
      );

      if (!propertyCheck || propertyCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = propertyCheck[0];

      // For property owners, ensure they own the property
      if (user.role === 'owner' && property.owner_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only add rooms to your own properties.'
        });
      }

      // Determine bed count based on sharing type
      const bedCounts = {
        'single': 1,
        '2_sharing': 2,
        '3_sharing': 3,
        'quad': 4,
        'dormitory': 6
      };
      const totalBeds = bedCounts[sharingType] || 1;

      // Map frontend sharing types to database enum values
      const sharingTypeMap = {
        'single': 'single',
        '2_sharing': 'double',
        '3_sharing': 'triple',
        'quad': 'quad',
        'dormitory': 'dormitory'
      };
      const dbSharingType = sharingTypeMap[sharingType] || 'single';

      // Generate room data using Room model schema
      const roomsToCreate = [];
      const warnings = [];
      
      for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
        
        // Check if room already exists using property_details JSON (property_id column may be null)
        const roomTitle = `Room ${roomNumber}`;
        const [existingRoom] = await sequelize.query(
          `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
          { bind: [propertyId, roomNumber, roomTitle] }
        );

        if (existingRoom && existingRoom.length > 0) {
          warnings.push(`Room ${roomNumber} already exists, skipping`);
          continue;
        }

        // Try to create room with minimal data to avoid enum conflicts
        const roomData = {
          title: roomTitle,
          description: `Room ${roomNumber} on floor ${floorNumber} with ${sharingType} sharing type. This is a comfortable accommodation space.`,
          price: dailyRate || 0, // Use daily rate as primary price
          location: {
            address: 'Property Address',
            city: 'City',
            state: 'State',
            country: 'India'
          },
          category: 'PG',
          maxGuests: totalBeds,
          ownerId: property.owner_id,
          propertyId: propertyId
        };

        // Store room data without roomType to avoid enum conflicts
        roomsToCreate.push(roomData);
      }

      if (roomsToCreate.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No rooms to create. All room numbers already exist.',
          warnings
        });
      }

      // Create rooms using raw SQL to avoid model enum conflicts
      const createdRooms = [];
      for (const roomData of roomsToCreate) {
        try {
          // Use raw SQL to insert room with correct enum values and dual pricing
          const [result] = await sequelize.query(`
            INSERT INTO rooms (
              id, title, description, price, location, room_type, category, 
              max_guests, amenities, images, rules, rating, availability, 
              owner_id, is_active, featured, approval_status, hotel_room_types,
              property_details, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, 'shared', $5, 
              $6, '{}', '[]', '{}', '{"average":0,"count":0}', '{"isAvailable":true}',
              $7, true, false, 'approved', '{}',
              $8, NOW(), NOW()
            ) RETURNING id, title
          `, {
            bind: [
              roomData.title,
              roomData.description, 
              roomData.price, // Daily rate as primary price
              JSON.stringify(roomData.location),
              roomData.category,
              roomData.maxGuests,
              roomData.ownerId,
              JSON.stringify({
                floorNumber: floorNumber,
                sharingType: sharingType,
                totalBeds: totalBeds,
                occupiedBeds: 0,
                availableBeds: totalBeds,
                currentStatus: 'vacant_clean',
                propertyId: propertyId,
                dailyRate: dailyRate || 0,
                monthlyRate: monthlyRate || 0,
                pricingType: dailyRate && monthlyRate ? 'both' : (dailyRate ? 'daily' : 'monthly')
              })
            ]
          });
          
          if (result && result.length > 0) {
            createdRooms.push(result[0]);
          }
        } catch (roomError) {
          console.error('Error creating individual room:', roomError);
          warnings.push(`Failed to create room ${roomData.title}: ${roomError.message}`);
        }
      }

      res.json({
        success: true,
        message: `Successfully created ${createdRooms.length} room(s)`,
        data: {
          created: createdRooms.length,
          total: roomCount,
          warnings: warnings.length > 0 ? warnings : undefined,
          rooms: createdRooms.map(room => ({
            id: room.id,
            roomNumber: room.title
          }))
        }
      });

    } catch (dbError) {
      console.error('Database error in bulk room creation:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while creating rooms',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Bulk room creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating rooms'
    });
  }
});

// @desc    Bulk create rooms for a property (Internal Management)
// @route   POST /api/internal/properties/:propertyId/rooms/bulk
// @access  Private
router.post('/internal/properties/:propertyId/rooms/bulk', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { propertyId } = req.params;
    const { 
      floorType = 'regular',
      floorNumber, 
      startRoom, 
      endRoom, 
      sharingType, 
      dailyRate, 
      monthlyRate 
    } = req.body;

    // Validate required fields
    if (!floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate room range
    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number cannot be greater than end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 50 rooms at once'
      });
    }

    // Check if property exists
    const [propertyCheck] = await sequelize.query(
      'SELECT id, owner_id FROM properties WHERE id = $1',
      { bind: [propertyId] }
    );

    if (!propertyCheck || propertyCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const property = propertyCheck[0];

    // For property owners, ensure they own the property
    if (user.role === 'owner' && property.owner_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only add rooms to your own properties.'
      });
    }

    // Determine bed count based on sharing type
    const bedCounts = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[sharingType] || 1;

    // Map frontend sharing types to database enum values
    const sharingTypeMap = {
      'single': 'single',
      '2_sharing': 'double',
      '3_sharing': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory'
    };
    const dbSharingType = sharingTypeMap[sharingType] || 'single';

    // Generate room numbers and check for duplicates
    const roomsToCreate = [];
    const warnings = [];
    
    for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
      
      // Check if room already exists using property_details JSON (property_id column may be null)
      const roomTitle = `Room ${roomNumber}`;
      const [existingRoom] = await sequelize.query(
        `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
        { bind: [propertyId, roomNumber, roomTitle] }
      );

      if (existingRoom && existingRoom.length > 0) {
        warnings.push(`Room ${roomNumber} already exists, skipping`);
        continue;
      }

      // Create room data using correct database schema
      const roomData = {
        id: require('uuid').v4(),
        property_id: propertyId,
        title: roomTitle,
        room_number: roomNumber,
        description: `${sharingType} room on floor ${floorNumber}`,
        room_type: 'standard',
        sharing_type: dbSharingType,
        total_beds: totalBeds,
        price: dailyRate || 0,
        pricing_type: 'per_bed',
        current_status: 'vacant_clean',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        // Store additional pricing info in property_details JSON
        property_details: JSON.stringify({
          propertyId: propertyId,
          dailyRate: dailyRate || 0,
          monthlyRate: monthlyRate || (dailyRate || 0) * 30,
          floorNumber: floorNumber,
          roomNumber: roomNumber
        })
      };

      roomsToCreate.push(roomData);
    }

    if (roomsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms to create. All room numbers already exist.',
        warnings
      });
    }

    // Bulk insert rooms using correct column names
    const insertQuery = `
      INSERT INTO rooms (
        id, property_id, title, room_number, description, room_type, sharing_type, 
        total_beds, price, pricing_type, current_status, is_active, 
        created_at, updated_at, property_details
      ) VALUES ${roomsToCreate.map((_, index) => 
        `(${index * 15 + 1}, ${index * 15 + 2}, ${index * 15 + 3}, ${index * 15 + 4}, ${index * 15 + 5}, ${index * 15 + 6}, ${index * 15 + 7}, ${index * 15 + 8}, ${index * 15 + 9}, ${index * 15 + 10}, ${index * 15 + 11}, ${index * 15 + 12}, ${index * 15 + 13}, ${index * 15 + 14}, ${index * 15 + 15})`
      ).join(', ')}
      RETURNING id, title, room_number
    `;

    const bindValues = roomsToCreate.flatMap(room => [
      room.id, room.property_id, room.title, room.room_number, room.description, room.room_type, room.sharing_type,
      room.total_beds, room.price, room.pricing_type, room.current_status, room.is_active,
      room.created_at, room.updated_at, room.property_details
    ]);

    const [createdRooms] = await sequelize.query(insertQuery, { bind: bindValues });

    res.json({
      success: true,
      message: `Successfully created ${createdRooms.length} room(s)`,
      data: {
        created: createdRooms.length,
        total: roomCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        rooms: createdRooms
      }
    });

  } catch (dbError) {
    console.error('Database error in bulk room creation:', dbError);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
    });
  }
});

// @desc    Bulk create rooms (Superuser Service endpoint)
// @route   POST /api/internal/superuser/bulk-create-rooms
// @access  Private
router.post('/internal/superuser/bulk-create-rooms', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Check if user is superuser
    if (user.role !== 'superuser') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superuser role required.'
      });
    }

    const { 
      propertyId, 
      floorType = 'regular',
      floorNumber, 
      startRoom, 
      endRoom, 
      sharingType, 
      dailyRate, 
      monthlyRate 
    } = req.body;

    // Validate required fields
    if (!propertyId || !floorNumber || !startRoom || !endRoom || !sharingType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: propertyId, floorNumber, startRoom, endRoom, sharingType'
      });
    }

    // Validate floor type
    const validFloorTypes = ['regular', 'ground', 'basement'];
    if (!validFloorTypes.includes(floorType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid floor type. Must be regular, ground, or basement'
      });
    }

    // Validate room range
    if (startRoom > endRoom) {
      return res.status(400).json({
        success: false,
        message: 'Start room number cannot be greater than end room number'
      });
    }

    const roomCount = endRoom - startRoom + 1;
    if (roomCount > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create more than 50 rooms at once'
      });
    }

    // Check if property exists
    const [propertyCheck] = await sequelize.query(
      'SELECT id, owner_id FROM properties WHERE id = $1',
      { bind: [propertyId] }
    );

    if (!propertyCheck || propertyCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Determine bed count based on sharing type
    const bedCounts = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCounts[sharingType] || 1;

    // Map frontend sharing types to database enum values
    const sharingTypeMap = {
      'single': 'single',
      '2_sharing': 'double',
      '3_sharing': 'triple',
      'quad': 'quad',
      'dormitory': 'dormitory'
    };
    const dbSharingType = sharingTypeMap[sharingType] || 'single';

    // Generate room numbers and check for duplicates
    const roomsToCreate = [];
    const warnings = [];
    
    for (let i = startRoom; i <= endRoom; i++) {
      // Generate room number based on floor type
      let roomNumber;
      switch (floorType) {
        case 'ground':
          roomNumber = `G${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          roomNumber = `B${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
      
      // Check if room already exists using property_details JSON (property_id column may be null)
      const roomTitle = `Room ${roomNumber}`;
      const [existingRoom] = await sequelize.query(
        `SELECT id FROM rooms WHERE (property_id::text = $1 OR property_details->>'propertyId' = $1) AND (title = $2 OR title = $3)`,
        { bind: [propertyId, roomNumber, roomTitle] }
      );

      if (existingRoom && existingRoom.length > 0) {
        warnings.push(`Room ${roomNumber} already exists, skipping`);
        continue;
      }

      // Create room data using correct database schema
      const roomData = {
        id: require('uuid').v4(),
        property_id: propertyId,
        title: roomTitle,
        room_number: roomNumber,
        description: `${sharingType} room on floor ${floorNumber}`,
        room_type: 'standard',
        sharing_type: dbSharingType,
        total_beds: totalBeds,
        price: dailyRate || 0,
        pricing_type: 'per_bed',
        current_status: 'vacant_clean',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        // Store additional pricing info in property_details JSON
        property_details: JSON.stringify({
          propertyId: propertyId,
          dailyRate: dailyRate || 0,
          monthlyRate: monthlyRate || (dailyRate || 0) * 30,
          floorNumber: floorNumber,
          roomNumber: roomNumber
        })
      };

      roomsToCreate.push(roomData);
    }

    if (roomsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms to create. All room numbers already exist.',
        warnings
      });
    }

    // Bulk insert rooms using correct column names
    const insertQuery = `
      INSERT INTO rooms (
        id, property_id, title, room_number, description, room_type, sharing_type, 
        total_beds, price, pricing_type, current_status, is_active, 
        created_at, updated_at, property_details
      ) VALUES ${roomsToCreate.map((_, index) => 
        `(${index * 15 + 1}, ${index * 15 + 2}, ${index * 15 + 3}, ${index * 15 + 4}, ${index * 15 + 5}, ${index * 15 + 6}, ${index * 15 + 7}, ${index * 15 + 8}, ${index * 15 + 9}, ${index * 15 + 10}, ${index * 15 + 11}, ${index * 15 + 12}, ${index * 15 + 13}, ${index * 15 + 14}, ${index * 15 + 15})`
      ).join(', ')}
      RETURNING id, title, room_number
    `;

    const bindValues = roomsToCreate.flatMap(room => [
      room.id, room.property_id, room.title, room.room_number, room.description, room.room_type, room.sharing_type,
      room.total_beds, room.price, room.pricing_type, room.current_status, room.is_active,
      room.created_at, room.updated_at, room.property_details
    ]);

    const [createdRooms] = await sequelize.query(insertQuery, { bind: bindValues });

    res.json({
      success: true,
      message: `Successfully created ${createdRooms.length} room(s)`,
      data: {
        created: createdRooms.length,
        total: roomCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        rooms: createdRooms
      }
    });

  } catch (dbError) {
    console.error('Database error in superuser bulk room creation:', dbError);
    res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
    });
  }
});

// ─── Missing endpoints used by RoomDetailModal ───────────────────────────────

// @desc    Update room status (quick status change)
// @route   PUT /api/internal/rooms/:roomId/status
// @access  Private
router.put('/internal/rooms/:roomId/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { roomId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['vacant_clean', 'vacant_dirty', 'occupied', 'maintenance', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    await sequelize.query(`
      UPDATE rooms
      SET current_status = $1::enum_rooms_new_current_status,
          property_details = property_details || jsonb_build_object('currentStatus', $1),
          updated_at = NOW()
      WHERE id = $2
    `, { bind: [status, roomId] });

    res.json({
      success: true,
      message: 'Room status updated',
      data: { id: roomId, roomId, status, updatedAt: new Date().toISOString(), updatedBy: user.id, notes }
    });
  } catch (err) {
    console.error('Room status update error:', err);
    res.status(500).json({ success: false, message: 'Error updating room status' });
  }
});

// @desc    Get single room details
// @route   GET /api/internal/rooms/:roomId
// @access  Private
router.get('/internal/rooms/:roomId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { roomId } = req.params;
    const [rooms] = await sequelize.query(`
      SELECT id, title, price, max_guests, current_status, amenities, is_active, property_details
      FROM rooms WHERE id = $1
    `, { bind: [roomId] });

    if (!rooms.length) return res.status(404).json({ success: false, message: 'Room not found' });

    const room = rooms[0];
    const pd = room.property_details || {};
    res.json({
      success: true,
      data: {
        id: room.id,
        roomNumber: pd.roomNumber || room.title?.replace('Room ', '') || room.id.slice(0, 6),
        floorNumber: pd.floorNumber || 1,
        currentStatus: room.current_status,
        sharingType: pd.sharingType,
        totalBeds: pd.totalBeds || room.max_guests || 1,
        price: parseFloat(room.price) || 0,
        dailyRate: pd.dailyRate || parseFloat(room.price) || 0,
        monthlyRate: pd.monthlyRate || 0,
        amenities: room.amenities || [],
        isActive: room.is_active,
        pricingType: pd.pricingType || 'daily',
      }
    });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ success: false, message: 'Error fetching room' });
  }
});

// @desc    Get booking history for a room
// @route   GET /api/internal/rooms/:roomId/bookings
// @access  Private
router.get('/internal/rooms/:roomId/bookings', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { roomId } = req.params;
    const [bookings] = await sequelize.query(`
      SELECT b.id, b.check_in, b.check_out, b.status, b.booking_source,
             b.contact_info->>'name' as guest_name
      FROM bookings b
      WHERE b.room_id = $1
      ORDER BY b.check_in DESC
      LIMIT 50
    `, { bind: [roomId] });

    res.json({
      success: true,
      data: bookings.map(b => ({
        id: b.id,
        guestName: b.guest_name || 'Guest',
        checkInDate: b.check_in,
        checkOutDate: b.check_out,
        status: b.status,
        bookingSource: b.booking_source || 'offline'
      }))
    });
  } catch (err) {
    console.error('Room booking history error:', err);
    res.status(500).json({ success: false, message: 'Error fetching booking history' });
  }
});

// @desc    Get status history for a room
// @route   GET /api/internal/rooms/:roomId/status-history
// @access  Private
router.get('/internal/rooms/:roomId/status-history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { roomId } = req.params;

    // Try room_statuses table first, fall back to empty
    try {
      const [history] = await sequelize.query(`
        SELECT rs.id, rs.status, rs.notes, rs.created_at as "updatedAt",
               u.name as updated_by_name
        FROM room_statuses rs
        LEFT JOIN users u ON rs.updated_by = u.id
        WHERE rs.room_id = $1
        ORDER BY rs.created_at DESC
        LIMIT 30
      `, { bind: [roomId] });

      res.json({
        success: true,
        data: history.map(h => ({
          id: h.id,
          roomId,
          status: h.status,
          notes: h.notes,
          updatedAt: h.updatedAt,
          updatedBy: h.updated_by_name || 'System'
        }))
      });
    } catch {
      // Table may not exist — return empty
      res.json({ success: true, data: [] });
    }
  } catch (err) {
    console.error('Room status history error:', err);
    res.status(500).json({ success: false, message: 'Error fetching status history' });
  }
});

// @desc    Get maintenance history for a room
// @route   GET /api/internal/maintenance/requests/:roomId/history
// @access  Private
router.get('/internal/maintenance/requests/:roomId/history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { roomId } = req.params;

    try {
      const [requests] = await sequelize.query(`
        SELECT id, title, description, priority, status,
               created_at as "reportedDate", updated_at as "completedDate"
        FROM maintenance_requests
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT 30
      `, { bind: [roomId] });

      res.json({
        success: true,
        data: requests.map(r => ({
          id: r.id,
          title: r.title || 'Maintenance Request',
          description: r.description || '',
          priority: r.priority || 'medium',
          status: r.status || 'pending',
          reportedDate: r.reportedDate,
          completedDate: r.status === 'completed' ? r.completedDate : null
        }))
      });
    } catch {
      // Table may not exist — return empty
      res.json({ success: true, data: [] });
    }
  } catch (err) {
    console.error('Maintenance history error:', err);
    res.status(500).json({ success: false, message: 'Error fetching maintenance history' });
  }
});

module.exports = router;
