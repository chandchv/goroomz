const request = require('supertest');
const express = require('express');
const { sequelize } = require('../config/database');
const { syncDatabase } = require('../models');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const HousekeepingLog = require('../models/HousekeepingLog');
const PaymentSchedule = require('../models/PaymentSchedule');
const RoomCategory = require('../models/RoomCategory');
const jwt = require('jsonwebtoken');

// Import routes
const reportRoutes = require('../routes/internal/reports');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/internal/reports', reportRoutes);

describe('Internal Management - Reporting Endpoints', () => {
  let authToken;
  let testUser;
  let testRoom;
  let testBooking;
  let testCategory;

  beforeAll(async () => {
    // Initialize test database
    await syncDatabase(true); // Force sync to reset tables

    // Create test user with internal management permissions
    testUser = await User.create({
      name: 'Test Manager',
      email: 'manager@test.com',
      phone: '1234567890',
      password: 'password123',
      role: 'owner',
      isVerified: true,
      staffRole: 'manager',
      permissions: {
        canCheckIn: true,
        canCheckOut: true,
        canManageRooms: true,
        canRecordPayments: true,
        canViewReports: true,
        canManageStaff: true,
        canUpdateRoomStatus: true,
        canManageMaintenance: true
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test category
    testCategory = await RoomCategory.create({
      propertyId: testUser.id,
      name: 'Deluxe',
      description: 'Deluxe rooms',
      isActive: true
    });

    // Create test room
    testRoom = await Room.create({
      title: 'Test Room 101',
      description: 'A test room',
      price: 1000,
      location: 'Test Location',
      amenities: ['WiFi', 'AC'],
      images: [],
      ownerId: testUser.id,
      roomNumber: '101',
      floorNumber: 1,
      customCategoryId: testCategory.id,
      currentStatus: 'vacant_clean',
      isApproved: true
    });

    // Create test booking
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() - 5);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 5);

    testBooking = await Booking.create({
      roomId: testRoom.id,
      userId: testUser.id,
      ownerId: testUser.id,
      checkIn,
      checkOut,
      guests: 2,
      totalAmount: 10000,
      contactInfo: {
        phone: '1234567890',
        email: 'guest@test.com'
      },
      status: 'confirmed',
      paymentStatus: 'partial',
      bookingSource: 'offline'
    });

    // Create test payment
    await Payment.create({
      bookingId: testBooking.id,
      amount: 5000,
      paymentDate: new Date(),
      paymentMethod: 'cash',
      paymentType: 'booking',
      status: 'completed',
      recordedBy: testUser.id
    });

    // Create test housekeeping log
    await HousekeepingLog.create({
      roomId: testRoom.id,
      cleanedBy: testUser.id,
      cleanedAt: new Date(),
      timeTaken: 30,
      checklistCompleted: [],
      notes: 'Test cleaning'
    });

    // Create test payment schedule
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await PaymentSchedule.create({
      bookingId: testBooking.id,
      dueDate,
      amount: 5000,
      status: 'pending'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/internal/reports/occupancy', () => {
    it('should generate occupancy report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .get('/api/internal/reports/occupancy')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRooms');
      expect(response.body.data).toHaveProperty('occupancyPercentage');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('byFloor');
    });

    it('should return 400 if dates are missing', async () => {
      const response = await request(app)
        .get('/api/internal/reports/occupancy')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/internal/reports/revenue', () => {
    it('should generate revenue report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .get('/api/internal/reports/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('bySource');
      expect(response.body.data).toHaveProperty('paymentStatus');
    });

    it('should include period comparison when requested', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .get('/api/internal/reports/revenue')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id,
          compareWithPrevious: 'true'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparison');
    });
  });

  describe('GET /api/internal/reports/bookings', () => {
    it('should generate booking report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .get('/api/internal/reports/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalBookings');
      expect(response.body.data).toHaveProperty('statusBreakdown');
      expect(response.body.data).toHaveProperty('sourceDistribution');
      expect(response.body.data).toHaveProperty('guestStatistics');
    });
  });

  describe('GET /api/internal/reports/housekeeping', () => {
    it('should generate housekeeping report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .get('/api/internal/reports/housekeeping')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRoomsCleaned');
      expect(response.body.data).toHaveProperty('averageCleaningTime');
      expect(response.body.data).toHaveProperty('pendingTasks');
    });
  });

  describe('GET /api/internal/reports/payments', () => {
    it('should generate payment collection report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const response = await request(app)
        .get('/api/internal/reports/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('paymentTiming');
      expect(response.body.data).toHaveProperty('defaulters');
    });
  });

  describe('POST /api/internal/reports/export', () => {
    it('should export occupancy report as CSV', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .post('/api/internal/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'occupancy',
          format: 'csv',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Room Number');
    });

    it('should return 501 for PDF export (not implemented)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .post('/api/internal/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'occupancy',
          format: 'pdf',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(501);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid report type', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);

      const response = await request(app)
        .post('/api/internal/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'invalid',
          format: 'csv',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          propertyId: testUser.id
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
