const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { sequelize } = require('../../models');
const User = require('../../models/User');
const Property = require('../../models/Property');
const Lead = require('../../models/Lead');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');

const router = express.Router();

// Multer setup for property image uploads
const propertyImagesDir = path.join(__dirname, '..', '..', 'uploads', 'properties');
if (!fs.existsSync(propertyImagesDir)) {
  fs.mkdirSync(propertyImagesDir, { recursive: true });
}

const propertyImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, propertyImagesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `prop-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const propertyImageUpload = multer({
  storage: propertyImageStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

// @desc    Get properties for internal management
// @route   GET /api/internal/properties
// @access  Private
router.get('/internal/properties', async (req, res) => {
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

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default high limit for properties
    const offset = (page - 1) * limit;

    // For property owners, filter to show only their properties
    // For superusers/admins, show all properties
    let whereClause = {};
    
    if (user.role === 'owner') {
      // Property owners should only see their own properties
      // For now, we'll use email matching since we don't have propertyId in User model yet
      whereClause.email = user.email;
    }

    try {
      // Get properties from the database using raw query
      let whereClause = '';
      let queryParams = [];
      
      if (user.role === 'owner') {
        // Property owners should only see their own properties
        whereClause = 'WHERE p.owner_id = $1';
        queryParams = [user.id];
      }

      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
          COUNT(DISTINCT r.id) as actual_room_count,
          COUNT(DISTINCT b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'completed', 'refunded')) as active_bookings
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN rooms r ON (r.property_details->>'propertyId' = p.id::text OR r.property_id = p.id)
          AND r.is_active = true AND r.approval_status = 'approved'
        LEFT JOIN bookings b ON b.room_id = r.id
        ${whereClause}
        GROUP BY p.id, u.name, u.email, u.phone
        ORDER BY p.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `, {
        bind: queryParams
      });

      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as count FROM properties p ${whereClause}
      `, {
        bind: queryParams
      });
      
      const totalProperties = parseInt(countResult[0].count);

      // Convert properties to frontend format
      const formattedProperties = properties.map((property) => {
        return {
          id: property.id,
          name: property.title || property.name || property.property_name || 'Unnamed Property',
          ownerName: property.owner_name || user.name,
          ownerEmail: property.owner_email || user.email,
          ownerPhone: property.owner_phone || '+91 98765 43210',
          type: property.category || property.property_type || 'hotel',
          address: {
            street: property.address || (property.location && typeof property.location === 'object' ? property.location.address : 'Address not provided'),
            city: property.city || (property.location && typeof property.location === 'object' ? property.location.city : 'Unknown'),
            state: property.state || (property.location && typeof property.location === 'object' ? property.location.state : 'Unknown'),
            country: property.country || (property.location && typeof property.location === 'object' ? property.location.country : 'India'),
            pincode: property.pincode || (property.location && typeof property.location === 'object' ? property.location.pincode : '')
          },
          totalRooms: parseInt(property.actual_room_count) || property.total_rooms || 0,
          occupiedRooms: parseInt(property.active_bookings) || 0,
          availableRooms: Math.max(0, (parseInt(property.actual_room_count) || property.total_rooms || 0) - (parseInt(property.active_bookings) || 0)),
          status: (property.is_active !== false && property.isActive !== false) ? 'active' : 'inactive',
          onboardingStatus: (property.approval_status === 'approved' || property.approvalStatus === 'approved') ? 'completed' : 'in_progress',
          revenue: {
            currentMonth: (property.total_rooms || property.totalRooms || 0) * 3000,
            currency: 'INR'
          },
          occupancyRate: 75.0,
          createdAt: property.created_at || property.createdAt,
          updatedAt: property.updated_at || property.updatedAt
        };
      });

      res.json({
        success: true,
        count: formattedProperties.length,
        total: totalProperties,
        page,
        pages: Math.ceil(totalProperties / limit),
        data: formattedProperties
      });
    } catch (dbError) {
      console.error('Database query error in properties:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching properties from database'
      });
    }
  } catch (error) {
    console.error('Internal properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties'
    });
  }
});

// @desc    Get single property details for internal management
// @route   GET /api/internal/properties/:id
// @access  Private
router.get('/internal/properties/:id', async (req, res) => {
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
      // Get property from the database using raw query
      let whereClause = 'WHERE p.id = $1';
      let queryParams = [id];
      
      if (user.role === 'owner') {
        whereClause = 'WHERE p.id = $1 AND p.owner_id = $2';
        queryParams = [id, user.id];
      }

      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        ${whereClause}
      `, {
        bind: queryParams
      });

      if (!properties || properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found or access denied'
        });
      }

      const property = properties[0];

      // Get rooms for this property
      let rooms = [];
      let roomCount = 0;
      let occupiedCount = 0;
      try {
        const [roomsData] = await sequelize.query(`
          SELECT id, title, price, max_guests, property_details
          FROM rooms 
          WHERE is_active = true 
          AND approval_status = 'approved'
          AND property_details->>'propertyId' = $1
          ORDER BY title
        `, {
          bind: [id]
        });
        
        rooms = (roomsData || []).map((room) => {
          const propertyDetails = room.property_details || {};
          const roomNumber = (room.title || '').replace('Room ', '');
          return {
            id: room.id,
            roomNumber: roomNumber,
            floorNumber: propertyDetails.floorNumber || Math.floor(parseInt(roomNumber) / 100) || 1,
            sharingType: propertyDetails.sharingType || 'single',
            totalBeds: propertyDetails.totalBeds || room.max_guests || 1,
            currentStatus: propertyDetails.currentStatus || 'vacant_clean',
            occupiedBeds: propertyDetails.occupiedBeds || 0,
            availableBeds: propertyDetails.availableBeds || propertyDetails.totalBeds || room.max_guests || 1,
            dailyRate: propertyDetails.dailyRate || room.price || 0,
            monthlyRate: propertyDetails.monthlyRate || 0,
            description: `Room ${roomNumber} - ${propertyDetails.sharingType || 'single'} sharing`
          };
        });
        
        roomCount = rooms.length;
        occupiedCount = rooms.filter(r => r.currentStatus === 'occupied').length;
      } catch (roomError) {
        console.error('Error fetching rooms:', roomError);
      }

      // Parse JSONB fields
      const location = typeof property.location === 'string' ? JSON.parse(property.location) : (property.location || {});
      const contactInfo = typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : (property.contact_info || {});
      const images = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);

      // Format the property data with all fields
      const formattedProperty = {
        id: property.id,
        name: property.name || 'Unnamed Property',
        description: property.description || '',
        type: property.type || 'hotel',
        ownerId: property.owner_id,
        ownerName: property.owner_name,
        ownerEmail: property.owner_email,
        ownerPhone: property.owner_phone,
        location: {
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          country: location.country || 'India',
          pincode: location.pincode || '',
          latitude: location.latitude || null,
          longitude: location.longitude || null
        },
        contactInfo: {
          phone: contactInfo.phone || property.owner_phone || '',
          email: contactInfo.email || property.owner_email || '',
          website: contactInfo.website || ''
        },
        amenities: property.amenities || [],
        images: images,
        rules: property.rules || [],
        checkInTime: property.check_in_time || '14:00',
        checkOutTime: property.check_out_time || '11:00',
        totalFloors: property.total_floors || 1,
        totalRooms: roomCount || property.total_rooms || 0,
        occupiedRooms: occupiedCount,
        availableRooms: (roomCount || property.total_rooms || 0) - occupiedCount,
        occupancyRate: roomCount > 0 ? ((occupiedCount / roomCount) * 100).toFixed(1) : 0,
        isActive: property.is_active !== false,
        isFeatured: property.is_featured === true,
        approvalStatus: property.approval_status || 'pending',
        rating: typeof property.rating === 'string' ? JSON.parse(property.rating) : (property.rating || {}),
        metadata: typeof property.metadata === 'string' ? JSON.parse(property.metadata) : (property.metadata || {}),
        rooms: rooms,
        createdAt: property.created_at,
        updatedAt: property.updated_at
      };

      res.json({
        success: true,
        data: formattedProperty
      });
    } catch (dbError) {
      console.error('Database query error in property details:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property details from database'
      });
    }
  } catch (error) {
    console.error('Internal property details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property details'
    });
  }
});

// @desc    Update property details for internal management
// @route   PUT /api/internal/properties/:id
// @access  Private
router.put('/internal/properties/:id', async (req, res) => {
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
    const updateData = req.body;

    // For property owners, ensure they can only update their own properties
    let whereClause = 'WHERE p.id = $1';
    let queryParams = [id];
    
    if (user.role === 'owner') {
      whereClause = 'WHERE p.id = $1 AND p.owner_id = $2';
      queryParams = [id, user.id];
    }

    // Check if property exists and user has access
    const [existingProperties] = await sequelize.query(`
      SELECT * FROM properties p ${whereClause}
    `, {
      bind: queryParams
    });

    if (!existingProperties || existingProperties.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or access denied'
      });
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = user.role === 'owner' ? 3 : 2;

    // Basic info
    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }
    if (updateData.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(updateData.type);
    }

    // Location (JSONB)
    if (updateData.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.location));
    }

    // Contact info (JSONB)
    if (updateData.contactInfo !== undefined) {
      updateFields.push(`contact_info = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.contactInfo));
    }

    // Amenities (array)
    if (updateData.amenities !== undefined) {
      updateFields.push(`amenities = $${paramIndex++}`);
      updateValues.push(updateData.amenities);
    }

    // Images (JSONB)
    if (updateData.images !== undefined) {
      updateFields.push(`images = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.images));
    }

    // Rules (array)
    if (updateData.rules !== undefined) {
      updateFields.push(`rules = $${paramIndex++}`);
      updateValues.push(updateData.rules);
    }

    // Check-in/Check-out times
    if (updateData.checkInTime !== undefined) {
      updateFields.push(`check_in_time = $${paramIndex++}`);
      updateValues.push(updateData.checkInTime);
    }
    if (updateData.checkOutTime !== undefined) {
      updateFields.push(`check_out_time = $${paramIndex++}`);
      updateValues.push(updateData.checkOutTime);
    }

    // Total floors/rooms
    if (updateData.totalFloors !== undefined) {
      updateFields.push(`total_floors = $${paramIndex++}`);
      updateValues.push(updateData.totalFloors);
    }
    if (updateData.totalRooms !== undefined) {
      updateFields.push(`total_rooms = $${paramIndex++}`);
      updateValues.push(updateData.totalRooms);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at, nothing else to update
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Execute update
    const updateWhereClause = user.role === 'owner'
      ? 'WHERE id = $1 AND owner_id = $2'
      : 'WHERE id = $1';

    await sequelize.query(`
      UPDATE properties 
      SET ${updateFields.join(', ')}
      ${updateWhereClause}
    `, {
      bind: [...queryParams, ...updateValues]
    });

    // Fetch updated property
    const [updatedProperties] = await sequelize.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p 
      LEFT JOIN users u ON p.owner_id = u.id 
      ${whereClause}
    `, {
      bind: queryParams
    });

    const property = updatedProperties[0];

    // Format response
    const formattedProperty = {
      id: property.id,
      name: property.name,
      description: property.description,
      type: property.type,
      location: typeof property.location === 'string' ? JSON.parse(property.location) : property.location,
      contactInfo: typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : property.contact_info,
      amenities: property.amenities || [],
      images: typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []),
      rules: property.rules || [],
      checkInTime: property.check_in_time,
      checkOutTime: property.check_out_time,
      totalFloors: property.total_floors,
      totalRooms: property.total_rooms,
      isActive: property.is_active,
      isFeatured: property.is_featured,
      approvalStatus: property.approval_status,
      ownerId: property.owner_id,
      ownerName: property.owner_name,
      ownerEmail: property.owner_email,
      createdAt: property.created_at,
      updatedAt: property.updated_at
    };

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: formattedProperty
    });

  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property'
    });
  }
});

// @desc    Upload images for a property
// @route   POST /api/internal/properties/:id/upload-images
// @access  Private (owner, admin, superuser)
router.post('/internal/properties/:id/upload-images', propertyImageUpload.array('images', 10), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Build the base URL for serving uploaded files
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const uploadedImages = req.files.map((file, index) => ({
      url: `/uploads/properties/${file.filename}`,
      caption: '',
      isPrimary: index === 0 && req.body.setFirstAsPrimary === 'true'
    }));

    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: uploadedImages
    });
  } catch (error) {
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (_) {}
      });
    }
    console.error('Property image upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error uploading images' });
  }
});

// @desc    Direct property creation for superusers/platform admins (bypasses lead workflow)
// @route   POST /api/internal/properties/direct
// @access  Private (superuser, platform_admin only)
router.post('/internal/properties/direct', async (req, res) => {
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

    // Only superusers and platform admins can create properties directly
    const allowedRoles = ['superuser', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only superusers and platform admins can create properties directly.'
      });
    }

    const {
      // Property details
      name,
      description,
      type,
      location,
      contactInfo,
      amenities,
      images,
      rules,
      totalFloors,
      totalRooms,
      checkInTime,
      checkOutTime,
      // Owner details
      ownerName,
      ownerEmail,
      ownerPhone,
      existingOwnerId,
      createNewOwner
    } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Property name and type are required'
      });
    }

    if (!location || !location.city || !location.state) {
      return res.status(400).json({
        success: false,
        message: 'Property location (city and state) is required'
      });
    }

    // Validate owner information
    if (!existingOwnerId && createNewOwner) {
      if (!ownerName || !ownerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Owner name and email are required when creating a new owner'
        });
      }
    }

    let ownerId = existingOwnerId;

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create new owner if needed
      if (createNewOwner && !existingOwnerId) {
        // Check if user with this email already exists
        const existingUser = await User.findOne({
          where: { email: ownerEmail.toLowerCase() },
          transaction
        });

        if (existingUser) {
          // Use existing user as owner
          ownerId = existingUser.id;
          
          // Update role to owner if not already
          if (existingUser.role === 'user') {
            await existingUser.update({ role: 'owner' }, { transaction });
          }
        } else {
          // Create new user as property owner
          const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
          const newOwner = await User.create({
            name: ownerName,
            email: ownerEmail.toLowerCase(),
            phone: ownerPhone || null,
            password: tempPassword,
            role: 'owner',
            isVerified: true // Auto-verify since created by admin
          }, { transaction });

          ownerId = newOwner.id;

          // TODO: Send welcome email with temporary password
          console.log(`New owner created: ${ownerEmail} with temp password (should be emailed)`);
        }
      }

      // Validate that we have an owner
      if (!ownerId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Property owner is required. Either select an existing owner or create a new one.'
        });
      }

      // Strip 'owner_' prefix if present
      const cleanOwnerId = ownerId.replace(/^owner_/, '');

      // Create the property directly with approved status
      // Normalize type to lowercase to match DB enum ('pg', 'hostel', 'hotel', 'apartment')
      const typeMap = { 'PG': 'pg', 'Hotel': 'hotel', 'Hostel': 'hostel', 'Apartment': 'apartment' };
      const normalizedType = typeMap[type] || (type ? type.toLowerCase() : 'pg');

      const property = await Property.create({
        name,
        description: description || null,
        type: normalizedType,
        ownerId: cleanOwnerId,
        location: location || {},
        contactInfo: contactInfo || {},
        amenities: amenities || [],
        images: images || [],
        rules: rules || [],
        totalFloors: totalFloors || null,
        totalRooms: totalRooms || null,
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        isActive: true,
        isFeatured: false,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user.id,
        metadata: {
          createdDirectly: true,
          createdBy: user.id,
          createdByName: user.name,
          createdByRole: user.role,
          bypassedLeadWorkflow: true
        }
      }, { transaction });

      // Commit transaction
      await transaction.commit();

      // Fetch the created property with owner details
      const createdProperty = await Property.findByPk(property.id, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }]
      });

      res.status(201).json({
        success: true,
        message: 'Property created successfully (bypassed lead workflow)',
        data: {
          id: createdProperty.id,
          name: createdProperty.name,
          description: createdProperty.description,
          type: createdProperty.type,
          location: createdProperty.location,
          contactInfo: createdProperty.contactInfo,
          amenities: createdProperty.amenities,
          images: createdProperty.images,
          rules: createdProperty.rules,
          totalFloors: createdProperty.totalFloors,
          totalRooms: createdProperty.totalRooms,
          checkInTime: createdProperty.checkInTime,
          checkOutTime: createdProperty.checkOutTime,
          isActive: createdProperty.isActive,
          approvalStatus: createdProperty.approvalStatus,
          approvedAt: createdProperty.approvedAt,
          owner: createdProperty.owner ? {
            id: createdProperty.owner.id,
            name: createdProperty.owner.name,
            email: createdProperty.owner.email,
            phone: createdProperty.owner.phone
          } : null,
          createdAt: createdProperty.createdAt
        }
      });

    } catch (dbError) {
      await transaction.rollback();
      console.error('Database error creating property:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Direct property creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: error.message
    });
  }
});

// @desc    Get all properties for platform management (superusers/admins only)
// @route   GET /api/internal/platform/properties
// @access  Private
router.get('/internal/platform/properties', async (req, res) => {
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

    // Check if user has platform management permissions (superuser, admin, category_owner)
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;

    try {
      // Get all properties with actual room counts from the rooms table
      const [properties] = await sequelize.query(`
        SELECT p.*, 
               u.name as owner_name, 
               u.email as owner_email,
               COALESCE(r.total_rooms, 0) as actual_total_rooms,
               COALESCE(r.occupied_rooms, 0) as actual_occupied_rooms
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        LEFT JOIN (
          SELECT 
            property_details->>'propertyId' as property_id,
            COUNT(*) as total_rooms,
            COUNT(CASE WHEN property_details->>'currentStatus' = 'occupied' THEN 1 END) as occupied_rooms
          FROM rooms 
          WHERE is_active = true
          AND property_details->>'propertyId' IS NOT NULL
          GROUP BY property_details->>'propertyId'
        ) r ON r.property_id = p.id::text
        ORDER BY p.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `);

      const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM properties');
      const totalProperties = parseInt(countResult[0].count);

      // Convert properties to platform format
      const formattedProperties = properties.map((property) => {
        const totalRooms = parseInt(property.actual_total_rooms) || 0;
        const occupiedRooms = parseInt(property.actual_occupied_rooms) || 0;
        const availableRooms = totalRooms - occupiedRooms;
        
        return {
          id: property.id,
          name: property.title || property.name || property.property_name || 'Unnamed Property',
          title: property.title || property.name || property.property_name || 'Unnamed Property',
          category: {
            name: property.category || property.property_type || property.type || 'hotel',
            id: property.category || property.property_type || property.type || 'hotel'
          },
          location: property.location ? (typeof property.location === 'string' ? JSON.parse(property.location) : property.location) : {
            address: property.address || 'Address not provided',
            city: property.city || 'Unknown',
            state: property.state || 'Unknown',
            country: property.country || 'India'
          },
          owner: {
            id: property.owner_id || property.ownerId,
            name: property.owner_name || 'Unknown Owner',
            email: property.owner_email || 'unknown@example.com'
          },
          statistics: {
            totalRooms: totalRooms,
            occupiedRooms: occupiedRooms,
            availableRooms: availableRooms
          },
          isActive: property.is_active !== false && property.isActive !== false,
          status: (property.is_active !== false && property.isActive !== false) ? 'active' : 'inactive',
          onboardingStatus: (property.approval_status === 'approved' || property.approvalStatus === 'approved') ? 'completed' : 'in_progress',
          revenue: {
            currentMonth: totalRooms * 3000,
            currency: 'INR'
          },
          occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
          createdAt: property.created_at || property.createdAt,
          updatedAt: property.updated_at || property.updatedAt
        };
      });

      res.json({
        success: true,
        count: formattedProperties.length,
        total: totalProperties,
        page,
        pages: Math.ceil(totalProperties / limit),
        data: formattedProperties
      });
    } catch (dbError) {
      console.error('Database query error in platform properties:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching properties'
      });
    }
  } catch (error) {
    console.error('Internal platform properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform properties'
    });
  }
});

// @desc    Get single property details for platform management
// @route   GET /api/internal/platform/properties/:id
// @access  Private
router.get('/internal/platform/properties/:id', async (req, res) => {
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

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id } = req.params;

    try {
      // Get property from the properties table
      const [properties] = await sequelize.query(`
        SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.id = $1
      `, { bind: [id] });

      if (!properties || properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = properties[0];

      // Get actual room count and stats from rooms table
      const [roomStats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_rooms,
          COUNT(CASE WHEN property_details->>'currentStatus' = 'occupied' THEN 1 END) as occupied_rooms
        FROM rooms 
        WHERE is_active = true 
        AND property_details->>'propertyId' = $1
      `, { bind: [id] });

      const totalRooms = parseInt(roomStats[0]?.total_rooms) || 0;
      const occupiedRooms = parseInt(roomStats[0]?.occupied_rooms) || 0;

      // Parse JSONB fields
      const location = typeof property.location === 'string' ? JSON.parse(property.location) : (property.location || {});
      const contactInfo = typeof property.contact_info === 'string' ? JSON.parse(property.contact_info) : (property.contact_info || {});
      const images = typeof property.images === 'string' ? JSON.parse(property.images) : (property.images || []);

      // Format the property data
      const formattedProperty = {
        id: property.id,
        name: property.name || 'Unnamed Property',
        description: property.description || '',
        type: property.type || 'hotel',
        ownerId: property.owner_id,
        ownerName: property.owner_name,
        ownerEmail: property.owner_email,
        ownerPhone: property.owner_phone,
        location: {
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          country: location.country || 'India',
          pincode: location.pincode || ''
        },
        contactInfo: contactInfo,
        amenities: property.amenities || [],
        images: images,
        rules: property.rules || [],
        checkInTime: property.check_in_time || '14:00',
        checkOutTime: property.check_out_time || '11:00',
        totalFloors: property.total_floors || 1,
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
        isActive: property.is_active !== false,
        isFeatured: property.is_featured === true,
        approvalStatus: property.approval_status || 'pending',
        status: property.is_active !== false ? 'active' : 'inactive',
        onboardingStatus: property.approval_status === 'approved' ? 'completed' : 'in_progress',
        revenue: {
          currentMonth: totalRooms * 3000,
          currency: 'INR'
        },
        createdAt: property.created_at,
        updatedAt: property.updated_at
      };

      res.json({
        success: true,
        data: formattedProperty
      });
    } catch (dbError) {
      console.error('Database query error in platform property details:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error while fetching property details'
      });
    }
  } catch (error) {
    console.error('Internal platform property details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform property details'
    });
  }
});

// @desc    Change property owner (transfer ownership)
// @route   PUT /api/internal/platform/properties/:id/owner
// @access  Private
router.put('/internal/platform/properties/:id/owner', async (req, res) => {
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

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id: propertyId } = req.params;
    const { newOwnerId, reason } = req.body;

    // Validate required fields
    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'New owner ID is required'
      });
    }

    try {
      // Check if property exists
      const [propertyCheck] = await sequelize.query(
        'SELECT id, name, owner_id FROM properties WHERE id = $1',
        { bind: [propertyId] }
      );

      if (!propertyCheck || propertyCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const property = propertyCheck[0];

      // Check if new owner exists and has owner role
      const newOwner = await User.findOne({
        where: {
          id: newOwnerId,
          role: 'owner',
          is_verified: true
        }
      });

      if (!newOwner) {
        return res.status(400).json({
          success: false,
          message: 'New owner not found or not verified'
        });
      }

      // Check if it's actually a different owner
      if (property.owner_id === newOwnerId) {
        return res.status(400).json({
          success: false,
          message: 'Property is already owned by this user'
        });
      }

      // Update property ownership
      await sequelize.query(
        'UPDATE properties SET owner_id = $1, updated_at = $2 WHERE id = $3',
        { bind: [newOwnerId, new Date(), propertyId] }
      );

      // Log the ownership change (you could create an audit log table for this)
      console.log(`Property ownership changed: ${propertyId} from ${property.owner_id} to ${newOwnerId} by ${user.id}. Reason: ${reason || 'No reason provided'}`);

      res.json({
        success: true,
        message: 'Property ownership transferred successfully',
        data: {
          propertyId,
          previousOwnerId: property.owner_id,
          newOwnerId,
          changedBy: user.id,
          reason: reason || null,
          timestamp: new Date().toISOString()
        }
      });

    } catch (dbError) {
      console.error('Database error in change property owner:', dbError);
      res.status(500).json({
        success: false,
        message: 'Database error occurred',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }

  } catch (error) {
    console.error('Error in change property owner:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Get property owners for superuser management (legacy endpoint)
// @route   GET /api/internal/superuser/property-owners
// @access  Private
router.get('/internal/superuser/property-owners', async (req, res) => {
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

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
      // Simple approach: get owners from leads + properties using separate queries
      const { sequelize } = require('../../models');
      const { Op } = require('sequelize');

      // 1. Get all leads grouped by email
      const leads = await Lead.findAll({
        attributes: ['id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 'created_at'],
        order: [['created_at', 'DESC']]
      });

      // 2. Get property counts per owner from properties table
      const [propCounts] = await sequelize.query(`
        SELECT owner_id, COUNT(*) as count, SUM(COALESCE(total_rooms, 0)) as total_rooms,
               STRING_AGG(DISTINCT type::text, ', ') as types,
               STRING_AGG(DISTINCT (location->>'city'), ', ') FILTER (WHERE location->>'city' IS NOT NULL) as cities
        FROM properties GROUP BY owner_id
      `);
      const propCountMap = new Map(propCounts.map(r => [r.owner_id, r]));

      // 3. Get all users with owner-like roles
      const ownerUsers = await User.findAll({
        where: { role: { [Op.in]: ['owner', 'category_owner', 'admin', 'superuser'] } },
        attributes: ['id', 'name', 'email', 'phone', 'isVerified', 'role', 'created_at', 'updated_at']
      });

      // Build owner map keyed by email
      const ownerMap = new Map();

      // Add users with properties first
      ownerUsers.forEach(u => {
        const props = propCountMap.get(u.id);
        const propCount = props ? parseInt(props.count) : 0;
        // Only include if they have properties or are an owner role
        if (propCount > 0 || ['owner', 'category_owner'].includes(u.role)) {
          ownerMap.set(u.email, {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            isVerified: u.isVerified !== false,
            propertiesCount: propCount,
            totalRooms: props ? parseInt(props.total_rooms) : 0,
            propertyTypes: props ? props.types : '',
            cities: props ? props.cities : '',
            createdAt: u.get('created_at') || new Date().toISOString(),
            updatedAt: u.get('updated_at') || new Date().toISOString()
          });
        }
      });

      // Add lead-only owners (not already in map)
      const leadsByEmail = new Map();
      leads.forEach(lead => {
        if (!lead.email) return;
        if (!leadsByEmail.has(lead.email)) {
          leadsByEmail.set(lead.email, { leads: [], firstLead: lead });
        }
        leadsByEmail.get(lead.email).leads.push(lead);
      });

      leadsByEmail.forEach((data, email) => {
        if (ownerMap.has(email)) {
          // Owner already exists from users — add lead count if higher
          const existing = ownerMap.get(email);
          if (data.leads.length > existing.propertiesCount) {
            existing.propertiesCount = data.leads.length;
          }
          const leadRooms = data.leads.reduce((s, l) => s + (l.estimated_rooms || 0), 0);
          if (leadRooms > existing.totalRooms) {
            existing.totalRooms = leadRooms;
          }
        } else {
          // Lead-only owner — use lead ID so detail page can find them
          const first = data.firstLead;
          ownerMap.set(email, {
            id: first.id,
            name: first.property_owner_name || email,
            email: email,
            phone: first.phone || '',
            isVerified: first.status === 'approved',
            propertiesCount: data.leads.length,
            totalRooms: data.leads.reduce((s, l) => s + (l.estimated_rooms || 0), 0),
            propertyTypes: [...new Set(data.leads.map(l => l.property_type).filter(Boolean))].join(', '),
            cities: [...new Set(data.leads.map(l => l.city).filter(Boolean))].join(', '),
            createdAt: first.created_at,
            updatedAt: first.created_at
          });
        }
      });

      // Convert to array
      let allOwners = Array.from(ownerMap.values());

      // Apply search filter
      const { search, status: filterStatus } = req.query;
      if (search) {
        const s = search.toLowerCase();
        allOwners = allOwners.filter(o =>
          (o.name && o.name.toLowerCase().includes(s)) ||
          (o.email && o.email.toLowerCase().includes(s))
        );
      }
      if (filterStatus === 'active') {
        allOwners = allOwners.filter(o => o.isVerified);
      } else if (filterStatus === 'inactive') {
        allOwners = allOwners.filter(o => !o.isVerified);
      }

      // Sort by property count desc
      allOwners.sort((a, b) => (b.propertiesCount || 0) - (a.propertiesCount || 0));

      const totalOwners = allOwners.length;
      const paginatedOwners = allOwners.slice(offset, offset + limit);

      res.json({
        success: true,
        data: {
          propertyOwners: paginatedOwners
        },
        count: paginatedOwners.length,
        total: totalOwners,
        page,
        pages: Math.ceil(totalOwners / limit)
      });
    } catch (dbError) {
      console.error('Database query error in superuser property owners:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owners from database'
      });
    }
  } catch (error) {
    console.error('Internal superuser property owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owners'
    });
  }
});

// @desc    Get single property owner for superuser management
// @route   GET /api/internal/superuser/property-owners/:id
// @access  Private
router.get('/internal/superuser/property-owners/:id', async (req, res) => {
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

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const { id } = req.params;

    try {
      // The ID could be a direct user UUID or a lead-prefixed ID (owner_xxx)
      const cleanId = id.replace('owner_', '');
      
      // First try to find as a user (since we now return real user IDs from the list)
      const ownerUser = await User.findByPk(cleanId);

      if (ownerUser) {
        // Found as a user - get their leads/properties
        let ownerLeads = [];
        try {
          ownerLeads = await Lead.findAll({
            where: { email: ownerUser.email },
            attributes: ['id', 'status', 'estimated_rooms', 'city', 'property_type', 'business_name', 'address', 'state', 'pincode']
          });
        } catch (leadErr) {
          console.warn('Could not fetch leads for owner:', leadErr.message);
        }

        // Also get actual properties from the properties table
        let actualProperties = [];
        try {
          const [dbProperties] = await require('../../models').sequelize.query(`
            SELECT 
              p.id, p.name, p.type, p.description, p.total_rooms, p.location, p.is_active, p.created_at, p.updated_at,
              COUNT(DISTINCT r.id) as actual_room_count,
              COUNT(DISTINCT b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'completed', 'refunded')) as active_bookings
            FROM properties p
            LEFT JOIN rooms r ON (r.property_details->>'propertyId' = p.id::text OR r.property_id = p.id)
              AND r.is_active = true AND r.approval_status = 'approved'
            LEFT JOIN bookings b ON b.room_id = r.id
            WHERE p.owner_id = $1
            GROUP BY p.id, p.name, p.type, p.description, p.total_rooms, p.location, p.is_active, p.created_at, p.updated_at
            ORDER BY p.created_at DESC
          `, { bind: [ownerUser.id] });
          actualProperties = dbProperties || [];
        } catch (propErr) {
          console.warn('Could not fetch properties for owner:', propErr.message);
        }

        // Combine leads and actual properties for the properties list
        const allProperties = [];
        
        // Add actual properties first
        actualProperties.forEach(p => {
          const loc = typeof p.location === 'string' ? JSON.parse(p.location) : (p.location || {});
          const roomCount = parseInt(p.actual_room_count) || parseInt(p.total_rooms) || 0;
          const activeBookings = parseInt(p.active_bookings) || 0;
          allProperties.push({
            id: p.id,
            name: p.name || 'Unnamed Property',
            type: (p.type || 'pg').toUpperCase() === 'PG' ? 'PG' : 'Hotel',
            address: loc.address || [loc.city, loc.state].filter(Boolean).join(', ') || '',
            totalRooms: roomCount,
            occupancyRate: roomCount > 0 ? Math.round((activeBookings / roomCount) * 100) : 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          });
        });

        // Add leads that aren't already represented as properties
        ownerLeads.forEach(l => {
          allProperties.push({
            id: l.id,
            name: l.business_name || l.property_type || 'Lead Property',
            type: (l.property_type || 'pg').toUpperCase() === 'PG' ? 'PG' : 'Hotel',
            address: [l.city, l.state].filter(Boolean).join(', '),
            totalRooms: l.estimated_rooms || 0,
            occupancyRate: 0
          });
        });

        const totalProperties = allProperties.length || ownerLeads.length;
        const totalRooms = allProperties.reduce((sum, p) => sum + (p.totalRooms || 0), 0);
        const cities = [...new Set(ownerLeads.map(l => l.city).filter(Boolean))];

        const propertyOwner = {
          id: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
          phone: ownerUser.phone,
          isVerified: ownerUser.isVerified !== false,
          propertiesCount: totalProperties,
          createdAt: ownerUser.created_at || ownerUser.createdAt || new Date().toISOString(),
          updatedAt: ownerUser.updated_at || ownerUser.updatedAt || new Date().toISOString(),
          properties: allProperties
        };

        return res.json({ success: true, data: { propertyOwner } });
      }

      // Fall back to lead lookup
      const lead = await Lead.findByPk(cleanId, {
        attributes: [
          'id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 
          'created_at', 'updated_at', 'address', 'pincode'
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      // Get all leads for this email to calculate totals
      const allLeadsForOwner = await Lead.findAll({
        where: { email: lead.email },
        attributes: ['id', 'status', 'estimated_rooms', 'city', 'property_type']
      });

      const totalProperties = allLeadsForOwner.length;
      const activeProperties = allLeadsForOwner.filter(l => l.status === 'approved').length;
      const totalRooms = allLeadsForOwner.reduce((sum, l) => sum + (l.estimated_rooms || 0), 0);
      const cities = [...new Set(allLeadsForOwner.map(l => l.city).filter(Boolean))];

      // Look up actual user ID by email
      const actualUser = await User.findOne({ where: { email: lead.email }, attributes: ['id'] });

      const propertyOwner = {
        id: actualUser ? actualUser.id : `owner_${lead.id}`,
        name: lead.property_owner_name,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.business_name,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
        totalProperties,
        activeProperties,
        totalRooms,
        cities: cities.join(', '),
        status: 'active',
        isVerified: lead.status === 'approved',
        propertiesCount: totalProperties,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at,
        properties: allLeadsForOwner.map(l => ({
          id: l.id,
          name: l.business_name || l.property_type || 'Lead Property',
          type: (l.property_type || 'pg').toUpperCase() === 'PG' ? 'PG' : 'Hotel',
          address: l.city ? [l.city].filter(Boolean).join(', ') : '',
          totalRooms: l.estimated_rooms || 0,
          occupancyRate: 0
        }))
      };

      res.json({
        success: true,
        data: {
          propertyOwner
        }
      });
    } catch (dbError) {
      console.error('Database query error in single property owner:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owner from database: ' + dbError.message
      });
    }
  } catch (error) {
    console.error('Internal superuser single property owner error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owner: ' + error.message
    });
  }
});

// @desc    Get property owners for platform management
// @route   GET /api/internal/platform/property-owners
// @access  Private
router.get('/internal/platform/property-owners', async (req, res) => {
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

    // Check if user has platform management permissions
    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform management access required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
      // Get property owners from leads data (unique by email)
      const leads = await Lead.findAll({
        attributes: [
          'id', 'property_owner_name', 'email', 'phone', 'business_name',
          'property_type', 'estimated_rooms', 'city', 'state', 'status', 'created_at'
        ],
        order: [['created_at', 'DESC']]
      });

      // Look up actual user IDs by email so property creation uses valid foreign keys
      const allEmails = [...new Set(leads.map(l => l.email).filter(Boolean))];
      const existingUsers = allEmails.length > 0
        ? await User.findAll({ where: { email: allEmails }, attributes: ['id', 'email'] })
        : [];
      const emailToUserId = new Map(existingUsers.map(u => [u.email, u.id]));

      // Group by email to get unique property owners
      const ownerMap = new Map();
      leads.forEach(lead => {
        if (!ownerMap.has(lead.email)) {
          const actualUserId = emailToUserId.get(lead.email);
          ownerMap.set(lead.email, {
            id: actualUserId || `owner_${lead.id}`,
            name: lead.property_owner_name,
            email: lead.email,
            phone: lead.phone,
            businessName: lead.business_name,
            totalProperties: 0,
            activeProperties: 0,
            totalRooms: 0,
            cities: new Set(),
            joinedDate: lead.created_at,
            status: 'active'
          });
        }
        
        const owner = ownerMap.get(lead.email);
        owner.totalProperties++;
        if (lead.status === 'approved') {
          owner.activeProperties++;
        }
        owner.totalRooms += lead.estimated_rooms || 0;
        if (lead.city) {
          owner.cities.add(lead.city);
        }
      });

      // Convert to array and apply pagination
      const allOwners = Array.from(ownerMap.values()).map(owner => ({
        ...owner,
        cities: Array.from(owner.cities).join(', '),
        propertiesCount: owner.totalProperties
      }));

      const totalOwners = allOwners.length;
      const paginatedOwners = allOwners.slice(offset, offset + limit);

      res.json({
        success: true,
        count: paginatedOwners.length,
        total: totalOwners,
        page,
        pages: Math.ceil(totalOwners / limit),
        data: paginatedOwners
      });
    } catch (dbError) {
      console.error('Database query error in property owners:', dbError);
      res.status(500).json({
        success: false,
        message: 'Error fetching property owners from database'
      });
    }
  } catch (error) {
    console.error('Internal property owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property owners'
    });
  }
});

// @desc    Create property via superuser service
// @route   POST /api/internal/superuser/properties
// @access  Private (superuser, admin)
router.post('/internal/superuser/properties', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['superuser', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { ownerId, name, description, propertyType, categoryId, location, amenities, rules } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({ success: false, message: 'Property name and owner are required' });
    }

    // Strip 'owner_' prefix if present (frontend sometimes sends prefixed IDs)
    const cleanOwnerId = ownerId.replace(/^owner_/, '');

    // Validate owner exists
    const owner = await User.findByPk(cleanOwnerId);
    if (!owner) {
      return res.status(400).json({ 
        success: false, 
        message: `Owner with ID ${cleanOwnerId} not found. Please select a valid property owner.` 
      });
    }

    // Normalize type to lowercase to match DB enum ('pg', 'hostel', 'hotel', 'apartment')
    const typeMap = { 'PG': 'pg', 'Hotel': 'hotel', 'Hostel': 'hostel', 'Apartment': 'apartment' };
    const normalizedType = typeMap[propertyType] || (propertyType ? propertyType.toLowerCase() : 'pg');

    const property = await Property.create({
      name,
      description: description || '',
      type: normalizedType,
      ownerId: cleanOwnerId,
      location: location || {},
      amenities: amenities || [],
      rules: rules || [],
      isActive: true,
      isFeatured: false,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: user.id,
      metadata: {
        createdBy: user.id,
        createdByName: user.name,
        createdVia: 'superuser_service'
      }
    });

    res.status(201).json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Superuser create property error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating property' });
  }
});

// @desc    Update property via superuser service
// @route   PUT /api/internal/superuser/properties/:id
// @access  Private (superuser, admin)
router.put('/internal/superuser/properties/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['superuser', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.location) updateData.location = req.body.location;
    if (req.body.amenities) updateData.amenities = req.body.amenities;
    if (req.body.rules) updateData.rules = req.body.rules;
    if (req.body.propertyType) updateData.type = req.body.propertyType;

    await property.update(updateData);

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    console.error('Superuser update property error:', error);
    res.status(500).json({ success: false, message: 'Error updating property' });
  }
});

// @desc    Create property owner via superuser service
// @route   POST /api/internal/superuser/property-owners
// @access  Private (superuser, admin)
router.post('/internal/superuser/property-owners', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const platformRoles = ['admin', 'category_owner', 'superuser'];
    if (!platformRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { name, email, phone, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Check if user already exists
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const newOwner = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      password: tempPassword,
      role: role || 'owner',
      isVerified: true,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        propertyOwner: newOwner,
        credentials: {
          email: newOwner.email,
          password: tempPassword,
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
        }
      }
    });
  } catch (error) {
    console.error('Create property owner error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating property owner' });
  }
});

module.exports = router;
