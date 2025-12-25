const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * User validation utilities for email and phone uniqueness checks
 * Provides consistent validation across all user creation endpoints
 */

/**
 * Check if email already exists in the database
 * @param {string} email - Email to check
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if email exists, false otherwise
 */
const checkEmailExists = async (email, excludeUserId = null) => {
  if (!email) return false;

  const whereClause = { 
    email: email.toLowerCase().trim() 
  };

  // Exclude specific user ID if provided (for update operations)
  if (excludeUserId) {
    whereClause.id = { [Op.ne]: excludeUserId };
  }

  try {
    const existingUser = await User.findOne({ where: whereClause });
    return !!existingUser;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false; // Don't block operations if check fails
  }
};

/**
 * Check if phone number already exists in the database
 * @param {string} phone - Phone number to check
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if phone exists, false otherwise
 */
const checkPhoneExists = async (phone, excludeUserId = null) => {
  if (!phone) return false;

  const whereClause = { 
    phone: phone.trim() 
  };

  // Exclude specific user ID if provided (for update operations)
  if (excludeUserId) {
    whereClause.id = { [Op.ne]: excludeUserId };
  }

  try {
    const existingUser = await User.findOne({ where: whereClause });
    return !!existingUser;
  } catch (error) {
    console.error('Error checking phone existence:', error);
    return false; // Don't block operations if check fails
  }
};

/**
 * Validate email and phone uniqueness for user creation
 * @param {string} email - Email to validate
 * @param {string} phone - Phone to validate
 * @returns {Promise<{isValid: boolean, errors: object}>} - Validation result
 */
const validateUserUniqueness = async (email, phone) => {
  const errors = {};

  // Check email uniqueness
  if (email) {
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      errors.email = 'A user with this email already exists';
    }
  }

  // Check phone uniqueness
  if (phone) {
    const phoneExists = await checkPhoneExists(phone);
    if (phoneExists) {
      errors.phone = 'A user with this phone number already exists';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate email and phone uniqueness for user updates
 * @param {string} userId - ID of user being updated
 * @param {string} email - Email to validate
 * @param {string} phone - Phone to validate
 * @returns {Promise<{isValid: boolean, errors: object}>} - Validation result
 */
const validateUserUniquenessForUpdate = async (userId, email, phone) => {
  const errors = {};

  // Check email uniqueness (excluding current user)
  if (email) {
    const emailExists = await checkEmailExists(email, userId);
    if (emailExists) {
      errors.email = 'A user with this email already exists';
    }
  }

  // Check phone uniqueness (excluding current user)
  if (phone) {
    const phoneExists = await checkPhoneExists(phone, userId);
    if (phoneExists) {
      errors.phone = 'A user with this phone number already exists';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
const isValidEmailFormat = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate phone format
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid format, false otherwise
 */
const isValidPhoneFormat = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone.trim());
};

/**
 * Comprehensive user validation for creation
 * @param {object} userData - User data to validate
 * @returns {Promise<{isValid: boolean, errors: object}>} - Validation result
 */
const validateUserCreation = async (userData) => {
  const { name, email, phone } = userData;
  const errors = {};

  // Validate required fields
  if (!name || !name.trim()) {
    errors.name = 'Name is required';
  }

  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmailFormat(email)) {
    errors.email = 'Invalid email format';
  }

  // Validate phone format if provided
  if (phone && !isValidPhoneFormat(phone)) {
    errors.phone = 'Phone number must be 10-15 digits and may start with +';
  }

  // If format validation passes, check uniqueness
  if (!errors.email || !errors.phone) {
    const uniquenessResult = await validateUserUniqueness(email, phone);
    Object.assign(errors, uniquenessResult.errors);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  checkEmailExists,
  checkPhoneExists,
  validateUserUniqueness,
  validateUserUniquenessForUpdate,
  isValidEmailFormat,
  isValidPhoneFormat,
  validateUserCreation
};