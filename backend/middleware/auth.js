const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');
const { User } = require('../models');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // First attempt to verify as local JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or no longer exists.'
        });
      }

      req.user = user;
      return next();
    } catch (jwtError) {
      // If JWT verification failed for reasons other than token format, log for debugging
      if (jwtError.name !== 'JsonWebTokenError' && jwtError.name !== 'TokenExpiredError') {
        console.warn('JWT verification error:', jwtError.message);
      }
      // Fall through to Firebase verification
    }

    try {
      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const { uid, email, name, phone_number } = decodedToken;

      // Find or create user in local DB
      let user = await User.findOne({ where: { firebase_uid: uid } });

      if (!user) {
        user = await User.create({
          firebase_uid: uid,
          email: email,
          name: name || 'New User',
          phone: phone_number,
          role: 'user' // default role
        });
      }

      req.user = user;
      return next();
    } catch (firebaseError) {
      console.error('Token verification error:', firebaseError.message);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Invalid token in optional auth:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};
