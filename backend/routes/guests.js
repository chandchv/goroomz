/**
 * Guest API Routes
 * 
 * Handles guest profile management and document uploads
 * Requirements: 12.1, 12.2, 12.6, 12.7
 */

const express = require('express');
const { Op } = require('sequelize');
const { body, query } = require('express-validator');
const GuestProfile = require('../models/GuestProfile');
const GuestDocument = require('../models/GuestDocument');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const guestService = require('../services/guestService');
const documentService = require('../services/documentService');
const multer = require('multer');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  }
});

// Validation for guest profile creation
const validateGuestProfile = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('address.street').optional().isString().isLength({ max: 200 }).withMessage('Street must be less than 200 characters'),
  body('address.city').optional().isString().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('address.state').optional().isString().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('address.pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pincode'),
  body('address.country').optional().isString().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('idType').optional().isIn(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id']).withMessage('Invalid ID type'),
  body('idNumber').optional().isString().isLength({ max: 50 }).withMessage('ID number must be less than 50 characters')
];

// Validation for guest profile update
const validateGuestProfileUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('address.street').optional().isString().isLength({ max: 200 }).withMessage('Street must be less than 200 characters'),
  body('address.city').optional().isString().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('address.state').optional().isString().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('address.pincode').optional().matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pincode'),
  body('idType').optional().isIn(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id']).withMessage('Invalid ID type'),
  body('idNumber').optional().isString().isLength({ max: 50 }).withMessage('ID number must be less than 50 characters')
];

// Validation for document upload
const validateDocumentUpload = [
  body('documentType').isIn(['id_front', 'id_back', 'other']).withMessage('Invalid document type'),
  body('bookingId').optional().isUUID().withMessage('Valid booking ID is required')
];

/**
 * @desc    Create guest profile
 * @route   POST /api/guests
 * @access  Private (Staff/Admin)
 * Requirements: 12.1
 */
router.post(
  '/',
  protect,
  validateGuestProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
        address,
        idType,
        idNumber,
        userId
      } = req.body;

      const guestProfile = await guestService.createGuestProfile({
        userId,
        name,
        phone,
        email,
        address,
        idType,
        idNumber
      });

      res.status(201).json({
        success: true,
        message: 'Guest profile created successfully',
        data: guestProfile
      });
    } catch (error) {
      console.error('Create guest profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error creating guest profile'
      });
    }
  }
);

/**
 * @desc    Search guests by name, phone, email, or ID number
 * @route   GET /api/guests
 * @access  Private (Staff/Admin)
 * Requirements: 12.7
 */
router.get(
  '/',
  protect,
  [
    query('q').optional().trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
    query('phone').optional().matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
    query('email').optional().isEmail().withMessage('Valid email is required'),
    query('idNumber').optional().isString().withMessage('ID number must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q, phone, email, idNumber, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // If specific search parameters provided, use them
      if (phone) {
        const guest = await guestService.findGuestByPhone(phone);
        return res.json({
          success: true,
          count: guest ? 1 : 0,
          total: guest ? 1 : 0,
          data: guest ? [guest] : []
        });
      }

      if (email) {
        const guest = await guestService.findGuestByEmail(email);
        return res.json({
          success: true,
          count: guest ? 1 : 0,
          total: guest ? 1 : 0,
          data: guest ? [guest] : []
        });
      }

      if (idNumber) {
        const guest = await guestService.findGuestByIdNumber(idNumber);
        return res.json({
          success: true,
          count: guest ? 1 : 0,
          total: guest ? 1 : 0,
          data: guest ? [guest] : []
        });
      }

      // General search
      if (q) {
        const result = await guestService.searchGuests(q, {
          limit: parseInt(limit),
          offset
        });

        return res.json({
          success: true,
          count: result.guests.length,
          total: result.total,
          page: parseInt(page),
          pages: Math.ceil(result.total / parseInt(limit)),
          data: result.guests
        });
      }

      // If no search params, return paginated list
      const { count, rows } = await GuestProfile.findAndCountAll({
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: GuestDocument,
            as: 'documents',
            required: false,
            attributes: ['id', 'documentType', 'fileName', 'uploadedAt']
          }
        ]
      });

      res.json({
        success: true,
        count: rows.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        data: rows
      });
    } catch (error) {
      console.error('Search guests error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching guests',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get guest profile with history
 * @route   GET /api/guests/:id
 * @access  Private (Staff/Admin)
 * Requirements: 12.6
 */
router.get(
  '/:id',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await guestService.getGuestWithHistory(req.params.id);

      res.json({
        success: true,
        data: {
          profile: result.profile,
          stayHistory: result.bookings,
          totalStays: result.profile.totalStays,
          lastStayDate: result.profile.lastStayDate
        }
      });
    } catch (error) {
      console.error('Get guest profile error:', error);
      
      if (error.message === 'Guest profile not found') {
        return res.status(404).json({
          success: false,
          message: 'Guest profile not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching guest profile',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Update guest profile
 * @route   PUT /api/guests/:id
 * @access  Private (Staff/Admin)
 * Requirements: 12.1
 */
router.put(
  '/:id',
  protect,
  validateObjectId('id'),
  validateGuestProfileUpdate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        phone,
        email,
        address,
        idType,
        idNumber,
        idVerified
      } = req.body;

      const updatedProfile = await guestService.updateGuestProfile(req.params.id, {
        name,
        phone,
        email,
        address,
        idType,
        idNumber,
        idVerified,
        idVerifiedBy: idVerified ? req.user.id : undefined
      });

      res.json({
        success: true,
        message: 'Guest profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      console.error('Update guest profile error:', error);
      
      if (error.message === 'Guest profile not found') {
        return res.status(404).json({
          success: false,
          message: 'Guest profile not found'
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Error updating guest profile'
      });
    }
  }
);

/**
 * @desc    Upload ID document for guest
 * @route   POST /api/guests/:id/documents
 * @access  Private (Staff/Admin)
 * Requirements: 12.4
 */
router.post(
  '/:id/documents',
  protect,
  validateObjectId('id'),
  upload.single('document'),
  [
    body('documentType').isIn(['id_front', 'id_back', 'other']).withMessage('Invalid document type'),
    body('bookingId').optional().isUUID().withMessage('Valid booking ID is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { documentType, bookingId } = req.body;

      const document = await documentService.uploadDocument({
        guestProfileId: req.params.id,
        bookingId,
        documentType,
        file: req.file,
        uploadedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error uploading document'
      });
    }
  }
);

/**
 * @desc    Get documents for a guest
 * @route   GET /api/guests/:id/documents
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/documents',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const documents = await documentService.getDocumentsByGuestProfile(req.params.id);

      res.json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching documents',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get a specific document
 * @route   GET /api/guests/:id/documents/:documentId
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/documents/:documentId',
  protect,
  validateObjectId('id'),
  validateObjectId('documentId'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await documentService.getDocument(req.params.documentId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify document belongs to the guest
      if (result.document.guestProfileId !== req.params.id) {
        return res.status(403).json({
          success: false,
          message: 'Document does not belong to this guest'
        });
      }

      res.json({
        success: true,
        data: {
          document: result.document,
          fileExists: result.fileExists
        }
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching document',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Download a document file
 * @route   GET /api/guests/:id/documents/:documentId/download
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/documents/:documentId/download',
  protect,
  validateObjectId('id'),
  validateObjectId('documentId'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await documentService.readDocumentFile(req.params.documentId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Document not found or file missing'
        });
      }

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.buffer);
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({
        success: false,
        message: 'Error downloading document',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Delete a document
 * @route   DELETE /api/guests/:id/documents/:documentId
 * @access  Private (Admin)
 */
router.delete(
  '/:id/documents/:documentId',
  protect,
  authorize('admin'),
  validateObjectId('id'),
  validateObjectId('documentId'),
  handleValidationErrors,
  async (req, res) => {
    try {
      await documentService.deleteDocument(req.params.documentId);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete document error:', error);
      
      if (error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting document',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Get stay history for a guest
 * @route   GET /api/guests/:id/history
 * @access  Private (Staff/Admin)
 * Requirements: 12.6
 */
router.get(
  '/:id/history',
  protect,
  validateObjectId('id'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Verify guest exists
      const guest = await GuestProfile.findByPk(req.params.id);
      if (!guest) {
        return res.status(404).json({
          success: false,
          message: 'Guest profile not found'
        });
      }

      // Get bookings with pagination
      const { count, rows: bookings } = await Booking.findAndCountAll({
        where: { guestProfileId: req.params.id },
        include: [
          {
            model: Room,
            as: 'room',
            attributes: ['id', 'title', 'roomNumber', 'location']
          }
        ],
        order: [['checkIn', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        count: bookings.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit)),
        data: {
          guest: {
            id: guest.id,
            name: guest.name,
            totalStays: guest.totalStays,
            lastStayDate: guest.lastStayDate
          },
          bookings
        }
      });
    } catch (error) {
      console.error('Get guest history error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching guest history',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Check ID document status for a guest
 * @route   GET /api/guests/:id/id-status
 * @access  Private (Staff/Admin)
 */
router.get(
  '/:id/id-status',
  protect,
  validateObjectId('id'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const guest = await GuestProfile.findByPk(req.params.id);
      if (!guest) {
        return res.status(404).json({
          success: false,
          message: 'Guest profile not found'
        });
      }

      const documentStatus = await documentService.checkIdDocumentStatus(req.params.id);

      res.json({
        success: true,
        data: {
          guestId: req.params.id,
          idVerified: guest.idVerified,
          idType: guest.idType,
          idNumber: guest.idNumber ? `****${guest.idNumber.slice(-4)}` : null,
          documents: documentStatus
        }
      });
    } catch (error) {
      console.error('Check ID status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking ID status',
        error: error.message
      });
    }
  }
);

/**
 * @desc    Lookup guest by phone (for returning guest check)
 * @route   GET /api/guests/lookup/phone/:phone
 * @access  Private (Staff/Admin)
 * Requirements: 12.2
 */
router.get(
  '/lookup/phone/:phone',
  protect,
  async (req, res) => {
    try {
      const phone = req.params.phone.replace(/\D/g, '').slice(-10);
      
      if (phone.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }

      const guest = await guestService.findGuestByPhone(phone);

      if (!guest) {
        return res.json({
          success: true,
          found: false,
          message: 'No guest found with this phone number'
        });
      }

      res.json({
        success: true,
        found: true,
        data: {
          id: guest.id,
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          address: guest.address,
          idType: guest.idType,
          idVerified: guest.idVerified,
          totalStays: guest.totalStays,
          lastStayDate: guest.lastStayDate
        }
      });
    } catch (error) {
      console.error('Lookup guest error:', error);
      res.status(500).json({
        success: false,
        message: 'Error looking up guest',
        error: error.message
      });
    }
  }
);

module.exports = router;
