const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PropertyDocument, Lead, User } = require('../../models');
const { authorizeInternalRoles, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for allowed document types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, GIF, DOC, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/internal/documents/upload - Upload document
router.post('/upload',
  requireInternalPermissions(['canOnboardProperties', 'canAccessAllProperties']),
  upload.single('document'),
  [
    body('leadId').optional().isUUID().withMessage('Lead ID must be a valid UUID'),
    body('propertyOwnerId').isUUID().withMessage('Property Owner ID must be a valid UUID'),
    body('documentType').isIn(['business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'])
      .withMessage('Document type must be one of: business_license, property_photos, owner_id, tax_certificate, other')
  ],
  auditLog('upload_document'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded'
        });
      }

      const { leadId, propertyOwnerId, documentType } = req.body;

      // Verify property owner exists
      const propertyOwner = await User.findByPk(propertyOwnerId);
      if (!propertyOwner) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({
          message: 'Property owner not found'
        });
      }

      // Verify lead exists if provided
      if (leadId) {
        const lead = await Lead.findByPk(leadId);
        if (!lead) {
          await fs.unlink(req.file.path).catch(() => {});
          return res.status(404).json({
            message: 'Lead not found'
          });
        }
      }

      // Create file URL (relative path for serving)
      const fileUrl = `/api/internal/documents/${path.basename(req.file.path)}`;

      // Create document record
      const document = await PropertyDocument.create({
        leadId: leadId || null,
        propertyOwnerId,
        documentType,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id,
        status: 'pending_review'
      });

      // Include uploader info in response
      const documentWithUploader = await PropertyDocument.findByPk(document.id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: documentWithUploader
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      console.error('Document upload error:', error);
      
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          message: error.message
        });
      }
      
      res.status(500).json({
        message: 'Failed to upload document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// GET /api/internal/documents/:id - Get document
router.get('/:id',
  requireInternalPermissions(['canOnboardProperties', 'canAccessAllProperties', 'canApproveOnboardings']),
  [
    param('id').isUUID().withMessage('Document ID must be a valid UUID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const document = await PropertyDocument.findByPk(req.params.id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'propertyOwnerName', 'businessName', 'status']
          }
        ]
      });

      if (!document) {
        return res.status(404).json({
          message: 'Document not found'
        });
      }

      // Check if user has permission to view this document
      const userRole = req.user.internalRole;
      const userPermissions = req.user.internalPermissions || {};

      // Agents can only view documents they uploaded or for leads in their territory
      if (userRole === 'agent') {
        if (document.uploadedBy !== req.user.id) {
          // Check if document is for a lead in their territory
          if (document.lead && document.lead.agentId !== req.user.id) {
            return res.status(403).json({
              message: 'Access denied. You can only view documents you uploaded or for your assigned leads.'
            });
          }
        }
      }

      res.json({
        document
      });

    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({
        message: 'Failed to retrieve document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Serve document files
router.get('/file/:filename',
  requireInternalPermissions(['canOnboardProperties', 'canAccessAllProperties', 'canApproveOnboardings']),
  async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, '../../uploads/documents', filename);

      // Verify file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          message: 'File not found'
        });
      }

      // Find document record to verify permissions
      const document = await PropertyDocument.findOne({
        where: {
          fileUrl: `/api/internal/documents/${filename}`
        },
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'agentId']
          }
        ]
      });

      if (!document) {
        return res.status(404).json({
          message: 'Document record not found'
        });
      }

      // Check permissions (same logic as GET document)
      const userRole = req.user.internalRole;
      if (userRole === 'agent') {
        if (document.uploadedBy !== req.user.id) {
          if (document.lead && document.lead.agentId !== req.user.id) {
            return res.status(403).json({
              message: 'Access denied'
            });
          }
        }
      }

      // Set appropriate headers
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);

      // Send file
      res.sendFile(filePath);

    } catch (error) {
      console.error('Serve file error:', error);
      res.status(500).json({
        message: 'Failed to serve file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// DELETE /api/internal/documents/:id - Delete document
router.delete('/:id',
  requireInternalPermissions(['canOnboardProperties', 'canAccessAllProperties']),
  [
    param('id').isUUID().withMessage('Document ID must be a valid UUID')
  ],
  auditLog('delete_document'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const document = await PropertyDocument.findByPk(req.params.id, {
        include: [
          {
            model: Lead,
            as: 'lead',
            attributes: ['id', 'agentId']
          }
        ]
      });

      if (!document) {
        return res.status(404).json({
          message: 'Document not found'
        });
      }

      // Check permissions - only uploader or higher roles can delete
      const userRole = req.user.internalRole;
      const userPermissions = req.user.internalPermissions || {};

      if (userRole === 'agent') {
        if (document.uploadedBy !== req.user.id) {
          return res.status(403).json({
            message: 'Access denied. You can only delete documents you uploaded.'
          });
        }
      }

      // Delete physical file
      const filename = path.basename(document.fileUrl);
      const filePath = path.join(__dirname, '../../uploads/documents', filename);
      
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn('Could not delete physical file:', fileError.message);
        // Continue with database deletion even if file deletion fails
      }

      // Delete database record
      await document.destroy();

      res.json({
        message: 'Document deleted successfully'
      });

    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        message: 'Failed to delete document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// PUT /api/internal/documents/:id/review - Review document (approve/reject)
router.put('/:id/review',
  requireInternalPermissions(['canApproveOnboardings', 'canAccessAllProperties']),
  [
    param('id').isUUID().withMessage('Document ID must be a valid UUID'),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be either approved or rejected'),
    body('reviewNotes').optional().isString().withMessage('Review notes must be a string')
  ],
  auditLog('review_document'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { status, reviewNotes } = req.body;

      const document = await PropertyDocument.findByPk(req.params.id);

      if (!document) {
        return res.status(404).json({
          message: 'Document not found'
        });
      }

      if (document.status !== 'pending_review') {
        return res.status(400).json({
          message: 'Document has already been reviewed'
        });
      }

      // Update document status
      await document.update({
        status,
        reviewedBy: req.user.id,
        reviewNotes: reviewNotes || null
      });

      // Get updated document with reviewer info
      const updatedDocument = await PropertyDocument.findByPk(document.id, {
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        message: `Document ${status} successfully`,
        document: updatedDocument
      });

    } catch (error) {
      console.error('Review document error:', error);
      res.status(500).json({
        message: 'Failed to review document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// GET /api/internal/documents/lead/:leadId - Get lead documents
router.get('/lead/:leadId',
  requireInternalPermissions(['canOnboardProperties', 'canAccessAllProperties', 'canApproveOnboardings']),
  [
    param('leadId').isUUID().withMessage('Lead ID must be a valid UUID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Verify lead exists
      const lead = await Lead.findByPk(req.params.leadId);
      if (!lead) {
        return res.status(404).json({
          message: 'Lead not found'
        });
      }

      // Check permissions - agents can only view documents for their leads
      const userRole = req.user.internalRole;
      if (userRole === 'agent' && lead.agentId !== req.user.id) {
        return res.status(403).json({
          message: 'Access denied. You can only view documents for your assigned leads.'
        });
      }

      const documents = await PropertyDocument.findAll({
        where: {
          leadId: req.params.leadId
        },
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Group documents by type for easier frontend handling
      const documentsByType = documents.reduce((acc, doc) => {
        if (!acc[doc.documentType]) {
          acc[doc.documentType] = [];
        }
        acc[doc.documentType].push(doc);
        return acc;
      }, {});

      res.json({
        leadId: req.params.leadId,
        documents,
        documentsByType,
        totalDocuments: documents.length,
        pendingReview: documents.filter(doc => doc.status === 'pending_review').length,
        approved: documents.filter(doc => doc.status === 'approved').length,
        rejected: documents.filter(doc => doc.status === 'rejected').length
      });

    } catch (error) {
      console.error('Get lead documents error:', error);
      res.status(500).json({
        message: 'Failed to retrieve lead documents',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;