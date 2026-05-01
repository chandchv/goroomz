const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { Property, PropertyClaim, User } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * GET /api/properties
 * Get all public properties (approved and active)
 * Supports filtering, pagination, and search
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('city').optional().isString(),
  query('area').optional().isString(),
  query('type').optional().isIn(['pg', 'hostel', 'hotel', 'apartment']),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('amenities').optional().isString(),
  query('gender').optional().isIn(['male', 'female', 'any']),
  query('search').optional().isString(),
  validate
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      city,
      area,
      type,
      minPrice,
      maxPrice,
      amenities,
      gender,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {
      isActive: true,
      approvalStatus: 'approved'
    };

    // Type filter
    if (type) {
      where.type = type;
    }

    // Location filters using JSONB
    if (city) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        'location.city': { [Op.iLike]: `%${city}%` }
      });
    }

    if (area) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        'location.area': { [Op.iLike]: `%${area}%` }
      });
    }

    // Gender preference filter (for PGs)
    if (gender) {
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { 'metadata.genderPreference': gender },
          { 'metadata.genderPreference': 'any' }
        ]
      });
    }

    // Price filter
    if (minPrice || maxPrice) {
      where[Op.and] = where[Op.and] || [];
      if (minPrice) {
        where[Op.and].push({
          'metadata.pgOptions.basePrice': { [Op.gte]: parseFloat(minPrice) }
        });
      }
      if (maxPrice) {
        where[Op.and].push({
          'metadata.pgOptions.basePrice': { [Op.lte]: parseFloat(maxPrice) }
        });
      }
    }

    // Amenities filter
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim().toLowerCase());
      where.amenities = { [Op.contains]: amenityList };
    }

    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { 'location.address': { [Op.iLike]: `%${search}%` } },
        { 'location.area': { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: properties } = await Property.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [
        ['isFeatured', 'DESC'],
        ['createdAt', 'DESC']
      ],
      attributes: {
        exclude: ['approvedBy', 'rejectionReason']
      }
    });

    res.json({
      success: true,
      data: properties,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch properties' });
  }
});

/**
 * GET /api/properties/featured
 * Get featured properties for homepage
 */
router.get('/featured', async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: {
        isActive: true,
        approvalStatus: 'approved',
        isFeatured: true
      },
      limit: 8,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: properties });
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured properties' });
  }
});

/**
 * GET /api/properties/areas
 * Get list of available areas for filtering
 */
router.get('/areas', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    const [results] = await sequelize.query(`
      SELECT DISTINCT location->>'area' as area, COUNT(*) as count
      FROM properties
      WHERE is_active = true AND approval_status = 'approved'
      AND location->>'area' IS NOT NULL AND location->>'area' != ''
      GROUP BY location->>'area'
      ORDER BY count DESC
      LIMIT 50
    `);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching areas:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch areas' });
  }
});

/**
 * GET /api/properties/:identifier
 * Get single property details by UUID or slug
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const where = {
      isActive: true,
      approvalStatus: 'approved'
    };
    
    if (isUUID) {
      where.id = identifier;
    } else {
      where.slug = identifier;
    }

    const property = await Property.findOne({
      where,
      include: [{
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'avatar']
      }]
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Fetch rooms linked to this property
    const { sequelize } = require('../models');
    let rooms = [];
    try {
      const [roomRows] = await sequelize.query(`
        SELECT id, title, description, price, max_guests, room_type, category,
               amenities, images, rules, rating, availability, pricing_type,
               pg_options, property_details, created_at, updated_at
        FROM rooms 
        WHERE is_active = true 
        AND approval_status = 'approved'
        AND (
          property_details->>'propertyId' = $1
          OR property_id = $1::uuid
        )
        ORDER BY title
      `, { bind: [property.id] });
      
      rooms = (roomRows || []).map(room => {
        const pd = typeof room.property_details === 'string' ? JSON.parse(room.property_details) : (room.property_details || {});
        return {
          id: room.id,
          title: room.title,
          description: room.description,
          price: parseFloat(room.price) || 0,
          maxGuests: room.max_guests || 1,
          roomType: room.room_type || pd.sharingType || 'single',
          category: room.category,
          amenities: room.amenities || [],
          images: room.images || [],
          rules: room.rules || [],
          rating: room.rating || {},
          availability: room.availability || {},
          pricingType: room.pricing_type || 'monthly',
          pgOptions: room.pg_options || pd,
          sharingType: pd.sharingType || 'single',
          floorNumber: pd.floorNumber || 1,
          totalBeds: pd.totalBeds || room.max_guests || 1,
          monthlyRate: pd.monthlyRate || 0,
          dailyRate: pd.dailyRate || parseFloat(room.price) || 0,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        };
      });
    } catch (roomErr) {
      console.warn('Could not fetch rooms for property:', roomErr.message);
    }

    // Build response with property + rooms
    const propertyData = property.toJSON();
    propertyData.rooms = rooms;
    propertyData.totalRooms = rooms.length;

    // Also provide room-format fields for website compatibility
    // The website expects: category, pgOptions, hotelPrices, price, title, etc.
    if (!propertyData.title) propertyData.title = propertyData.name;
    if (!propertyData.category) {
      const typeMap = { pg: 'PG', hotel: 'Hotel Room', hostel: 'PG', apartment: 'Independent Home' };
      propertyData.category = typeMap[propertyData.type] || 'PG';
    }
    if (!propertyData.price && rooms.length > 0) {
      propertyData.price = Math.min(...rooms.map(r => r.price || r.monthlyRate || r.dailyRate || 0).filter(p => p > 0)) || 0;
    }
    if (!propertyData.maxGuests && rooms.length > 0) {
      propertyData.maxGuests = Math.max(...rooms.map(r => r.maxGuests || r.totalBeds || 1));
    }
    if (!propertyData.pricingType) {
      propertyData.pricingType = propertyData.type === 'hotel' ? 'daily' : 'monthly';
    }

    // Build pgOptions from rooms if this is a PG
    if (propertyData.category === 'PG' && rooms.length > 0 && !propertyData.pgOptions) {
      const sharingPrices = {};
      const sharingDailyPrices = {};
      rooms.forEach(r => {
        const sharing = r.sharingType || 'single';
        const monthlyPrice = r.monthlyRate || r.price || 0;
        const dailyPrice = r.dailyRate || 0;
        const sharingMap = { 'single': 'single', '2_sharing': 'double', '3_sharing': 'triple', '4_sharing': 'quad', 'dormitory': 'quad' };
        const key = sharingMap[sharing] || sharing;
        if (monthlyPrice > 0 && (!sharingPrices[key] || monthlyPrice < sharingPrices[key])) {
          sharingPrices[key] = monthlyPrice;
        }
        if (dailyPrice > 0 && (!sharingDailyPrices[key] || dailyPrice < sharingDailyPrices[key])) {
          sharingDailyPrices[key] = dailyPrice;
        }
      });
      propertyData.pgOptions = { sharingPrices, sharingDailyPrices };
    }

    res.json({ success: true, data: propertyData });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property' });
  }
});

/**
 * POST /api/properties/:identifier/claim
 * Submit a claim request for a property (by UUID or slug)
 */
router.post('/:identifier/claim', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone is required'),
  body('businessName').optional().trim(),
  body('proofOfOwnership').trim().notEmpty().withMessage('Proof of ownership description is required'),
  validate
], optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { name, email, phone, businessName, proofOfOwnership, additionalInfo } = req.body;

    // Check if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const where = isUUID ? { id: identifier } : { slug: identifier };

    // Check if property exists
    const property = await Property.findOne({ where });
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Check if property is already claimed
    if (property.metadata?.isClaimed) {
      return res.status(400).json({ 
        success: false, 
        message: 'This property has already been claimed' 
      });
    }

    // Check for existing pending claim
    const existingClaim = await PropertyClaim.findOne({
      where: {
        propertyId: property.id,
        status: { [Op.in]: ['pending', 'under_review'] }
      }
    });

    if (existingClaim) {
      return res.status(400).json({ 
        success: false, 
        message: 'A claim request is already pending for this property' 
      });
    }

    // Create claim
    const claim = await PropertyClaim.create({
      propertyId: property.id,
      claimantUserId: req.user?.id || null,
      claimantName: name,
      claimantEmail: email,
      claimantPhone: phone,
      businessName,
      proofOfOwnership,
      additionalInfo: additionalInfo || {},
      status: 'pending'
    });

    // Send notifications to admins and operations team
    // Requirements: 1.1, 1.2
    try {
      // Attach property to claim for notification
      claim.property = property;
      await notificationService.sendPropertyClaimSubmittedNotification(claim);
    } catch (notificationError) {
      // Log notification error but don't fail the claim submission
      console.error('Failed to send claim submission notifications:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Claim request submitted successfully. Our team will review and contact you.',
      data: {
        claimId: claim.id,
        status: claim.status
      }
    });
  } catch (error) {
    console.error('Error submitting claim:', error);
    res.status(500).json({ success: false, message: 'Failed to submit claim request' });
  }
});

/**
 * GET /api/properties/:id/claim-status
 * Check claim status for a property (by email)
 */
router.get('/:id/claim-status', [
  param('id').isUUID(),
  query('email').isEmail(),
  validate
], async (req, res) => {
  try {
    const claim = await PropertyClaim.findOne({
      where: {
        propertyId: req.params.id,
        claimantEmail: req.query.email
      },
      order: [['createdAt', 'DESC']]
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'No claim found' });
    }

    res.json({
      success: true,
      data: {
        status: claim.status,
        submittedAt: claim.createdAt,
        reviewedAt: claim.reviewedAt,
        rejectionReason: claim.status === 'rejected' ? claim.rejectionReason : null
      }
    });
  } catch (error) {
    console.error('Error checking claim status:', error);
    res.status(500).json({ success: false, message: 'Failed to check claim status' });
  }
});

// ============ ADMIN ROUTES ============

/**
 * GET /api/properties/admin/claims
 * Get all property claims (admin only)
 */
router.get('/admin/claims', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'superuser'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const { count, rows: claims } = await PropertyClaim.findAndCountAll({
      where,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'name', 'location'] },
        { model: User, as: 'claimant', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: claims,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

/**
 * PUT /api/properties/admin/claims/:claimId/review
 * Review a property claim (approve/reject)
 */
router.put('/admin/claims/:claimId/review', [
  param('claimId').isUUID(),
  body('action').isIn(['approve', 'reject']),
  body('notes').optional().trim(),
  body('rejectionReason').optional().trim(),
  validate
], authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'superuser'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { claimId } = req.params;
    const { action, notes, rejectionReason } = req.body;

    const claim = await PropertyClaim.findByPk(claimId, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    if (!['pending', 'under_review'].includes(claim.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'This claim has already been processed' 
      });
    }

    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      if (action === 'approve') {
        // Update claim
        await claim.update({
          status: 'approved',
          verificationNotes: notes,
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }, { transaction });

        // Create or find user for claimant
        let ownerUser = await User.findOne({ 
          where: { email: claim.claimantEmail } 
        });

        if (!ownerUser) {
          // Create new owner user
          ownerUser = await User.create({
            name: claim.claimantName,
            email: claim.claimantEmail,
            phone: claim.claimantPhone,
            role: 'owner',
            isVerified: true
          }, { transaction });
        } else if (ownerUser.role === 'user') {
          // Upgrade to owner role
          await ownerUser.update({ role: 'owner' }, { transaction });
        }

        // Transfer property ownership
        await claim.property.update({
          ownerId: ownerUser.id,
          metadata: {
            ...claim.property.metadata,
            isClaimed: true,
            claimStatus: 'approved',
            claimedBy: ownerUser.id,
            claimedAt: new Date(),
            verifiedAt: new Date(),
            verifiedBy: req.user.id
          }
        }, { transaction });

        await transaction.commit();

        // Send approval notification to claimant
        // Requirements: 1.3
        try {
          // Update claim with user ID if newly created
          if (!claim.claimantUserId) {
            claim.claimantUserId = ownerUser.id;
          }
          await notificationService.sendPropertyClaimApprovedNotification(claim);
        } catch (notificationError) {
          // Log notification error but don't fail the approval
          console.error('Failed to send claim approval notification:', notificationError);
        }

        res.json({
          success: true,
          message: 'Claim approved. Property ownership transferred.',
          data: { claimId: claim.id, newOwnerId: ownerUser.id }
        });
      } else {
        // Reject claim
        if (!rejectionReason) {
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            message: 'Rejection reason is required' 
          });
        }

        await claim.update({
          status: 'rejected',
          rejectionReason,
          verificationNotes: notes,
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }, { transaction });

        await transaction.commit();

        // Send rejection notification to claimant
        // Requirements: 1.4
        try {
          await notificationService.sendPropertyClaimRejectedNotification(claim, rejectionReason);
        } catch (notificationError) {
          // Log notification error but don't fail the rejection
          console.error('Failed to send claim rejection notification:', notificationError);
        }

        res.json({
          success: true,
          message: 'Claim rejected.',
          data: { claimId: claim.id }
        });
      }
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error reviewing claim:', error);
    res.status(500).json({ success: false, message: 'Failed to review claim' });
  }
});

module.exports = router;
