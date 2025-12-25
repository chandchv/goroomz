const request = require('supertest');
const express = require('express');
const { sequelize, User, Lead, Commission, Territory, AgentTarget } = require('../models');
const analyticsRoutes = require('../routes/internal/analytics');
const { protectInternal } = require('../middleware/internalAuth');

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware for testing
app.use('/api/internal/analytics', (req, res, next) => {
  // Mock user for testing
  req.user = {
    id: 'test-user-id',
    internalRole: 'superuser',
    name: 'Test User',
    email: 'test@example.com'
  };
  next();
}, analyticsRoutes);

describe('Analytics Routes', () => {
  beforeAll(async () => {
    // Initialize test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/internal/analytics/platform', () => {
    it('should return platform analytics for authorized users', async () => {
      const response = await request(app)
        .get('/api/internal/analytics/platform')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userStatistics');
      expect(response.body.data).toHaveProperty('onboardingStatistics');
      expect(response.body.data).toHaveProperty('financialStatistics');
      expect(response.body.data).toHaveProperty('capacityStatistics');
      expect(response.body.data).toHaveProperty('bookingStatistics');
      expect(response.body.data).toHaveProperty('supportStatistics');
      expect(response.body.data).toHaveProperty('regionalPerformance');
      expect(response.body.data).toHaveProperty('platformTrends');
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      
      const response = await request(app)
        .get(`/api/internal/analytics/platform?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.startDate).toBe(startDate);
      expect(response.body.data.period.endDate).toBe(endDate);
    });
  });

  describe('GET /api/internal/analytics/export', () => {
    it('should handle export requests', async () => {
      const response = await request(app)
        .post('/api/internal/analytics/export')
        .send({
          reportType: 'platform',
          format: 'json'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'platform');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('generatedAt');
    });

    it('should validate report type', async () => {
      const response = await request(app)
        .post('/api/internal/analytics/export')
        .send({
          reportType: 'invalid',
          format: 'json'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid report type');
    });

    it('should validate format', async () => {
      const response = await request(app)
        .post('/api/internal/analytics/export')
        .send({
          reportType: 'platform',
          format: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid format');
    });
  });
});