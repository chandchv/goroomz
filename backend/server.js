const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const roomTypeRoutes = require('./routes/roomTypes');
const bookingRoutes = require('./routes/bookings');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const leadRoutes = require('./routes/leads');
const communicationRoutes = require('./routes/communications');
const checkInRoutes = require('./routes/checkIn');
const checkOutRoutes = require('./routes/checkOut');
const guestRoutes = require('./routes/guests');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const propertyRoutes = require('./routes/properties');
const notificationRoutes = require('./routes/notifications');
const amadeusRoutes = require('./routes/amadeus');
const searchRoutes = require('./routes/search');
const internalRoutes = require('./routes/internal');

// Notification service for scheduler initialization
const notificationService = require('./services/notifications');

// Amadeus service for initialization
const { getConfig: getAmadeusConfig } = require('./services/amadeus/config');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// CORS configuration with allowlist support
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://goroomz.in',
  'https://www.goroomz.in'
];

const envOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

const singleEnvOrigin = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...singleEnvOrigin, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow non-browser or same-origin requests
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`⚠️  CORS blocked for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files as static assets with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(require('path').join(__dirname, 'uploads')));

// Database connection and sync
const initializeDatabase = async () => {
  try {
    const connected = await testConnection();
    if (connected) {
      // Only sync if tables don't exist (don't force in development to preserve data)
      await syncDatabase(false);
    } else {
      console.warn('⚠️  Skipping database sync due to connection failure');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting in production mode due to database failure');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in development mode without database');
    }
  }
};

// Initialize notification scheduler
const initializeNotificationScheduler = () => {
  try {
    // Only start scheduler in production or if explicitly enabled
    const shouldStartScheduler = process.env.NODE_ENV === 'production' || 
                                  process.env.ENABLE_NOTIFICATION_SCHEDULER === 'true';
    
    if (shouldStartScheduler) {
      notificationService.startScheduler();
      console.log('✅ Notification scheduler started');
    } else {
      console.log('ℹ️  Notification scheduler disabled (set ENABLE_NOTIFICATION_SCHEDULER=true to enable)');
    }
  } catch (error) {
    console.error('❌ Failed to start notification scheduler:', error.message);
    // Don't exit - scheduler failure shouldn't prevent server from running
  }
};

// Initialize Amadeus integration
const initializeAmadeusIntegration = () => {
  try {
    const amadeusConfig = getAmadeusConfig();
    
    if (amadeusConfig.isEnabled()) {
      // Validate configuration
      amadeusConfig.validate();
      
      console.log('✅ Amadeus integration enabled');
      console.log(`   Base URL: ${amadeusConfig.baseUrl}`);
      console.log(`   Default radius: ${amadeusConfig.defaultRadius} ${amadeusConfig.defaultRadiusUnit}`);
      console.log(`   Cache TTL - Token: ${amadeusConfig.tokenCacheTTL}s, Hotel: ${amadeusConfig.hotelCacheTTL}s, Search: ${amadeusConfig.searchCacheTTL}s`);
    } else {
      console.log('ℹ️  Amadeus integration disabled (set AMADEUS_ENABLED=true to enable)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Amadeus integration:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting in production mode due to Amadeus configuration failure');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing in development mode without Amadeus integration');
    }
  }
};

// Initialize database
initializeDatabase();

// Initialize notification scheduler after database
initializeNotificationScheduler();

// Initialize Amadeus integration
initializeAmadeusIntegration();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api', internalRoutes);
app.use('/api', leadRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/check-outs', checkOutRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/amadeus', amadeusRoutes);
app.use('/api/search', searchRoutes);
console.log('✅ Internal management routes registered at /api/internal');
console.log('✅ Admin routes registered at /api/admin');
console.log('✅ Lead routes registered at /api');
console.log('✅ Communication routes registered at /api/communications');
console.log('✅ Check-in routes registered at /api/check-ins');
console.log('✅ Check-out routes registered at /api/check-outs');
console.log('✅ Guest routes registered at /api/guests');
console.log('✅ Payment routes registered at /api/payments');
console.log('✅ Report routes registered at /api/reports');
console.log('✅ Property routes registered at /api/properties');
console.log('✅ Notification routes registered at /api/notifications');
console.log('✅ Notification preferences routes registered at /api/notifications/preferences');
console.log('✅ Amadeus monitoring routes registered at /api/amadeus');
console.log('✅ Unified search routes registered at /api/search');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// === CRITICAL FIX: Explicitly bind to '0.0.0.0' for IPv4/IPv6 compatibility ===
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`?? Server running on port ${PORT} at 0.0.0.0`);
  console.log(`?? Environment: ${process.env.NODE_ENV || 'development'}`);
});


server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️  Port ${PORT} is in use, trying port ${PORT + 1}...`);
    const newPort = PORT + 1;
    const newServer = app.listen(newPort, () => {
      console.log(`🚀 Server running on port ${newPort}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Stop notification scheduler
  try {
    notificationService.stopScheduler();
    console.log('✅ Notification scheduler stopped');
  } catch (error) {
    console.error('❌ Error stopping notification scheduler:', error.message);
  }
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
