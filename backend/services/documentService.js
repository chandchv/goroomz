/**
 * Document Service
 * 
 * Handles file upload, retrieval, and deletion for guest ID documents
 * Requirements: 3.2, 3.3, 12.4
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const GuestDocument = require('../models/GuestDocument');
const GuestProfile = require('../models/GuestProfile');

class DocumentService {
  /**
   * Allowed MIME types for document uploads
   */
  static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  /**
   * Maximum file size in bytes (5MB)
   */
  static MAX_FILE_SIZE = 5 * 1024 * 1024;

  /**
   * Base upload directory
   */
  static UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents');

  constructor() {
    // Ensure upload directory exists
    this.ensureUploadDirectory();
  }

  /**
   * Ensure the upload directory exists
   */
  ensureUploadDirectory() {
    if (!fs.existsSync(DocumentService.UPLOAD_DIR)) {
      fs.mkdirSync(DocumentService.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Validate file before upload
   * Requirements: 3.2, 3.3
   * 
   * @param {Object} file - File object with buffer, mimetype, size, originalname
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > DocumentService.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed (${DocumentService.MAX_FILE_SIZE / (1024 * 1024)}MB)`);
    }

    // Check MIME type - only images allowed
    if (!DocumentService.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push('Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed.');
    }

    // Validate file extension matches MIME type
    const extension = path.extname(file.originalname).toLowerCase();
    const validExtensions = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    };

    const allowedExtensions = validExtensions[file.mimetype] || [];
    if (!allowedExtensions.includes(extension)) {
      errors.push('File extension does not match file type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure file path
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @param {string} originalName - Original file name
   * @returns {{fileName: string, filePath: string, relativePath: string}}
   */
  generateFilePath(guestProfileId, originalName) {
    const extension = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileName = `${guestProfileId}_${timestamp}_${randomString}${extension}`;
    
    // Create subdirectory based on guest profile ID (first 2 chars)
    const subDir = guestProfileId.substring(0, 2);
    const fullDir = path.join(DocumentService.UPLOAD_DIR, subDir);
    
    // Ensure subdirectory exists
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    const filePath = path.join(fullDir, fileName);
    const relativePath = path.join('documents', subDir, fileName);

    return { fileName, filePath, relativePath };
  }

  /**
   * Upload a document for a guest
   * Requirements: 3.2, 3.3, 12.4
   * 
   * @param {Object} params - Upload parameters
   * @param {string} params.guestProfileId - Guest profile UUID
   * @param {string} params.bookingId - Optional booking UUID
   * @param {string} params.documentType - Document type (id_front, id_back, other)
   * @param {Object} params.file - File object with buffer, mimetype, size, originalname
   * @param {string} params.uploadedBy - User UUID who uploaded the document
   * @returns {Promise<GuestDocument>} Created document record
   */
  async uploadDocument({ guestProfileId, bookingId, documentType, file, uploadedBy }) {
    // Validate guest profile exists
    const guestProfile = await GuestProfile.findByPk(guestProfileId);
    if (!guestProfile) {
      throw new Error('Guest profile not found');
    }

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }

    // Validate document type
    const validDocumentTypes = ['id_front', 'id_back', 'other'];
    if (!validDocumentTypes.includes(documentType)) {
      throw new Error(`Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`);
    }

    const transaction = await sequelize.transaction();

    try {
      // Generate secure file path
      const { fileName, filePath, relativePath } = this.generateFilePath(guestProfileId, file.originalname);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Create document record
      const document = await GuestDocument.create({
        guestProfileId,
        bookingId,
        documentType,
        fileName: file.originalname,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
        uploadedAt: new Date()
      }, { transaction });

      await transaction.commit();

      return document;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get document by ID
   * Requirements: 12.4
   * 
   * @param {string} documentId - Document UUID
   * @returns {Promise<{document: GuestDocument, filePath: string}|null>}
   */
  async getDocument(documentId) {
    const document = await GuestDocument.findByPk(documentId, {
      include: [
        {
          model: GuestProfile,
          as: 'guestProfile',
          attributes: ['id', 'name', 'phone']
        }
      ]
    });

    if (!document) {
      return null;
    }

    // Construct full file path
    const fullPath = path.join(__dirname, '..', 'uploads', document.filePath);

    // Check if file exists
    const fileExists = fs.existsSync(fullPath);

    return {
      document,
      filePath: fullPath,
      fileExists
    };
  }

  /**
   * Get all documents for a guest profile
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @returns {Promise<GuestDocument[]>}
   */
  async getDocumentsByGuestProfile(guestProfileId) {
    return GuestDocument.findAll({
      where: { guestProfileId },
      order: [['uploadedAt', 'DESC']]
    });
  }

  /**
   * Get documents for a booking
   * 
   * @param {string} bookingId - Booking UUID
   * @returns {Promise<GuestDocument[]>}
   */
  async getDocumentsByBooking(bookingId) {
    return GuestDocument.findAll({
      where: { bookingId },
      order: [['uploadedAt', 'DESC']],
      include: [
        {
          model: GuestProfile,
          as: 'guestProfile',
          attributes: ['id', 'name', 'phone']
        }
      ]
    });
  }

  /**
   * Delete a document
   * Requirements: 12.4
   * 
   * @param {string} documentId - Document UUID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteDocument(documentId) {
    const document = await GuestDocument.findByPk(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    const transaction = await sequelize.transaction();

    try {
      // Construct full file path
      const fullPath = path.join(__dirname, '..', 'uploads', document.filePath);

      // Delete file from disk if it exists
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Delete database record
      await document.destroy({ transaction });

      await transaction.commit();

      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Read file content as buffer
   * 
   * @param {string} documentId - Document UUID
   * @returns {Promise<{buffer: Buffer, mimeType: string, fileName: string}|null>}
   */
  async readDocumentFile(documentId) {
    const result = await this.getDocument(documentId);
    
    if (!result || !result.fileExists) {
      return null;
    }

    const buffer = fs.readFileSync(result.filePath);

    return {
      buffer,
      mimeType: result.document.mimeType,
      fileName: result.document.fileName
    };
  }

  /**
   * Check if a guest has uploaded required ID documents
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @returns {Promise<{hasIdFront: boolean, hasIdBack: boolean, complete: boolean}>}
   */
  async checkIdDocumentStatus(guestProfileId) {
    const documents = await this.getDocumentsByGuestProfile(guestProfileId);
    
    const hasIdFront = documents.some(doc => doc.documentType === 'id_front');
    const hasIdBack = documents.some(doc => doc.documentType === 'id_back');

    return {
      hasIdFront,
      hasIdBack,
      complete: hasIdFront && hasIdBack
    };
  }
}

module.exports = new DocumentService();
