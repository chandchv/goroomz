/**
 * Internal Lead Management Routes
 * 
 * Handles lead management for the internal management system.
 * Extracted from the monolithic leads.js file.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Lead = require('../../models/Lead');
const PropertyOwner = require('../../models/PropertyOwner');
const Territory = require('../../models/Territory');
const User = require('../../models/User');
const territoryService = require('../../services/territoryService');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * Validation middleware for lead creation
 */
const validateLeadCreation = [
  body('propertyOwnerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Property owner name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .matches(/^[0-9+\-\s()]+$/)
    .isLength({ min: 10, max: 15 })
    .withMessage('Valid phone number is required'),
  
  body('propertyType')
    .isIn(['hotel', 'pg', 'homestay', 'apartment'])
    .withMessage('Property type must be one of: hotel, pg, homestay, apartment'),
  
  body('estimatedRooms')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Estimated rooms must be between 1 and 1000'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  
  body('pincode')
    .optional()
    .matches(/^[0-9]+$/)
    .isLength({ min: 5, max: 10 })
    .withMessage('Pincode must be 5-10 digits'),
  
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Business name cannot exceed 200 characters'),
  
  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Landmark cannot exceed 200 characters'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  body('amenities.*')
    .optional()
    .isIn([
      'wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 
      'gym', 'security', 'balcony', 'kitchen', 'washing-machine',
      'refrigerator', 'microwave', 'iron', 'heater', 'cctv'
    ])
    .withMessage('Invalid amenity provided'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  body('expectedLaunchDate')
    .optional()
    .isISO8601()
    .withMessage('Expected launch date must be a valid date'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  
  body('frontendSubmissionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Frontend submission ID cannot exceed 100 characters')
];

/**
 * Territory assignment helper function
 * @param {string} city - City name
 * @param {string} state - State name
 * @returns {Object|null} - Territory object or null
 */
const assignTerritory = async (city, state) => {
  try {
    // Use the territory service for assignment
    const territory = await territoryService.findTerritoryByLocation(city, state);
    
    if (territory) {
      return territory;
    }

    return null;
  } catch (error) {
    console.error('Territory assignment error:', error);
    return null;
  }
};

/**
 * Property owner account creation helper function
 * @param {Object} leadData - Lead data object
 * @param {string} leadId - Lead ID
 * @returns {Object} - Created PropertyOwner object
 */
const createPropertyOwnerAccount = async (leadData, leadId) => {
  try {
    const propertyOwner = await PropertyOwner.create({
      leadId: leadId,
      name: leadData.propertyOwnerName,
      email: leadData.email,
      phone: leadData.phone,
      businessName: leadData.businessName || null,
      onboardingStatus: 'not_started',
      accountStatus: 'pending',
      verificationStatus: 'not_started',
      trainingStatus: 'not_scheduled',
      communicationPreferences: {
        email: true,
        sms: true,
        whatsapp: false,
        preferredTime: 'business_hours',
        language: 'en'
      }
    });

    return propertyOwner;
  } catch (error) {
    console.error('Property owner creation error:', error);
    throw error;
  }
};

/**
 * @desc    Create new lead from frontend submission
 * @route   POST /api/internal/leads
 * @access  Public
 */
router.post('/internal/leads', validateLeadCreation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const leadData = req.body;

    // Check for duplicate submission
    if (leadData.frontendSubmissionId) {
      const existingLead = await Lead.findOne({
        where: { frontendSubmissionId: leadData.frontendSubmissionId }
      });

      if (existingLead) {
        return res.status(409).json({
          success: false,
          message: 'Lead already exists for this submission',
          leadId: existingLead.id
        });
      }
    }

    // Assign territory based on location
    const territory = await assignTerritory(leadData.city, leadData.state);
    
    // Create the lead
    const lead = await Lead.create({
      // Property Information
      propertyOwnerName: leadData.propertyOwnerName,
      email: leadData.email,
      phone: leadData.phone,
      businessName: leadData.businessName || null,
      propertyType: leadData.propertyType,
      estimatedRooms: leadData.estimatedRooms,
      
      // Location Information
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      country: leadData.country || 'India',
      pincode: leadData.pincode || null,
      landmark: leadData.landmark || null,
      
      // Lead Management
      status: 'pending',
      source: 'website',
      territoryId: territory ? territory.id : null,
      
      // Frontend Sync Fields
      frontendSubmissionId: leadData.frontendSubmissionId || null,
      syncStatus: 'synced',
      lastSyncAt: new Date(),
      
      // Additional Data
      amenities: leadData.amenities || [],
      images: leadData.images || [],
      expectedLaunchDate: leadData.expectedLaunchDate || null,
      notes: leadData.notes || null,
      priority: 'medium',
      
      // Property Details (store additional frontend data)
      propertyDetails: {
        description: leadData.description || null,
        category: leadData.category || null,
        additionalInfo: leadData.additionalInfo || null
      }
    });

    // Assign lead to territory and update lead count
    if (territory) {
      try {
        await territoryService.assignLeadToTerritory(lead.id, territory.id);
      } catch (assignmentError) {
        console.error('Failed to assign lead to territory:', assignmentError);
        // Continue without failing the lead creation
      }
    }

    // Create property owner account
    let propertyOwner = null;
    try {
      propertyOwner = await createPropertyOwnerAccount(leadData, lead.id);
    } catch (ownerError) {
      console.error('Failed to create property owner account:', ownerError);
      // Continue without failing the lead creation
    }

    // TODO: Send notifications to territory head (will be implemented in task 4.1)
    
    // Prepare response
    const response = {
      success: true,
      message: 'Lead created successfully',
      data: {
        lead: {
          id: lead.id,
          status: lead.status,
          submissionDate: lead.submissionDate,
          trackingReference: lead.id.substring(0, 8).toUpperCase(),
          expectedTimeline: '3-5 business days'
        },
        territory: territory ? {
          id: territory.id,
          name: territory.name,
          code: territory.code
        } : null,
        propertyOwner: propertyOwner ? {
          id: propertyOwner.id,
          onboardingStatus: propertyOwner.onboardingStatus
        } : null
      }
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get leads with filtering and pagination
 * @route   GET /api/internal/leads
 * @access  Private
 */
router.get('/internal/leads', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      territoryId,
      agentId,
      city,
      state,
      propertyType,
      priority,
      sortBy = 'submissionDate',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (territoryId) whereClause.territoryId = territoryId;
    if (agentId) whereClause.agentId = agentId;
    if (city) whereClause.city = { [Op.iLike]: `%${city}%` };
    if (state) whereClause.state = { [Op.iLike]: `%${state}%` };
    if (propertyType) whereClause.propertyType = propertyType;
    if (priority) whereClause.priority = priority;

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch leads with associations
    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Territory,
          as: 'territory',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        },
        {
          model: PropertyOwner,
          as: 'propertyOwner',
          attributes: ['id', 'onboardingStatus', 'accountStatus']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Get specific lead details
 * @route   GET /api/internal/leads/:id
 * @access  Private
 */
router.get('/internal/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: Territory,
          as: 'territory',
          attributes: ['id', 'name', 'code', 'territoryHeadId']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: PropertyOwner,
          as: 'propertyOwner'
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: { lead }
    });

  } catch (error) {
    console.error('Lead fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Assign lead to agent
 * @route   POST /api/internal/leads/:id/assign-agent
 * @access  Private
 */
router.post('/internal/leads/:id/assign-agent', async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    if (!lead.canBeAssigned()) {
      return res.status(400).json({
        success: false,
        message: 'Lead cannot be assigned in current status'
      });
    }

    // Update lead with agent assignment
    await lead.update({
      agentId: agentId,
      status: 'assigned',
      lastContactDate: new Date()
    });

    res.json({
      success: true,
      message: 'Lead assigned to agent successfully',
      data: { lead }
    });

  } catch (error) {
    console.error('Agent assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign agent',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Auto-assign lead to best available agent
 * @route   POST /api/internal/leads/:id/auto-assign
 * @access  Private
 */
router.post('/internal/leads/:id/auto-assign', async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    if (!lead.territoryId) {
      return res.status(400).json({
        success: false,
        message: 'Lead must be assigned to a territory first'
      });
    }

    const assignmentResult = await territoryService.autoAssignLeadToAgent(id, lead.territoryId);

    res.json({
      success: true,
      message: assignmentResult.agent ? 
        'Lead auto-assigned to agent successfully' : 
        'No available agents, lead remains unassigned',
      data: assignmentResult
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-assign lead',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @desc    Bulk upload leads
 * @route   POST /api/internal/leads/bulk
 * @access  Private (admin, superuser)
 */
router.post('/internal/leads/bulk', async (req, res) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Only admin and superuser can bulk upload
    if (!['admin', 'superuser'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions for bulk upload' });
    }

    const { leads, skipDuplicates = true } = req.body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'leads array is required and must not be empty'
      });
    }

    if (leads.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 500 leads can be uploaded at once'
      });
    }

    const results = {
      total: leads.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdLeads: []
    };

    // Valid property types
    const validPropertyTypes = ['hotel', 'pg', 'homestay', 'apartment'];

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];
      const rowIndex = i + 1;

      try {
        // Validate required fields
        const requiredFields = ['propertyOwnerName', 'email', 'phone', 'propertyType', 'address', 'city', 'state'];
        const missingFields = requiredFields.filter(field => !leadData[field]);
        
        if (missingFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email || 'N/A',
            error: `Missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(leadData.email)) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: 'Invalid email format'
          });
          continue;
        }

        // Validate phone format
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(leadData.phone) || leadData.phone.replace(/\D/g, '').length < 10) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: 'Invalid phone number (must be at least 10 digits)'
          });
          continue;
        }

        // Validate property type
        if (!validPropertyTypes.includes(leadData.propertyType.toLowerCase())) {
          results.failed++;
          results.errors.push({
            row: rowIndex,
            email: leadData.email,
            error: `Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`
          });
          continue;
        }

        // Check for duplicate email
        const existingLead = await Lead.findOne({ where: { email: leadData.email.toLowerCase() } });
        if (existingLead) {
          if (skipDuplicates) {
            results.skipped++;
            continue;
          } else {
            results.failed++;
            results.errors.push({
              row: rowIndex,
              email: leadData.email,
              error: 'Lead with this email already exists'
            });
            continue;
          }
        }

        // Assign territory
        const territory = await assignTerritory(leadData.city, leadData.state);

        // Create the lead
        const lead = await Lead.create({
          propertyOwnerName: leadData.propertyOwnerName.trim(),
          email: leadData.email.toLowerCase().trim(),
          phone: leadData.phone.trim(),
          businessName: leadData.businessName?.trim() || null,
          propertyType: leadData.propertyType.toLowerCase(),
          estimatedRooms: parseInt(leadData.estimatedRooms) || 1,
          address: leadData.address.trim(),
          city: leadData.city.trim(),
          state: leadData.state.trim(),
          country: leadData.country?.trim() || 'India',
          pincode: leadData.pincode?.trim() || null,
          landmark: leadData.landmark?.trim() || null,
          status: 'pending',
          source: leadData.source || 'bulk_upload',
          territoryId: territory?.id || null,
          frontendSubmissionId: `bulk_${Date.now()}_${i}`,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          amenities: leadData.amenities || [],
          notes: leadData.notes || null,
          priority: leadData.priority || 'medium',
          propertyDetails: {
            description: leadData.description || null,
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString()
          }
        });

        // Create property owner account
        try {
          await createPropertyOwnerAccount(leadData, lead.id);
        } catch (ownerError) {
          console.error(`Failed to create property owner for lead ${lead.id}:`, ownerError);
        }

        results.successful++;
        results.createdLeads.push({
          id: lead.id,
          email: lead.email,
          propertyOwnerName: lead.propertyOwnerName,
          city: lead.city
        });

      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error);
        results.failed++;
        results.errors.push({
          row: rowIndex,
          email: leadData.email || 'N/A',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk upload completed: ${results.successful} created, ${results.skipped} skipped, ${results.failed} failed`,
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk upload failed',
      error: error.message
    });
  }
});

/**
 * @desc    Get bulk upload template
 * @route   GET /api/internal/leads/bulk/template
 * @access  Private
 */
router.get('/internal/leads/bulk/template', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const template = {
      description: 'Bulk upload template for property leads',
      requiredFields: [
        { field: 'propertyOwnerName', type: 'string', description: 'Full name of property owner (2-100 chars)' },
        { field: 'email', type: 'string', description: 'Valid email address' },
        { field: 'phone', type: 'string', description: 'Phone number (10-15 digits)' },
        { field: 'propertyType', type: 'string', description: 'One of: hotel, pg, homestay, apartment' },
        { field: 'address', type: 'string', description: 'Complete address (10-500 chars)' },
        { field: 'city', type: 'string', description: 'City name (2-100 chars)' },
        { field: 'state', type: 'string', description: 'State name (2-100 chars)' }
      ],
      optionalFields: [
        { field: 'businessName', type: 'string', description: 'Business/property name' },
        { field: 'estimatedRooms', type: 'number', description: 'Number of rooms (1-1000)' },
        { field: 'country', type: 'string', description: 'Country (default: India)' },
        { field: 'pincode', type: 'string', description: 'Postal code (5-10 digits)' },
        { field: 'landmark', type: 'string', description: 'Nearby landmark' },
        { field: 'amenities', type: 'array', description: 'List of amenities' },
        { field: 'notes', type: 'string', description: 'Additional notes' },
        { field: 'priority', type: 'string', description: 'One of: low, medium, high, urgent' },
        { field: 'source', type: 'string', description: 'Lead source (default: bulk_upload)' },
        { field: 'description', type: 'string', description: 'Property description' }
      ],
      sampleData: [
        {
          propertyOwnerName: 'John Doe',
          email: 'john@example.com',
          phone: '9876543210',
          propertyType: 'hotel',
          estimatedRooms: 20,
          address: '123 Main Street, Downtown Area',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '560001',
          businessName: 'Sunrise Hotel',
          amenities: ['wifi', 'parking', 'ac'],
          notes: 'Premium location near IT park'
        },
        {
          propertyOwnerName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '8765432109',
          propertyType: 'pg',
          estimatedRooms: 15,
          address: '456 College Road, Student Area',
          city: 'Hyderabad',
          state: 'Telangana',
          businessName: 'Comfort PG',
          amenities: ['wifi', 'meals', 'laundry']
        }
      ]
    };

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Error fetching template' });
  }
});

/**
 * @desc    Validate bulk upload data without creating
 * @route   POST /api/internal/leads/bulk/validate
 * @access  Private
 */
router.post('/internal/leads/bulk/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !['admin', 'superuser'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ success: false, message: 'leads array is required' });
    }

    const validPropertyTypes = ['hotel', 'pg', 'homestay', 'apartment'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\-\s()]+$/;

    const validation = {
      total: leads.length,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      errors: []
    };

    // Get existing emails
    const existingEmails = new Set();
    const emails = leads.map(l => l.email?.toLowerCase()).filter(Boolean);
    if (emails.length > 0) {
      const existing = await Lead.findAll({
        where: { email: { [Op.in]: emails } },
        attributes: ['email']
      });
      existing.forEach(l => existingEmails.add(l.email.toLowerCase()));
    }

    const seenEmails = new Set();

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowErrors = [];

      // Check required fields
      if (!lead.propertyOwnerName || lead.propertyOwnerName.length < 2) {
        rowErrors.push('propertyOwnerName is required (min 2 chars)');
      }
      if (!lead.email || !emailRegex.test(lead.email)) {
        rowErrors.push('Valid email is required');
      }
      if (!lead.phone || !phoneRegex.test(lead.phone)) {
        rowErrors.push('Valid phone is required');
      }
      if (!lead.propertyType || !validPropertyTypes.includes(lead.propertyType.toLowerCase())) {
        rowErrors.push(`propertyType must be one of: ${validPropertyTypes.join(', ')}`);
      }
      if (!lead.address || lead.address.length < 10) {
        rowErrors.push('address is required (min 10 chars)');
      }
      if (!lead.city || lead.city.length < 2) {
        rowErrors.push('city is required');
      }
      if (!lead.state || lead.state.length < 2) {
        rowErrors.push('state is required');
      }

      // Check for duplicates
      const email = lead.email?.toLowerCase();
      if (email) {
        if (existingEmails.has(email)) {
          rowErrors.push('Email already exists in database');
          validation.duplicates++;
        } else if (seenEmails.has(email)) {
          rowErrors.push('Duplicate email in upload data');
          validation.duplicates++;
        }
        seenEmails.add(email);
      }

      if (rowErrors.length > 0) {
        validation.invalid++;
        validation.errors.push({
          row: i + 1,
          email: lead.email || 'N/A',
          errors: rowErrors
        });
      } else {
        validation.valid++;
      }
    }

    res.json({
      success: true,
      message: `Validation complete: ${validation.valid} valid, ${validation.invalid} invalid`,
      data: validation
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ success: false, message: 'Validation failed', error: error.message });
  }
});

module.exports = router;
