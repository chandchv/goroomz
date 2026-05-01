const admin = require('../config/firebaseAdmin');
const { User } = require('../models');

// Protect routes - require authentication
const protect = async (req, res, next) => {
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

    try {
      // First try JWT verification (used by internal management system)
      const jwt = require('jsonwebtoken');
      if (process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findByPk(decoded.id);
          if (user) {
            req.user = user;
            return next();
          }
        } catch (jwtError) {
          // Not a valid JWT, try Firebase next
        }
      }

      // Then try Firebase ID token verification
      const decodedToken = await admin.auth().verifyIdToken(token);
      const { uid, email, name, phone_number } = decodedToken;

      // Find or create user in local DB
      let user = await User.findOne({ where: { firebase_uid: uid } });

      if (!user) {
        // If user doesn't exist, create a new one
        user = await User.create({
          firebase_uid: uid,
          email: email,
          name: name || 'New User',
          phone: phone_number,
          role: 'user' // default role
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Firebase token verification error:', error);
      
      // If Firebase is not configured, allow development mode access
      if (process.env.NODE_ENV === 'development' && error.message.includes('Firebase')) {
        console.warn('⚠️  Firebase not configured - using development mode authentication');
        
        // Try to find or create a dev user with a valid UUID
        try {
          let devUser = await User.findOne({ where: { email: 'dev@example.com' } });
          if (!devUser) {
            devUser = await User.create({
              firebase_uid: 'dev-firebase-uid',
              email: 'dev@example.com',
              name: 'Development User',
              role: 'admin'
            });
            console.log('✅ Created development user:', devUser.id);
          }
          req.user = devUser;
        } catch (dbError) {
          console.error('Failed to create dev user:', dbError.message);
          // Fallback to mock user with valid UUID format
          req.user = {
            id: '00000000-0000-0000-0000-000000000001',
            firebase_uid: 'dev-uid',
            email: 'dev@example.com',
            name: 'Development User',
            role: 'admin'
          };
        }
        return next();
      }
      
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
const authorize = (...roles) => {
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
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid } = decodedToken;
        
        const user = await User.findOne({ where: { firebase_uid: uid } });
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

// Export with multiple names for compatibility
module.exports = {
  protect,
  authorize,
  optionalAuth,
  // Aliases for different naming conventions used in routes
  authenticateToken: protect,
  authorizeRoles: authorize
};