const express = require('express');
const router = express.Router();
const { User, Property, Room, Booking, Payment, RoomCategory, BedAssignment, Category, sequelize } = require('../../models');
const { requireSuperuser } = require('../../middleware/internalAuth');
const { sendEmail } = require('../../utils/emailService');
const { auditLog } = require('../../middleware/auditLog');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Apply superuser authorization to all routes (protectInternal already applied in server.js)
router.use(requireSuperuser);

// ============================================
// Property Owner Management Endpoints
// ============================================

// GET /api/internal/superuser/property-owners - Get all property owners
router.get('/property-owners', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = { role: { [Op.in]: ['owner', 'category_owner'] } };
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status === 'active') where.isVerified = true;
    else if (status === 'inactive') where.isVerified = false;
    
    const { count, rows: propertyOwners } = await User.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'phone', 'role', 'isVerified', 'created_at'],
      include: [{ 
        model: Property, 
        as: 'properties', 
        attributes: ['id', 'name', 'type', 'location', 'isActive', 'created_at'],
        required: false,
        include: [{
          model: Room,
          as: 'rooms',
          attributes: ['id', 'currentStatus'],
          required: false
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });
    
    const ownersWithStats = propertyOwners.map(owner => {
      const ownerData = owner.toJSON();
      const properties = ownerData.properties || [];
      
      // Calculate statistics
      ownerData.properties = properties.map(property => ({
        id: property.id,
        name: property.name,
        type: property.type,
        address: property.location?.address || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        status: property.isActive ? 'active' : 'inactive',
        roomCount: property.rooms?.length || 0,
        createdAt: property.created_at
      }));
      ownerData.propertiesCount = properties.length;
      
      return ownerData;
    });
    
    res.json({
      success: true,
      data: {
        propertyOwners: ownersWithStats,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Error fetching property owners:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property owners', error: error.message });
  }
});

// POST /api/internal/superuser/property-owners - Create new property owner
router.post('/property-owners', async (req, res) => {
  try {
    const { name, email, phone, role = 'owner', sendCredentials = true } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    const propertyOwner = await User.create({
      name, email, phone,
      role: role === 'category_owner' ? 'category_owner' : 'owner',
      password: generatedPassword,
      isVerified: true
    });
    
    if (sendCredentials) {
      try {
        await sendEmail({
          to: email,
          subject: 'Welcome to GoRoomz - Your Account Credentials',
          html: `<h2>Welcome to GoRoomz</h2><p>Hello ${name},</p><p>Email: ${email}<br>Password: ${generatedPassword}</p>`
        });
      } catch (emailError) {
        console.error('Error sending credentials email:', emailError);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Property owner created successfully',
      data: {
        propertyOwner: { id: propertyOwner.id, name: propertyOwner.name, email: propertyOwner.email, phone: propertyOwner.phone, role: propertyOwner.role },
        credentials: { email, password: generatedPassword }
      }
    });
  } catch (error) {
    console.error('Error creating property owner:', error);
    res.status(500).json({ success: false, message: 'Failed to create property owner', error: error.message });
  }
});

// GET /api/internal/superuser/property-owners/:id - Get property owner details
router.get('/property-owners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const propertyOwner = await User.findOne({
      where: { id, role: { [Op.in]: ['owner', 'category_owner'] } },
      attributes: { exclude: ['password', 'verificationToken', 'passwordResetToken'] },
      include: [{
        model: Property, 
        as: 'properties',
        attributes: ['id', 'name', 'type', 'location', 'isActive', 'created_at'],
        include: [{
          model: Room, 
          as: 'rooms',
          attributes: ['id', 'currentStatus'],
          include: [{ 
            model: Booking, 
            as: 'bookings', 
            attributes: ['id', 'status'], 
            required: false 
          }]
        }]
      }]
    });
    
    if (!propertyOwner) {
      return res.status(404).json({ success: false, message: 'Property owner not found' });
    }
    
    const ownerData = propertyOwner.toJSON();
    const properties = ownerData.properties || [];
    
    // Format properties for frontend
    ownerData.properties = properties.map(property => {
      const rooms = property.rooms || [];
      const allBookings = rooms.flatMap(r => r.bookings || []);
      
      return {
        id: property.id,
        name: property.name,
        type: property.type,
        address: property.location?.address || '',
        city: property.location?.city || '',
        state: property.location?.state || '',
        status: property.isActive ? 'active' : 'inactive',
        roomCount: rooms.length,
        occupiedRooms: rooms.filter(r => r.currentStatus === 'occupied').length,
        bookingCount: allBookings.length,
        createdAt: property.created_at
      };
    });
    
    // Calculate overall statistics
    const allRooms = properties.flatMap(p => p.rooms || []);
    const allBookings = allRooms.flatMap(r => r.bookings || []);
    
    const stats = {
      totalProperties: properties.length,
      activeProperties: properties.filter(p => p.isActive).length,
      totalRooms: allRooms.length,
      occupiedRooms: allRooms.filter(r => r.currentStatus === 'occupied').length,
      totalBookings: allBookings.length,
      activeBookings: allBookings.filter(b => b.status === 'active').length
    };
    
    res.json({ success: true, data: { propertyOwner: ownerData, statistics: stats } });
  } catch (error) {
    console.error('Error fetching property owner details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property owner details', error: error.message });
  }
});

// PUT /api/internal/superuser/property-owners/:id - Update property owner
router.put('/property-owners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;
    
    const propertyOwner = await User.findOne({ where: { id, role: { [Op.in]: ['owner', 'category_owner'] } } });
    if (!propertyOwner) {
      return res.status(404).json({ success: false, message: 'Property owner not found' });
    }
    
    if (email && email !== propertyOwner.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
    }
    
    if (name) propertyOwner.name = name;
    if (email) propertyOwner.email = email;
    if (phone) propertyOwner.phone = phone;
    if (role && ['owner', 'category_owner'].includes(role)) propertyOwner.role = role;
    
    await propertyOwner.save();
    res.json({ success: true, message: 'Property owner updated successfully', data: { propertyOwner: propertyOwner.toJSON() } });
  } catch (error) {
    console.error('Error updating property owner:', error);
    res.status(500).json({ success: false, message: 'Failed to update property owner', error: error.message });
  }
});

// PUT /api/internal/superuser/property-owners/:id/deactivate - Deactivate property owner
router.put('/property-owners/:id/deactivate', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const propertyOwner = await User.findOne({ where: { id, role: { [Op.in]: ['owner', 'category_owner'] } } });
    if (!propertyOwner) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Property owner not found' });
    }
    
    // Deactivate user
    propertyOwner.isVerified = false;
    await propertyOwner.save({ transaction });
    
    // Deactivate all properties owned by this user
    await Property.update(
      { isActive: false }, 
      { where: { ownerId: id }, transaction }
    );
    
    // Deactivate all rooms in those properties
    await Room.update(
      { isActive: false },
      { 
        where: { 
          propertyId: { 
            [Op.in]: sequelize.literal(`(SELECT id FROM properties WHERE owner_id = '${id}')`)
          }
        },
        transaction
      }
    );
    
    await transaction.commit();
    
    try {
      await sendEmail({
        to: propertyOwner.email,
        subject: 'Account Deactivation Notice',
        html: `<h2>Account Deactivation</h2><p>Hello ${propertyOwner.name},</p><p>Your account has been deactivated.</p>${reason ? `<p>Reason: ${reason}</p>` : ''}`
      });
    } catch (emailError) {
      console.error('Error sending deactivation email:', emailError);
    }
    
    res.json({ success: true, message: 'Property owner deactivated successfully', data: { propertyOwner: propertyOwner.toJSON() } });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deactivating property owner:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate property owner', error: error.message });
  }
});

// ============================================
// Property Management Endpoints
// ============================================

// POST /api/internal/superuser/properties - Create property for owner
router.post('/properties', async (req, res) => {
  try {
    const { ownerId, name, description, propertyType, categoryId, location, amenities = [], rules = [] } = req.body;
    
    if (!ownerId || !name || !description || !propertyType || !location) {
      return res.status(400).json({ success: false, message: 'Owner ID, name, description, property type, and location are required' });
    }
    
    // Validate location has required fields
    if (!location.address || !location.city || !location.state) {
      return res.status(400).json({ success: false, message: 'Location must include address, city, and state' });
    }
    
    const owner = await User.findOne({ where: { id: ownerId, role: { [Op.in]: ['owner', 'category_owner'] } } });
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Property owner not found' });
    }
    
    // Validate or get default category
    let validCategoryId = categoryId;
    if (!validCategoryId) {
      // Try to find a default category based on property type
      const defaultCategory = await Category.findOne({ 
        where: { type: propertyType.toLowerCase() } 
      });
      if (defaultCategory) {
        validCategoryId = defaultCategory.id;
      } else {
        return res.status(400).json({ success: false, message: 'Category ID is required or no default category found for this property type' });
      }
    }
    
    // Map property type to valid enum value
    const typeMap = {
      'Hotel': 'hotel',
      'PG': 'pg',
      'Hostel': 'hostel',
      'Homestay': 'homestay',
      'Apartment': 'apartment'
    };
    const type = typeMap[propertyType] || propertyType.toLowerCase();
    
    const property = await Property.create({
      ownerId,
      name,
      description,
      type,
      categoryId: validCategoryId,
      location,
      amenities,
      rules,
      isActive: true,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: req.user.id
    });
    
    res.status(201).json({ success: true, message: 'Property created successfully', data: { property: property.toJSON() } });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ success: false, message: 'Failed to create property', error: error.message });
  }
});

// PUT /api/internal/superuser/properties/:id - Update property
router.put('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, amenities, rules, isActive } = req.body;
    
    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    if (name) property.name = name;
    if (description) property.description = description;
    if (location) {
      // Validate location has required fields
      if (!location.address || !location.city || !location.state) {
        return res.status(400).json({ success: false, message: 'Location must include address, city, and state' });
      }
      property.location = location;
    }
    if (amenities) property.amenities = amenities;
    if (rules) property.rules = rules;
    if (typeof isActive === 'boolean') property.isActive = isActive;
    
    await property.save();
    res.json({ success: true, message: 'Property updated successfully', data: { property: property.toJSON() } });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ success: false, message: 'Failed to update property', error: error.message });
  }
});

// POST /api/internal/superuser/properties/:id/bulk-rooms - Bulk create rooms
router.post('/properties/:id/bulk-rooms', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: propertyId } = req.params;
    const { floors } = req.body;
    
    if (!floors || !Array.isArray(floors) || floors.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Floors array is required' });
    }
    
    const property = await Property.findByPk(propertyId);
    if (!property) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    // Map property type to room category
    const typeToCategoryMap = {
      'hotel': 'Hotel Room',
      'pg': 'PG',
      'hostel': 'PG',
      'homestay': 'Home Stay',
      'apartment': 'Independent Home'
    };
    const roomCategory = typeToCategoryMap[property.type] || 'PG';
    
    const createdRooms = [];
    const errors = [];
    
    for (const floor of floors) {
      const { floorNumber, roomNumberStart, roomNumberEnd, category, sharingType, price } = floor;
      
      if (floorNumber === undefined || !roomNumberStart || !roomNumberEnd) {
        errors.push(`Floor ${floorNumber}: Missing required fields`);
        continue;
      }
      
      const startNum = parseInt(roomNumberStart.toString().replace(/\D/g, ''));
      const endNum = parseInt(roomNumberEnd.toString().replace(/\D/g, ''));
      
      if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
        errors.push(`Floor ${floorNumber}: Invalid room number range`);
        continue;
      }
      
      for (let roomNum = startNum; roomNum <= endNum; roomNum++) {
        const roomNumber = roomNum.toString();
        // Map sharing type and calculate beds
        const sharingTypeMap = {
          'single': 'single',
          '2_sharing': 'double',
          '3_sharing': 'triple',
          'quad': 'quad',
          'dormitory': 'dormitory'
        };
        const mappedSharingType = sharingTypeMap[sharingType] || 'single';
        const bedCountMap = {
          'single': 1,
          'double': 2,
          'triple': 3,
          'quad': 4,
          'dormitory': 6
        };
        const totalBeds = bedCountMap[mappedSharingType];
        
        try {
          const room = await Room.create({
            propertyId: propertyId,
            title: `${property.name} - Room ${roomNumber}`,
            description: `Room ${roomNumber} on Floor ${floorNumber}`,
            category: roomCategory,
            roomType: roomType,
            pricingType: property.type === 'hotel' ? 'per_night' : 'per_month',
            location: property.location,
            amenities: property.amenities || [],
            rules: property.rules || [],
            price: price || 0,
            maxGuests: totalBeds,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            sharingType: roomCategory === 'PG' ? mappedSharingType : null,
            totalBeds: roomCategory === 'PG' ? totalBeds : null,
            currentStatus: 'vacant_clean',
            isActive: true,
            approvalStatus: 'approved',
            approvedAt: new Date(),
            approvedBy: req.user.id
          }, { transaction });
          
          // TODO: Create bed assignments (temporarily disabled due to room_id_old constraint issue)
          // if (roomCategory === 'PG' && sharingType) {
          //   for (let bedNum = 1; bedNum <= totalBeds; bedNum++) {
          //     await BedAssignment.create({ roomId: room.id, bedNumber: bedNum, status: 'vacant' }, { transaction });
          //   }
          // }
          
          createdRooms.push(room);
        } catch (roomError) {
          errors.push(`Room ${roomNumber} on Floor ${floorNumber}: ${roomError.message}`);
        }
      }
    }
    
    await transaction.commit();
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdRooms.length} rooms`,
      data: {
        createdRooms: createdRooms.map(r => ({ id: r.id, roomNumber: r.roomNumber, floorNumber: r.floorNumber, sharingType: r.sharingType, totalBeds: r.totalBeds })),
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error bulk creating rooms:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk create rooms', error: error.message });
  }
});

// PUT /api/internal/superuser/properties/:id/transfer-ownership - Transfer property ownership
router.put('/properties/:id/transfer-ownership', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: propertyId } = req.params;
    const { newOwnerId } = req.body;
    
    if (!newOwnerId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'New owner ID is required' });
    }
    
    const newOwner = await User.findOne({ where: { id: newOwnerId, role: { [Op.in]: ['owner', 'category_owner'] } } });
    if (!newOwner) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'New owner not found' });
    }
    
    const property = await Property.findByPk(propertyId);
    if (!property) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    const oldOwnerId = property.ownerId;
    
    // Update property owner
    property.ownerId = newOwnerId;
    await property.save({ transaction });
    
    // Note: Rooms don't have ownerId - they're linked to properties via propertyId
    // The property's ownerId change automatically affects all rooms
    
    await transaction.commit();
    
    try {
      const oldOwner = await User.findByPk(oldOwnerId);
      if (oldOwner) {
        await sendEmail({
          to: oldOwner.email,
          subject: 'Property Ownership Transfer',
          html: `<h2>Property Transfer</h2><p>The property "${property.name}" has been transferred to another owner.</p>`
        });
      }
      await sendEmail({
        to: newOwner.email,
        subject: 'New Property Assigned',
        html: `<h2>New Property</h2><p>The property "${property.name}" has been assigned to you.</p>`
      });
    } catch (emailError) {
      console.error('Error sending transfer emails:', emailError);
    }
    
    res.json({ success: true, message: 'Property ownership transferred successfully', data: { property: property.toJSON(), oldOwnerId, newOwnerId } });
  } catch (error) {
    await transaction.rollback();
    console.error('Error transferring property ownership:', error);
    res.status(500).json({ success: false, message: 'Failed to transfer property ownership', error: error.message });
  }
});

// GET /api/internal/superuser/properties/:id/statistics - Get property statistics
router.get('/properties/:id/statistics', async (req, res) => {
  try {
    const { id: propertyId } = req.params;
    const property = await Property.findByPk(propertyId, {
      include: [{
        model: Room,
        as: 'rooms',
        attributes: ['id', 'roomNumber', 'floorNumber', 'currentStatus', 'sharingType', 'totalBeds'],
        include: [{
          model: Booking,
          as: 'bookings',
          attributes: ['id', 'status', 'checkInDate', 'checkOutDate', 'totalAmount']
        }]
      }]
    });
    
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    
    const rooms = property.rooms || [];
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.currentStatus === 'occupied').length;
    const vacantCleanRooms = rooms.filter(r => r.currentStatus === 'vacant_clean').length;
    const vacantDirtyRooms = rooms.filter(r => r.currentStatus === 'vacant_dirty').length;
    const currentOccupancy = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;
    
    const allBookings = rooms.flatMap(r => r.bookings || []);
    const completedBookings = allBookings.filter(b => b.status === 'completed');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);
    
    res.json({
      success: true,
      data: {
        property: { 
          id: property.id, 
          name: property.name, 
          type: property.type,
          location: property.location
        },
        statistics: {
          totalRooms, 
          occupiedRooms, 
          vacantCleanRooms, 
          vacantDirtyRooms,
          currentOccupancy: parseFloat(currentOccupancy),
          totalBookings: allBookings.length,
          completedBookings: completedBookings.length,
          activeBookings: allBookings.filter(b => b.status === 'active').length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching property statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property statistics', error: error.message });
  }
});

// ============================================
// Bulk Room Creation Endpoint
// ============================================

/**
 * POST /api/internal/superuser/bulk-create-rooms
 * Bulk create rooms for a property using floor convention
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
router.post('/bulk-create-rooms',
  auditLog('bulk_create_rooms', 'room', {
    getResourceId: (req, data) => req.body.propertyId,
    getChanges: (req, data) => ({
      propertyId: req.body.propertyId,
      floorNumber: req.body.floorNumber,
      roomRange: `${req.body.startRoom}-${req.body.endRoom}`,
      sharingType: req.body.sharingType,
      roomsCreated: data.data?.created || 0
    })
  }),
  async (req, res) => {
    const { v4: uuidv4 } = require('uuid');
    const transaction = await sequelize.transaction();
    
    try {
      const { propertyId, floorNumber, startRoom, endRoom, sharingType, price = 5000 } = req.body;
      
      // Validation: Required fields
      if (!propertyId || floorNumber === undefined || !startRoom || !endRoom || !sharingType) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: propertyId, floorNumber, startRoom, endRoom, and sharingType are required'
        });
      }
      
      // Validation: Floor number (1-50)
      const floorNum = parseInt(floorNumber);
      if (isNaN(floorNum) || floorNum < 1 || floorNum > 50) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Floor number must be between 1 and 50'
        });
      }
      
      // Validation: Room range
      const startRoomNum = parseInt(startRoom);
      const endRoomNum = parseInt(endRoom);
      
      if (isNaN(startRoomNum) || isNaN(endRoomNum)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start room and end room must be valid numbers'
        });
      }
      
      if (startRoomNum > endRoomNum) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Start room number must be less than or equal to end room number'
        });
      }
      
      // Validation: Max 100 rooms per batch
      const roomCount = endRoomNum - startRoomNum + 1;
      if (roomCount > 100) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Cannot create more than 100 rooms per batch'
        });
      }
      
      // Map sharing types (accept both old and new formats)
      const sharingTypeMap = {
        'single': 'single',
        '2_sharing': 'double', 
        '3_sharing': 'triple',
        'quad': 'quad',
        'dormitory': 'dormitory',
        'double': 'double',
        'triple': 'triple'
      };
      
      const mappedSharingType = sharingTypeMap[sharingType];
      if (!mappedSharingType) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid sharing type. Must be one of: ${Object.keys(sharingTypeMap).join(', ')}`
        });
      }
      
      // Bed count mapping
      const bedCounts = {
        'single': 1,
        'double': 2,
        'triple': 3,
        'quad': 4,
        'dormitory': 6
      };
      const totalBeds = bedCounts[mappedSharingType];
      
      // Create rooms using direct SQL (bypasses all Sequelize model issues)
      const createdRooms = [];
      const errors = [];
      
      for (let roomNum = startRoomNum; roomNum <= endRoomNum; roomNum++) {
        const roomNumber = `${floorNum}${String(roomNum).padStart(2, '0')}`;
        const roomId = uuidv4();
        
        try {
          // Check if room already exists
          const [existingRooms] = await sequelize.query(
            'SELECT id FROM rooms WHERE property_id = :propertyId AND room_number = :roomNumber',
            {
              replacements: { propertyId, roomNumber },
              transaction
            }
          );
          
          if (existingRooms.length > 0) {
            errors.push(`Room ${roomNumber} already exists in this property`);
            continue;
          }
          
          // Insert room directly with raw SQL
          await sequelize.query(`
            INSERT INTO rooms (
              id, property_id, room_number, floor_number, 
              title, description, room_type, sharing_type, 
              total_beds, price, pricing_type, 
              current_status, is_active, 
              amenities, images, 
              created_at, updated_at
            ) VALUES (
              :id, :propertyId, :roomNumber, :floorNumber,
              :title, :description, :roomType, :sharingType,
              :totalBeds, :price, :pricingType,
              :currentStatus, :isActive,
              :amenities, :images,
              NOW(), NOW()
            )
          `, {
            replacements: {
              id: roomId,
              propertyId: propertyId,
              roomNumber: roomNumber,
              floorNumber: floorNum,
              title: `Room ${roomNumber}`,
              description: `${mappedSharingType} room ${roomNumber} on floor ${floorNum}`,
              roomType: 'shared',
              sharingType: mappedSharingType,
              totalBeds: totalBeds,
              price: price,
              pricingType: 'per_month',
              currentStatus: 'vacant_clean',
              isActive: true,
              amenities: '{}',
              images: '{}'
            },
            transaction
          });
          
          createdRooms.push({
            id: roomId,
            roomNumber: roomNumber,
            floorNumber: floorNum,
            sharingType: mappedSharingType,
            totalBeds: totalBeds,
            price: price
          });
          
        } catch (roomError) {
          console.error(`Error creating room ${roomNumber}:`, roomError);
          errors.push(`Room ${roomNumber}: ${roomError.message}`);
        }
      }
      
      await transaction.commit();
      
      // Return response
      const response = {
        success: true,
        message: `Successfully created ${createdRooms.length} room(s)`,
        data: {
          created: createdRooms.length,
          total: roomCount,
          rooms: createdRooms
        }
      };
      
      if (errors.length > 0) {
        response.warnings = errors;
        response.message = `Created ${createdRooms.length} of ${roomCount} rooms. ${errors.length} room(s) had errors.`;
      }
      
      res.status(201).json(response);
      
    } catch (error) {
      await transaction.rollback();
      console.error('Error bulk creating rooms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk create rooms',
        error: error.message
      });
    }
  }
);

module.exports = router;
