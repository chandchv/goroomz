const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
exports.validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be a valid 10-digit number')
];

exports.validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Room validation rules
exports.validateRoom = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),
  body('price')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('roomType')
    .isIn(['Private Room', 'Shared Room', 'Entire Place', 'Studio'])
    .withMessage('Invalid room type'),
  body('category')
    .isIn(['PG', 'Hotel Room', 'Independent Home', 'Home Stay'])
    .withMessage('Invalid category'),
  body('maxGuests')
    .isInt({ min: 1, max: 10 })
    .withMessage('Maximum guests must be between 1 and 10'),
  body('location.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('location.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('location.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('location.pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Invalid pincode')
];

// Booking validation rules
exports.validateBooking = [
  body('room')
    .isUUID()
    .withMessage('Valid room ID is required'),
  body('checkIn')
    .isISO8601()
    .withMessage('Valid check-in date is required'),
  body('checkOut')
    .isISO8601()
    .withMessage('Valid check-out date is required'),
  body('guests')
    .isInt({ min: 1, max: 10 })
    .withMessage('Number of guests must be between 1 and 10'),
  body('contactInfo.phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit phone number is required'),
  body('contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

// ID validation
exports.validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`Valid ${paramName} is required`)
];

// Query validation
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];
