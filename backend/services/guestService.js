/**
 * Guest Service
 * 
 * Handles guest profile management, ID verification, and guest lookup
 * Requirements: 12.1, 12.2, 12.7
 */

const { Op } = require('sequelize');
const GuestProfile = require('../models/GuestProfile');
const GuestDocument = require('../models/GuestDocument');
const Booking = require('../models/Booking');

class GuestService {
  /**
   * ID validation patterns for different ID types
   */
  static ID_PATTERNS = {
    aadhaar: {
      pattern: /^[0-9]{12}$/,
      description: '12 digits',
      example: '123456789012'
    },
    pan: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      description: '10 alphanumeric (format: AAAAA9999A)',
      example: 'ABCDE1234F'
    },
    passport: {
      pattern: /^[A-Z0-9]{6,9}$/,
      description: '6-9 alphanumeric characters',
      example: 'A1234567'
    },
    driving_license: {
      pattern: /^[A-Z0-9]{10,20}$/,
      description: '10-20 alphanumeric characters',
      example: 'DL1420110012345'
    },
    voter_id: {
      pattern: /^[A-Z]{3}[0-9]{7}$/,
      description: '10 alphanumeric (format: AAA9999999)',
      example: 'ABC1234567'
    }
  };

  /**
   * Create a new guest profile
   * Requirements: 12.1
   * 
   * @param {Object} profileData - Guest profile data
   * @returns {Promise<GuestProfile>} Created guest profile
   */
  async createGuestProfile(profileData) {
    const {
      userId,
      name,
      email,
      phone,
      address,
      idType,
      idNumber,
      idVerified = false,
      idVerifiedBy
    } = profileData;

    // Validate phone format
    if (!this.validatePhone(phone)) {
      throw new Error('Invalid phone number format. Must be 10 digits.');
    }

    // Validate email format if provided
    if (email && !this.validateEmail(email)) {
      throw new Error('Invalid email format.');
    }

    // Validate ID number if provided
    if (idType && idNumber) {
      const idValidation = this.validateIdNumber(idType, idNumber);
      if (!idValidation.valid) {
        throw new Error(idValidation.message);
      }
    }

    // Check if guest with same phone already exists
    const existingGuest = await this.findGuestByPhone(phone);
    if (existingGuest) {
      throw new Error('A guest profile with this phone number already exists.');
    }

    // Create guest profile
    const guestProfile = await GuestProfile.create({
      userId,
      name,
      email,
      phone,
      address: address || {},
      idType,
      idNumber: idNumber ? idNumber.toUpperCase().replace(/\s/g, '') : null,
      idVerified,
      idVerifiedAt: idVerified ? new Date() : null,
      idVerifiedBy: idVerified ? idVerifiedBy : null,
      totalStays: 0
    });

    return guestProfile;
  }

  /**
   * Find guest profile by phone number
   * Requirements: 12.2, 12.7
   * 
   * @param {string} phone - Phone number (10 digits)
   * @returns {Promise<GuestProfile|null>}
   */
  async findGuestByPhone(phone) {
    if (!phone) return null;
    
    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
    
    return GuestProfile.findOne({
      where: { phone: normalizedPhone },
      include: [
        {
          model: GuestDocument,
          as: 'documents',
          required: false
        }
      ]
    });
  }

  /**
   * Find guest profile by email
   * Requirements: 12.7
   * 
   * @param {string} email - Email address
   * @returns {Promise<GuestProfile|null>}
   */
  async findGuestByEmail(email) {
    if (!email) return null;
    
    return GuestProfile.findOne({
      where: { 
        email: { [Op.iLike]: email.trim() }
      },
      include: [
        {
          model: GuestDocument,
          as: 'documents',
          required: false
        }
      ]
    });
  }

  /**
   * Find guest profile by ID number
   * Requirements: 12.7
   * 
   * @param {string} idNumber - ID document number
   * @returns {Promise<GuestProfile|null>}
   */
  async findGuestByIdNumber(idNumber) {
    if (!idNumber) return null;
    
    const normalizedIdNumber = idNumber.toUpperCase().replace(/\s/g, '');
    
    return GuestProfile.findOne({
      where: { idNumber: normalizedIdNumber },
      include: [
        {
          model: GuestDocument,
          as: 'documents',
          required: false
        }
      ]
    });
  }

  /**
   * Search guests by name, phone, email, or ID number
   * Requirements: 12.7
   * 
   * @param {string} query - Search query
   * @param {Object} options - Search options (limit, offset)
   * @returns {Promise<{guests: GuestProfile[], total: number}>}
   */
  async searchGuests(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    if (!query || query.trim().length < 2) {
      return { guests: [], total: 0 };
    }

    const searchTerm = query.trim();
    
    const whereClause = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { phone: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.iLike]: `%${searchTerm}%` } },
        { idNumber: { [Op.iLike]: `%${searchTerm}%` } }
      ]
    };

    const { count, rows } = await GuestProfile.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['name', 'ASC']],
      include: [
        {
          model: GuestDocument,
          as: 'documents',
          required: false
        }
      ]
    });

    return {
      guests: rows,
      total: count
    };
  }

  /**
   * Update guest profile
   * Requirements: 12.1
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @param {Object} updateData - Data to update
   * @returns {Promise<GuestProfile>} Updated guest profile
   */
  async updateGuestProfile(guestProfileId, updateData) {
    const guestProfile = await GuestProfile.findByPk(guestProfileId);
    if (!guestProfile) {
      throw new Error('Guest profile not found');
    }

    const {
      name,
      email,
      phone,
      address,
      idType,
      idNumber,
      idVerified,
      idVerifiedBy
    } = updateData;

    // Validate phone if being updated
    if (phone && phone !== guestProfile.phone) {
      if (!this.validatePhone(phone)) {
        throw new Error('Invalid phone number format. Must be 10 digits.');
      }
      
      // Check if new phone is already in use
      const existingGuest = await this.findGuestByPhone(phone);
      if (existingGuest && existingGuest.id !== guestProfileId) {
        throw new Error('A guest profile with this phone number already exists.');
      }
    }

    // Validate email if being updated
    if (email && !this.validateEmail(email)) {
      throw new Error('Invalid email format.');
    }

    // Validate ID number if being updated
    if (idType && idNumber) {
      const idValidation = this.validateIdNumber(idType, idNumber);
      if (!idValidation.valid) {
        throw new Error(idValidation.message);
      }
    }

    // Build update object
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (idType !== undefined) updates.idType = idType;
    if (idNumber !== undefined) {
      updates.idNumber = idNumber ? idNumber.toUpperCase().replace(/\s/g, '') : null;
    }
    if (idVerified !== undefined) {
      updates.idVerified = idVerified;
      if (idVerified) {
        updates.idVerifiedAt = new Date();
        updates.idVerifiedBy = idVerifiedBy;
      }
    }

    await guestProfile.update(updates);
    
    return guestProfile;
  }

  /**
   * Validate ID number format based on ID type
   * Requirements: 3.4
   * 
   * @param {string} idType - Type of ID (aadhaar, pan, passport, driving_license, voter_id)
   * @param {string} idNumber - ID number to validate
   * @returns {{valid: boolean, message?: string, normalizedIdNumber?: string}}
   */
  validateIdNumber(idType, idNumber) {
    if (!idType || !idNumber) {
      return { valid: false, message: 'ID type and number are required' };
    }

    const idConfig = GuestService.ID_PATTERNS[idType];
    if (!idConfig) {
      return { valid: false, message: `Invalid ID type: ${idType}` };
    }

    const normalizedIdNumber = idNumber.toUpperCase().replace(/\s/g, '');
    
    if (!idConfig.pattern.test(normalizedIdNumber)) {
      return {
        valid: false,
        message: `Invalid ${idType.replace('_', ' ')} format. Expected: ${idConfig.description} (e.g., ${idConfig.example})`
      };
    }

    return { valid: true, normalizedIdNumber };
  }

  /**
   * Validate phone number format
   * 
   * @param {string} phone - Phone number
   * @returns {boolean}
   */
  validatePhone(phone) {
    if (!phone) return false;
    const normalizedPhone = phone.replace(/\D/g, '');
    return /^[0-9]{10}$/.test(normalizedPhone);
  }

  /**
   * Validate email format
   * 
   * @param {string} email - Email address
   * @returns {boolean}
   */
  validateEmail(email) {
    if (!email) return false;
    return /^\S+@\S+\.\S+$/.test(email.trim());
  }

  /**
   * Get guest profile with stay history
   * Requirements: 12.6
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @returns {Promise<{profile: GuestProfile, bookings: Booking[]}>}
   */
  async getGuestWithHistory(guestProfileId) {
    const profile = await GuestProfile.findByPk(guestProfileId, {
      include: [
        {
          model: GuestDocument,
          as: 'documents',
          required: false
        }
      ]
    });

    if (!profile) {
      throw new Error('Guest profile not found');
    }

    // Get all bookings for this guest
    const bookings = await Booking.findAll({
      where: { guestProfileId },
      order: [['checkIn', 'DESC']],
      include: [
        { association: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { association: 'property', attributes: ['id', 'name'] }
      ]
    });

    return { profile, bookings };
  }

  /**
   * Record a stay for a guest (increment stay count)
   * 
   * @param {string} guestProfileId - Guest profile UUID
   * @param {Date} stayDate - Date of the stay
   * @returns {Promise<GuestProfile>}
   */
  async recordStay(guestProfileId, stayDate = new Date()) {
    const profile = await GuestProfile.findByPk(guestProfileId);
    if (!profile) {
      throw new Error('Guest profile not found');
    }

    await profile.update({
      totalStays: profile.totalStays + 1,
      lastStayDate: stayDate
    });

    return profile;
  }

  /**
   * Find or create guest profile
   * 
   * @param {Object} guestData - Guest data
   * @returns {Promise<{profile: GuestProfile, created: boolean}>}
   */
  async findOrCreateGuest(guestData) {
    const { phone, email, name, address, idType, idNumber } = guestData;

    // Try to find by phone first
    let profile = await this.findGuestByPhone(phone);
    if (profile) {
      return { profile, created: false };
    }

    // Try to find by email if phone not found
    if (email) {
      profile = await this.findGuestByEmail(email);
      if (profile) {
        return { profile, created: false };
      }
    }

    // Create new profile
    profile = await this.createGuestProfile({
      name,
      email,
      phone,
      address,
      idType,
      idNumber
    });

    return { profile, created: true };
  }
}

module.exports = new GuestService();
