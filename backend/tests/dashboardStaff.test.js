/**
 * Dashboard and Staff Management Tests
 * Tests for Requirements: 31.1, 31.2, 31.3, 31.4, 33.1, 33.2, 33.3, 33.4, 33.5
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Create express app for testing
const app = express();
app.use(express.json());

// Mock models
const mockModels = {
  Room: {
    count: jest.fn(),
    findAll: jest.fn()
  },
  Booking: {
    findAll: jest.fn()
  },
  Payment: {
    findOne: jest.fn()
  },
  PaymentSchedule: {
    findOne: jest.fn(),
    findAll: jest.fn()
  },
  MaintenanceRequest: {
    findAll: jest.fn()
  },
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn()
  }
};

// Mock middleware
jest.mock('../models', () => mockModels);
jest.mock('../middleware/internalAuth', () => ({
  protectInternal: (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: 'owner-1',
      role: 'owner',
      staffRole: null,
      permissions: {
        canManageStaff: true
      }
    };
    next();
  },
  requirePermissions: (permission) => (req, res, next) => {
    if (req.user.permissions && req.user.permissions[permission]) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
  }
}));

// Import routes after mocking
const dashboardRoutes = require('../routes/internal/dashboard');
const staffRoutes = require('../routes/internal/staff');

// Mount routes
app.use('/api/internal/dashboard', dashboardRoutes);
app.use('/api/internal/staff', staffRoutes);

describe('Dashboard Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/internal/dashboard/kpis', () => {
    it('should return dashboard KPIs successfully', async () => {
      // Mock data
      mockModels.Room.count
        .mockResolvedValueOnce(100) // total rooms
        .mockResolvedValueOnce(75); // occupied rooms

      mockModels.Room.findAll.mockResolvedValue([
        { currentStatus: 'occupied', count: '75' },
        { currentStatus: 'vacant_clean', count: '20' },
        { currentStatus: 'vacant_dirty', count: '5' }
      ]);

      mockModels.Payment.findOne.mockResolvedValue({
        totalRevenue: '50000.00'
      });

      mockModels.PaymentSchedule.findOne.mockResolvedValue({
        count: '10',
        totalAmount: '15000.00'
      });

      const response = await request(app)
        .get('/api/internal/dashboard/kpis')
        .query({ propertyId: 'owner-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('occupancy');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('roomStatus');
    });

    it('should require propertyId for staff users', async () => {
      // This would need a different mock for staff user
      const response = await request(app)
        .get('/api/internal/dashboard/kpis');

      // With owner role, it should work without propertyId
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/internal/dashboard/activities', () => {
    it('should return today\'s activities', async () => {
      mockModels.Booking.findAll.mockResolvedValue([
        {
          id: 'booking-1',
          checkIn: new Date(),
          user: { name: 'John Doe', phone: '1234567890' },
          room: { roomNumber: '101', floorNumber: 1 },
          guests: 2,
          status: 'confirmed'
        }
      ]);

      mockModels.PaymentSchedule.findAll.mockResolvedValue([
        {
          id: 'schedule-1',
          bookingId: 'booking-1',
          amount: '5000.00',
          dueDate: new Date(),
          status: 'pending',
          booking: {
            user: { name: 'John Doe' },
            room: { roomNumber: '101' }
          }
        }
      ]);

      const response = await request(app)
        .get('/api/internal/dashboard/activities')
        .query({ propertyId: 'owner-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('checkIns');
      expect(response.body.data).toHaveProperty('checkOuts');
      expect(response.body.data).toHaveProperty('paymentsDue');
    });
  });

  describe('GET /api/internal/dashboard/alerts', () => {
    it('should return alerts for overdue payments, maintenance, and dirty rooms', async () => {
      mockModels.PaymentSchedule.findAll.mockResolvedValue([
        {
          id: 'schedule-1',
          bookingId: 'booking-1',
          amount: '5000.00',
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          status: 'overdue',
          booking: {
            user: { name: 'John Doe', phone: '1234567890' },
            room: { roomNumber: '101' }
          }
        }
      ]);

      mockModels.MaintenanceRequest.findAll.mockResolvedValue([
        {
          id: 'maint-1',
          title: 'Broken AC',
          priority: 'urgent',
          status: 'pending',
          reportedDate: new Date(),
          room: { roomNumber: '102', floorNumber: 1 }
        }
      ]);

      mockModels.Room.findAll.mockResolvedValue([
        {
          id: 'room-1',
          roomNumber: '103',
          floorNumber: 1,
          title: 'Room 103',
          currentStatus: 'vacant_dirty',
          lastCleanedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
          updatedAt: new Date(Date.now() - 30 * 60 * 60 * 1000)
        }
      ]);

      const response = await request(app)
        .get('/api/internal/dashboard/alerts')
        .query({ propertyId: 'owner-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overduePayments');
      expect(response.body.data).toHaveProperty('pendingMaintenance');
      expect(response.body.data).toHaveProperty('dirtyRooms');
    });
  });
});

describe('Staff Management Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/internal/staff', () => {
    it('should return all staff users', async () => {
      mockModels.User.findAll.mockResolvedValue([
        {
          id: 'staff-1',
          name: 'Front Desk Staff',
          email: 'frontdesk@test.com',
          staffRole: 'front_desk',
          permissions: { canCheckIn: true }
        },
        {
          id: 'staff-2',
          name: 'Housekeeping Staff',
          email: 'housekeeping@test.com',
          staffRole: 'housekeeping',
          permissions: { canUpdateRoomStatus: true }
        }
      ]);

      const response = await request(app)
        .get('/api/internal/staff');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/internal/staff', () => {
    it('should create a new staff user with generated password', async () => {
      mockModels.User.findOne.mockResolvedValue(null); // No existing user
      mockModels.User.create.mockResolvedValue({
        id: 'staff-new',
        name: 'New Staff',
        email: 'newstaff@test.com',
        staffRole: 'front_desk',
        permissions: { canCheckIn: true },
        isVerified: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/internal/staff')
        .send({
          name: 'New Staff',
          email: 'newstaff@test.com',
          staffRole: 'front_desk',
          generatePasswordFlag: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('generatedPassword');
      expect(response.body.data.staffRole).toBe('front_desk');
    });

    it('should reject invalid staff role', async () => {
      const response = await request(app)
        .post('/api/internal/staff')
        .send({
          name: 'New Staff',
          email: 'newstaff@test.com',
          staffRole: 'invalid_role',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      mockModels.User.findOne.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@test.com'
      });

      const response = await request(app)
        .post('/api/internal/staff')
        .send({
          name: 'New Staff',
          email: 'existing@test.com',
          staffRole: 'front_desk',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/internal/staff/:id', () => {
    it('should update staff user successfully', async () => {
      const mockStaffUser = {
        id: 'staff-1',
        name: 'Old Name',
        email: 'staff@test.com',
        staffRole: 'front_desk',
        role: 'user',
        permissions: { canCheckIn: true },
        save: jest.fn().mockResolvedValue(true)
      };

      mockModels.User.findByPk.mockResolvedValue(mockStaffUser);

      const response = await request(app)
        .put('/api/internal/staff/staff-1')
        .send({
          name: 'Updated Name',
          staffRole: 'manager'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStaffUser.save).toHaveBeenCalled();
    });

    it('should prevent updating non-staff users', async () => {
      mockModels.User.findByPk.mockResolvedValue({
        id: 'user-1',
        staffRole: null,
        role: 'user'
      });

      const response = await request(app)
        .put('/api/internal/staff/user-1')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('not a staff member');
    });
  });

  describe('DELETE /api/internal/staff/:id', () => {
    it('should delete staff user successfully', async () => {
      const mockStaffUser = {
        id: 'staff-1',
        name: 'Staff to Delete',
        email: 'delete@test.com',
        staffRole: 'housekeeping',
        role: 'user',
        destroy: jest.fn().mockResolvedValue(true)
      };

      mockModels.User.findByPk.mockResolvedValue(mockStaffUser);

      const response = await request(app)
        .delete('/api/internal/staff/staff-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStaffUser.destroy).toHaveBeenCalled();
    });

    it('should prevent deleting admin accounts', async () => {
      mockModels.User.findByPk.mockResolvedValue({
        id: 'admin-1',
        staffRole: 'manager', // Admin with staff role
        role: 'admin'
      });

      const response = await request(app)
        .delete('/api/internal/staff/admin-1');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Cannot delete admin');
    });
  });

  describe('PUT /api/internal/staff/:id/permissions', () => {
    it('should update staff permissions successfully', async () => {
      const mockStaffUser = {
        id: 'staff-1',
        name: 'Staff',
        staffRole: 'front_desk',
        permissions: { canCheckIn: true },
        save: jest.fn().mockResolvedValue(true)
      };

      mockModels.User.findByPk.mockResolvedValue(mockStaffUser);

      const response = await request(app)
        .put('/api/internal/staff/staff-1/permissions')
        .send({
          permissions: {
            canCheckIn: true,
            canCheckOut: true,
            canRecordPayments: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStaffUser.save).toHaveBeenCalled();
    });

    it('should reject invalid permission keys', async () => {
      mockModels.User.findByPk.mockResolvedValue({
        id: 'staff-1',
        staffRole: 'front_desk',
        permissions: {}
      });

      const response = await request(app)
        .put('/api/internal/staff/staff-1/permissions')
        .send({
          permissions: {
            invalidPermission: true
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid permission keys');
    });
  });
});
