/**
 * Housekeeping and Maintenance Endpoints Tests
 * Tests for Requirements: 13.1, 13.2, 13.3, 13.4, 30.1, 30.2, 30.3, 30.4, 30.5
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Create mock data
const mockUsers = {
  owner: {
    id: 'owner-1',
    email: 'owner@test.com',
    name: 'Test Owner',
    role: 'owner',
    staffRole: null,
    permissions: null
  },
  housekeeping: {
    id: 'staff-1',
    email: 'housekeeping@test.com',
    name: 'Test Housekeeper',
    role: 'user',
    staffRole: 'housekeeping',
    permissions: {
      canUpdateRoomStatus: true
    }
  }
};

const mockRooms = {
  'room-1': {
    id: 'room-1',
    roomNumber: '101',
    floorNumber: 1,
    ownerId: 'owner-1',
    currentStatus: 'vacant_dirty',
    isActive: true,
    category: 'Standard',
    roomType: 'hotel',
    updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
    lastCleanedAt: null,
    lastMaintenanceAt: null,
    save: jest.fn().mockResolvedValue(true)
  },
  'room-2': {
    id: 'room-2',
    roomNumber: '102',
    floorNumber: 1,
    ownerId: 'owner-1',
    currentStatus: 'vacant_dirty',
    isActive: true,
    category: 'Deluxe',
    roomType: 'hotel',
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastCleanedAt: null,
    lastMaintenanceAt: null,
    save: jest.fn().mockResolvedValue(true)
  }
};

const mockHousekeepingLogs = [];
const mockMaintenanceRequests = [];

// Mock models
jest.mock('../models', () => ({
  Room: {
    findAll: jest.fn((options) => {
      const rooms = Object.values(mockRooms).filter(room => {
        if (options.where.ownerId !== room.ownerId) return false;
        if (options.where.currentStatus && room.currentStatus !== options.where.currentStatus) return false;
        if (options.where.floorNumber !== undefined && room.floorNumber !== options.where.floorNumber) return false;
        if (options.where.isActive !== undefined && room.isActive !== options.where.isActive) return false;
        return true;
      });
      return Promise.resolve(rooms);
    }),
    findByPk: jest.fn((id) => {
      return Promise.resolve(mockRooms[id] || null);
    })
  },
  HousekeepingLog: {
    create: jest.fn((data) => {
      const log = {
        id: `log-${mockHousekeepingLogs.length + 1}`,
        ...data,
        createdAt: new Date()
      };
      mockHousekeepingLogs.push(log);
      return Promise.resolve(log);
    }),
    findAndCountAll: jest.fn((options) => {
      const logs = mockHousekeepingLogs.filter(log => log.roomId === options.where.roomId);
      return Promise.resolve({
        count: logs.length,
        rows: logs.map(log => ({
          ...log,
          cleaner: mockUsers.housekeeping
        }))
      });
    })
  },
  MaintenanceRequest: {
    create: jest.fn((data) => {
      const request = {
        id: `maint-${mockMaintenanceRequests.length + 1}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockMaintenanceRequests.push(request);
      return Promise.resolve(request);
    }),
    findByPk: jest.fn((id, options) => {
      const request = mockMaintenanceRequests.find(r => r.id === id);
      if (!request) return Promise.resolve(null);
      
      const mockRequest = {
        ...request,
        room: mockRooms['room-1'],
        reporter: mockUsers.owner,
        assignee: null,
        save: jest.fn(async function() {
          // Update the original request in the array
          const index = mockMaintenanceRequests.findIndex(r => r.id === id);
          if (index !== -1) {
            Object.assign(mockMaintenanceRequests[index], this);
          }
          return true;
        })
      };
      
      return Promise.resolve(mockRequest);
    }),
    findAndCountAll: jest.fn((options) => {
      let requests = [...mockMaintenanceRequests];
      
      // Apply filters
      if (options.where.status) {
        requests = requests.filter(r => r.status === options.where.status);
      }
      if (options.where.priority) {
        requests = requests.filter(r => r.priority === options.where.priority);
      }
      
      return Promise.resolve({
        count: requests.length,
        rows: requests.map(r => ({
          ...r,
          room: mockRooms['room-1'],
          reporter: mockUsers.owner,
          assignee: null
        }))
      });
    })
  },
  User: {
    findByPk: jest.fn((id) => {
      const user = Object.values(mockUsers).find(u => u.id === id);
      return Promise.resolve(user || null);
    })
  },
  RoomCategory: {}
}));

// Mock middleware
jest.mock('../middleware/internalAuth', () => {
  const mockJwt = require('jsonwebtoken');
  return {
    protectInternal: (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
      }
      try {
        const decoded = mockJwt.verify(token, process.env.JWT_SECRET);
        const mockUsers = {
          owner: {
            id: 'owner-1',
            email: 'owner@test.com',
            name: 'Test Owner',
            role: 'owner',
            staffRole: null,
            permissions: null
          },
          housekeeping: {
            id: 'staff-1',
            email: 'housekeeping@test.com',
            name: 'Test Housekeeper',
            role: 'user',
            staffRole: 'housekeeping',
            permissions: {
              canUpdateRoomStatus: true
            }
          }
        };
        req.user = mockUsers[decoded.userType] || mockUsers.owner;
        next();
      } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    },
    requirePermissions: (permission) => (req, res, next) => {
      if (req.user.role === 'admin' || req.user.role === 'owner') {
        return next();
      }
      if (req.user.permissions && req.user.permissions[permission]) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
  };
});

// Import routes after mocking
const housekeepingRoutes = require('../routes/internal/housekeeping');
const maintenanceRoutes = require('../routes/internal/maintenance');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/internal/housekeeping', housekeepingRoutes);
app.use('/api/internal/maintenance', maintenanceRoutes);

// Generate test tokens
const ownerToken = jwt.sign({ userType: 'owner', id: 'owner-1' }, process.env.JWT_SECRET);
const housekeepingToken = jwt.sign({ userType: 'housekeeping', id: 'staff-1' }, process.env.JWT_SECRET);

describe('Housekeeping Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHousekeepingLogs.length = 0;
  });

  describe('GET /api/internal/housekeeping/tasks', () => {
    it('should return pending cleaning tasks', async () => {
      const response = await request(app)
        .get('/api/internal/housekeeping/tasks')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
      
      // Check priority ordering (high priority first)
      expect(response.body.data[0].priority).toBe('high');
      expect(response.body.data[0].roomNumber).toBe('101');
      expect(response.body.data[1].priority).toBe('normal');
    });

    it('should filter by floor number', async () => {
      const response = await request(app)
        .get('/api/internal/housekeeping/tasks?floorNumber=1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/internal/housekeeping/tasks');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/internal/housekeeping/tasks/:roomId/complete', () => {
    it('should mark room as clean', async () => {
      const response = await request(app)
        .post('/api/internal/housekeeping/tasks/room-1/complete')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({
          timeTaken: 30,
          checklistCompleted: [
            { item: 'Bed made', completed: true },
            { item: 'Bathroom cleaned', completed: true }
          ],
          notes: 'Room cleaned thoroughly'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.room.currentStatus).toBe('vacant_clean');
      expect(response.body.data.log.timeTaken).toBe(30);
      expect(mockRooms['room-1'].save).toHaveBeenCalled();
    });

    it('should reject if room is not vacant_dirty', async () => {
      mockRooms['room-1'].currentStatus = 'occupied';
      
      const response = await request(app)
        .post('/api/internal/housekeeping/tasks/room-1/complete')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only vacant_dirty rooms');
      
      // Reset
      mockRooms['room-1'].currentStatus = 'vacant_dirty';
    });

    it('should validate checklist format', async () => {
      const response = await request(app)
        .post('/api/internal/housekeeping/tasks/room-1/complete')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({
          checklistCompleted: [
            { item: 'Bed made' } // Missing 'completed' field
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('completed boolean');
    });
  });

  describe('GET /api/internal/housekeeping/history/:roomId', () => {
    it('should return cleaning history for a room', async () => {
      // Add a log first
      await request(app)
        .post('/api/internal/housekeeping/tasks/room-1/complete')
        .set('Authorization', `Bearer ${housekeepingToken}`)
        .send({ timeTaken: 25 });

      const response = await request(app)
        .get('/api/internal/housekeeping/history/room-1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('cleanedAt');
      expect(response.body.data[0]).toHaveProperty('cleanedBy');
    });

    it('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .get('/api/internal/housekeeping/history/non-existent')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('Maintenance Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaintenanceRequests.length = 0;
  });

  describe('POST /api/internal/maintenance/requests', () => {
    it('should create a maintenance request', async () => {
      const response = await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'Leaking faucet',
          description: 'The bathroom faucet is leaking',
          priority: 'high',
          images: ['https://example.com/image1.jpg']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Leaking faucet');
      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.status).toBe('pending');
      expect(mockRooms['room-1'].save).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1'
          // Missing title and description
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should validate title length', async () => {
      const response = await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'AB', // Too short
          description: 'Test description'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('between 3 and 200');
    });
  });

  describe('GET /api/internal/maintenance/requests', () => {
    beforeEach(async () => {
      // Create some test requests
      await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'Urgent repair',
          description: 'Needs immediate attention',
          priority: 'urgent'
        });

      await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'Regular maintenance',
          description: 'Routine check',
          priority: 'low'
        });
    });

    it('should return all maintenance requests', async () => {
      const response = await request(app)
        .get('/api/internal/maintenance/requests?propertyId=owner-1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/internal/maintenance/requests?propertyId=owner-1&status=pending')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/internal/maintenance/requests?propertyId=owner-1&priority=urgent')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/internal/maintenance/requests/:id', () => {
    beforeEach(async () => {
      // Create a test request
      await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'Test request',
          description: 'Test description',
          priority: 'medium'
        });
    });

    it('should update maintenance request status', async () => {
      const response = await request(app)
        .put('/api/internal/maintenance/requests/maint-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'in_progress',
          workPerformed: 'Started working on the issue'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should require workPerformed when marking as completed', async () => {
      const response = await request(app)
        .put('/api/internal/maintenance/requests/maint-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'completed'
          // Missing workPerformed
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('workPerformed is required');
    });

    it('should update cost incurred', async () => {
      const response = await request(app)
        .put('/api/internal/maintenance/requests/maint-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          costIncurred: 150.50
        });

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.data.costIncurred)).toBe(150.50);
    });
  });

  describe('GET /api/internal/maintenance/requests/:roomId/history', () => {
    beforeEach(async () => {
      // Create a test request
      await request(app)
        .post('/api/internal/maintenance/requests')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          roomId: 'room-1',
          title: 'Historical request',
          description: 'Test description',
          priority: 'medium'
        });
    });

    it('should return maintenance history for a room', async () => {
      const response = await request(app)
        .get('/api/internal/maintenance/requests/room-1/history')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.room.roomNumber).toBe('101');
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .get('/api/internal/maintenance/requests/non-existent/history')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
    });
  });
});
