/**
 * Internal Routes Index
 * 
 * This file combines all domain-specific internal route modules into a single router.
 * Each domain route file handles a specific area of functionality for the internal management system.
 * 
 * Route files to be added:
 * - auth.js: Authentication routes (/internal/auth/*)
 * - dashboard.js: Dashboard KPIs, activities, alerts (/internal/dashboard/*)
 * - bookings.js: Booking management (/internal/bookings/*)
 * - properties.js: Property management (/internal/properties/*, /internal/platform/properties/*)
 * - rooms.js: Room management (/internal/rooms/*)
 * - leads.js: Lead management (/internal/leads/*)
 * - users.js: Internal user management (/internal/users/*)
 * - payments.js: Payments and deposits (/internal/payments/*, /internal/deposits/*)
 * - analytics.js: Platform analytics and audit (/internal/analytics/*, /internal/audit)
 * - territories.js: Territory management (/territories/*)
 * - staff.js: Staff management (/internal/staff/*)
 * - housekeeping.js: Housekeeping tasks (/internal/housekeeping/*)
 */

const express = require('express');
const router = express.Router();

// Import all domain route modules
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const bookingsRoutes = require('./bookings');
const propertiesRoutes = require('./properties');
const roomsRoutes = require('./rooms');
const leadsRoutes = require('./leads');
const usersRoutes = require('./users');
const paymentsRoutes = require('./payments');
const analyticsRoutes = require('./analytics');
const territoriesRoutes = require('./territories');
const staffRoutes = require('./staff');
const housekeepingRoutes = require('./housekeeping');

// Mount all domain routes on the combined router
router.use(authRoutes);
router.use(dashboardRoutes);
router.use(bookingsRoutes);
router.use(propertiesRoutes);
router.use(roomsRoutes);
router.use(leadsRoutes);
router.use(usersRoutes);
router.use(paymentsRoutes);
router.use(analyticsRoutes);
router.use(territoriesRoutes);
router.use(staffRoutes);
router.use(housekeepingRoutes);

module.exports = router;
