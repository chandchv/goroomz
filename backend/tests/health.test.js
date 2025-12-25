const request = require('supertest');
const express = require('express');
const healthRoutes = require('../routes/internal/health');
const { protectInternal, authorizeInternalRoles } = require('../middleware/internalAuth');

// Mock the middleware
jest.mock('../middleware/internalAuth', () => ({
  protectInternal: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      internalRole: 'operations_manager',
      isActive: true
    };
    next();
  },
  authorizeInternalRoles: (roles) => (req, res, next) => {
    if (roles.includes(req.user.internalRole)) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Unauthorized' });
    }
  }
}));

// Mock the models
jest.mock('../models', () => {
  const mockSequelize = {
    query: jest.fn().mockResolvedValue([
      { database_size: 1000000, database_size_pretty: '1 MB' }
    ]),
    authenticate: jest.fn().mockResolvedValue(true),
    QueryTypes: { SELECT: 'SELECT' },
    fn: jest.fn((fn, col) => `${fn}(${col})`),
    col: jest.fn((col) => col),
    literal: jest.fn((literal) => literal),
    connectionManager: {
      pool: {
        size: 10,
        used: 2,
        available: 8,
        pending: 0
      }
    }
  };

  return {
    User: {
      count: jest.fn().mockResolvedValue(10),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null)
    },
    Room: {
      count: jest.fn().mockResolvedValue(100),
      findAll: jest.fn().mockResolvedValue([
        {
          totalRooms: 100,
          occupiedRooms: 75,
          availableRooms: 20,
          maintenanceRooms: 3,
          reservedRooms: 2
        }
      ])
    },
    Booking: {
      count: jest.fn().mockResolvedValue(50),
      findAll: jest.fn().mockResolvedValue([
        {
          totalBookings: 50,
          confirmedBookings: 45,
          checkedInBookings: 30,
          pendingBookings: 5
        }
      ])
    },
    Payment: {
      count: jest.fn().mockResolvedValue(40),
      findOne: jest.fn().mockResolvedValue({ totalRevenue: 10000 })
    },
    Lead: {
      count: jest.fn().mockResolvedValue(20),
      findAll: jest.fn().mockResolvedValue([
        {
          totalLeads: 20,
          contactedLeads: 5,
          inProgressLeads: 10,
          pendingApprovalLeads: 5
        }
      ])
    },
    Commission: {
      findOne: jest.fn().mockResolvedValue({ totalCommissions: 1000 })
    },
    SupportTicket: {
      count: jest.fn().mockResolvedValue(5),
      findAll: jest.fn().mockResolvedValue([])
    },
    MaintenanceRequest: {
      count: jest.fn().mockResolvedValue(3)
    },
    HousekeepingLog: {
      count: jest.fn().mockResolvedValue(15)
    },
    sequelize: mockSequelize
  };
});

// Mock the database config
jest.mock('../config/database', () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([
      { database_size: 1000000, database_size_pretty: '1 MB' }
    ]),
    authenticate: jest.fn().mockResolvedValue(true),
    QueryTypes: { SELECT: 'SELECT' },
    fn: jest.fn((fn, col) => `${fn}(${col})`),
    col: jest.fn((col) => col),
    literal: jest.fn((literal) => literal),
    connectionManager: {
      pool: {
        size: 10,
        used: 2,
        available: 8,
        pending: 0
      }
    }
  }
}));

describe('Platform Health Monitoring Endpoints', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/internal/health', healthRoutes);
  });

  describe('GET /api/internal/health/metrics', () => {
    it('should return platform health metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallStatus');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('criticalIssues');
      expect(response.body.data.metrics).toHaveProperty('apiResponseTime');
      expect(response.body.data.metrics).toHaveProperty('errorRate');
      expect(response.body.data.metrics).toHaveProperty('systemUptime');
      expect(response.body.data.metrics).toHaveProperty('databaseStatus');
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .get('/api/internal/health/metrics')
        .expect(200);

      expect(response.body.data).toHaveProperty('timestamp');
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('GET /api/internal/health/capacity', () => {
    it('should return capacity metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/capacity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('capacityStatus');
      expect(response.body.data).toHaveProperty('propertyCapacity');
      expect(response.body.data).toHaveProperty('bookingCapacity');
      expect(response.body.data).toHaveProperty('userCapacity');
      expect(response.body.data).toHaveProperty('leadPipelineCapacity');
    });

    it('should calculate occupancy rate correctly', async () => {
      const response = await request(app)
        .get('/api/internal/health/capacity')
        .expect(200);

      expect(response.body.data.propertyCapacity).toHaveProperty('occupancyRate');
      expect(typeof response.body.data.propertyCapacity.occupancyRate).toBe('number');
    });
  });

  describe('GET /api/internal/health/activity', () => {
    it('should return user activity metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('concurrentSessions');
      expect(response.body.data).toHaveProperty('peakUsageTimes');
      expect(response.body.data).toHaveProperty('activityByType');
      expect(response.body.data).toHaveProperty('activityTrend');
    });

    it('should include activity breakdown by type', async () => {
      const response = await request(app)
        .get('/api/internal/health/activity')
        .expect(200);

      expect(response.body.data.activityByType).toHaveProperty('last24Hours');
      expect(response.body.data.activityByType.last24Hours).toHaveProperty('bookings');
      expect(response.body.data.activityByType.last24Hours).toHaveProperty('payments');
      expect(response.body.data.activityByType.last24Hours).toHaveProperty('leads');
    });
  });

  describe('GET /api/internal/health/infrastructure', () => {
    it('should return infrastructure metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/infrastructure')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('infrastructureStatus');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('process');
      expect(response.body.data).toHaveProperty('storage');
      expect(response.body.data).toHaveProperty('backup');
    });

    it('should include database metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/infrastructure')
        .expect(200);

      expect(response.body.data.database).toHaveProperty('size');
      expect(response.body.data.database).toHaveProperty('sizePretty');
      expect(response.body.data.database).toHaveProperty('connectionPool');
      expect(response.body.data.database).toHaveProperty('status');
    });

    it('should include system resource metrics', async () => {
      const response = await request(app)
        .get('/api/internal/health/infrastructure')
        .expect(200);

      expect(response.body.data.system).toHaveProperty('memory');
      expect(response.body.data.system).toHaveProperty('cpu');
      expect(response.body.data.system).toHaveProperty('uptime');
      expect(response.body.data.system.memory).toHaveProperty('usagePercent');
    });
  });
});
