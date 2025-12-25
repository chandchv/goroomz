const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const propertyRoutes = require('./routes/properties');
const roomTypeRoutes = require('./routes/roomTypes');
const bookingRoutes = require('./routes/bookings');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');

// Internal Management Routes
const internalAuthRoutes = require('./routes/internal/auth');
const internalRoomRoutes = require('./routes/internal/rooms');
const internalCategoryRoutes = require('./routes/internal/categories');
const internalBedRoutes = require('./routes/internal/beds');
const internalBookingRoutes = require('./routes/internal/bookings');
const internalPaymentRoutes = require('./routes/internal/payments');
const internalDepositRoutes = require('./routes/internal/deposits');
const internalHousekeepingRoutes = require('./routes/internal/housekeeping');
const internalMaintenanceRoutes = require('./routes/internal/maintenance');
const internalReportRoutes = require('./routes/internal/reports');
const internalDashboardRoutes = require('./routes/internal/dashboard');
const internalDashboardsRoutes = require('./routes/internal/dashboards');
const internalStaffRoutes = require('./routes/internal/staff');
const internalPropertyStaffRoutes = require('./routes/internal/propertyStaff');
const internalSuperuserRoutes = require('./routes/internal/superuser');
const internalRoleRoutes = require('./routes/internal/roles');
const internalUserRoutes = require('./routes/internal/users');
const internalLeadRoutes = require('./routes/internal/leads');
const internalCommissionRoutes = require('./routes/internal/commissions');
const internalTerritoryRoutes = require('./routes/internal/territories');
const internalTargetRoutes = require('./routes/internal/targets');
const internalTicketRoutes = require('./routes/internal/tickets');
const internalDocumentRoutes = require('./routes/internal/documents');
const internalAuditRoutes = require('./routes/internal/audit');
const internalAnalyticsRoutes = require('./routes/internal/analytics');
const internalNotificationRoutes = require('./routes/internal/notifications');
const internalAnnouncementRoutes = require('./routes/internal/announcements');
const internalSubscriptionRoutes = require('./routes/internal/subscriptions');
const internalSearchRoutes = require('./routes/internal/search');
const internalAPIKeyRoutes = require('./routes/internal/api-keys');
const internalHealthRoutes = require('./routes/internal/health');
const internalMigrateRoutes = require('./routes/internal/migrate');
const internalPropertiesRoutes = require('./routes/internal/properties');

// Platform Routes (Platform Staff Only)
const platformPropertiesRoutes = require('./routes/internal/platform/properties');
const platformOwnersRoutes = require('./routes/internal/platform/owners');
const platformAgentsRoutes = require('./routes/internal/platform/agents');

// Internal Management Authentication Middleware
const { protectInternal } = require('./middleware/internalAuth');

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
  'http://localhost:5174',
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

      console.warn(`âš ï¸  CORS blocked for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Serve uploaded files (with authentication)
app.use('/uploads', express.static('uploads'));

// Database connection and sync
const initializeDatabase = async () => {
  try {
    await testConnection();
    console.log('✅ Database connection successful');
    
    // Skip database sync for now to avoid sync issues
    console.log('ℹ️ Skipping database sync - using existing schema');
  } catch (error) {
    console.error('âŒ Database initialization failed:', error);
    process.exit(1);
  }
};

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
console.log('âœ… Property routes registered at /api/properties');
console.log('âœ… Admin routes registered at /api/admin');

// Internal Management Routes
// Auth routes are public (no authentication required for login)
app.use('/api/internal/auth', internalAuthRoutes);
console.log('âœ… Internal management auth routes registered at /api/internal/auth');

// All other internal routes require authentication
app.use('/api/internal/rooms', protectInternal, internalRoomRoutes);
console.log('âœ… Internal management room routes registered at /api/internal/rooms');

app.use('/api/internal/categories', protectInternal, internalCategoryRoutes);
console.log('âœ… Internal management category routes registered at /api/internal/categories');

app.use('/api/internal/beds', protectInternal, internalBedRoutes);
console.log('âœ… Internal management bed routes registered at /api/internal/beds');

app.use('/api/internal/bookings', protectInternal, internalBookingRoutes);
console.log('âœ… Internal management booking routes registered at /api/internal/bookings');

app.use('/api/internal/payments', protectInternal, internalPaymentRoutes);
console.log('âœ… Internal management payment routes registered at /api/internal/payments');

app.use('/api/internal/deposits', protectInternal, internalDepositRoutes);
console.log('âœ… Internal management deposit routes registered at /api/internal/deposits');

app.use('/api/internal/housekeeping', protectInternal, internalHousekeepingRoutes);
console.log('âœ… Internal management housekeeping routes registered at /api/internal/housekeeping');

app.use('/api/internal/maintenance', protectInternal, internalMaintenanceRoutes);
console.log('âœ… Internal management maintenance routes registered at /api/internal/maintenance');

app.use('/api/internal/reports', protectInternal, internalReportRoutes);
console.log('âœ… Internal management report routes registered at /api/internal/reports');

app.use('/api/internal/dashboard', protectInternal, internalDashboardRoutes);
console.log('âœ… Internal management dashboard routes registered at /api/internal/dashboard');

app.use('/api/internal/dashboards', protectInternal, internalDashboardsRoutes);
console.log('âœ… Internal role dashboards routes registered at /api/internal/dashboards');

app.use('/api/internal/staff', protectInternal, internalStaffRoutes);
console.log('âœ… Internal management staff routes registered at /api/internal/staff');

app.use('/api/internal/property-staff', protectInternal, internalPropertyStaffRoutes);
console.log('âœ… Property staff management routes registered at /api/internal/property-staff');

app.use('/api/internal/superuser', protectInternal, internalSuperuserRoutes);
console.log('âœ… Internal management superuser routes registered at /api/internal/superuser');

app.use('/api/internal/roles', protectInternal, internalRoleRoutes);
console.log('âœ… Internal role management routes registered at /api/internal/roles');

app.use('/api/internal/users', protectInternal, internalUserRoutes);
console.log('âœ… Internal user management routes registered at /api/internal/users');

app.use('/api/internal/leads', protectInternal, internalLeadRoutes);
console.log('âœ… Internal lead management routes registered at /api/internal/leads');

app.use('/api/internal/commissions', protectInternal, internalCommissionRoutes);
console.log('âœ… Internal commission management routes registered at /api/internal/commissions');

app.use('/api/internal/territories', protectInternal, internalTerritoryRoutes);
console.log('âœ… Internal territory management routes registered at /api/internal/territories');

app.use('/api/internal/targets', protectInternal, internalTargetRoutes);
console.log('âœ… Internal target management routes registered at /api/internal/targets');

app.use('/api/internal/tickets', protectInternal, internalTicketRoutes);
console.log('âœ… Internal ticket management routes registered at /api/internal/tickets');

app.use('/api/internal/documents', protectInternal, internalDocumentRoutes);
console.log('âœ… Internal document management routes registered at /api/internal/documents');

app.use('/api/internal/audit', protectInternal, internalAuditRoutes);
console.log('âœ… Internal audit log routes registered at /api/internal/audit');

app.use('/api/internal/analytics', protectInternal, internalAnalyticsRoutes);
console.log('âœ… Internal analytics routes registered at /api/internal/analytics');

app.use('/api/internal/notifications', protectInternal, internalNotificationRoutes);
console.log('âœ… Internal notification routes registered at /api/internal/notifications');

app.use('/api/internal/announcements', protectInternal, internalAnnouncementRoutes);
console.log('âœ… Internal announcement routes registered at /api/internal/announcements');

app.use('/api/internal/subscriptions', protectInternal, internalSubscriptionRoutes);
console.log('âœ… Internal subscription management routes registered at /api/internal/subscriptions');

app.use('/api/internal/search', protectInternal, internalSearchRoutes);
console.log('âœ… Internal search routes registered at /api/internal/search');

app.use('/api/internal/api-keys', protectInternal, internalAPIKeyRoutes);
console.log('âœ… Internal API key management routes registered at /api/internal/api-keys');

app.use('/api/internal/health', protectInternal, internalHealthRoutes);
console.log('âœ… Internal platform health monitoring routes registered at /api/internal/health');

app.use('/api/internal/migrate', internalMigrateRoutes);
console.log('âœ… Internal migration routes registered at /api/internal/migrate');

app.use('/api/internal/properties', protectInternal, internalPropertiesRoutes);
console.log('âœ… Internal properties routes registered at /api/internal/properties');

// Platform Routes (Platform Staff Only - /platform/ prefix)
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
app.use('/api/internal/platform/properties', protectInternal, platformPropertiesRoutes);
console.log('âœ… Platform properties routes registered at /api/internal/platform/properties');

app.use('/api/internal/platform/owners', protectInternal, platformOwnersRoutes);
console.log('âœ… Platform owners routes registered at /api/internal/platform/owners');

app.use('/api/internal/platform/agents', protectInternal, platformAgentsRoutes);
console.log('âœ… Platform agents routes registered at /api/internal/platform/agents');

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

const server = app.listen(PORT, () => {
  console.log(`ðŸš€ Server running on port ${PORT}`);
  console.log(`ðŸ“± Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`âš ï¸  Port ${PORT} is in use, trying port ${PORT + 1}...`);
    const newPort = PORT + 1;
    const newServer = app.listen(newPort, () => {
      console.log(`ðŸš€ Server running on port ${newPort}`);
      console.log(`ðŸ“± Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else {
    console.error('âŒ Server error:', err);
    process.exit(1);
  }
});
