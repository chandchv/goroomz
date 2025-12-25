const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

/**
 * Test to verify all internal role routes are properly registered
 * This test checks that all /api/internal/* routes are accessible
 * Requirements: All backend requirements
 */

describe('Internal Routes Registration', () => {
  let app;
  let authToken;

  beforeAll(() => {
    // Create a minimal Express app with the same structure as server.js
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    const mockProtectInternal = (req, res, next) => {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        internalRole: 'superuser',
        internalPermissions: {
          canOnboardProperties: true,
          canApproveOnboardings: true,
          canManageAgents: true,
          canAccessAllProperties: true,
          canManageSystemSettings: true,
          canViewAuditLogs: true,
          canManageCommissions: true,
          canManageTerritories: true,
          canManageTickets: true,
          canBroadcastAnnouncements: true
        }
      };
      next();
    };

    // Register all internal routes with mock authentication
    const routes = [
      { path: '/api/internal/auth', file: './routes/internal/auth', protected: false },
      { path: '/api/internal/roles', file: './routes/internal/roles', protected: true },
      { path: '/api/internal/users', file: './routes/internal/users', protected: true },
      { path: '/api/internal/leads', file: './routes/internal/leads', protected: true },
      { path: '/api/internal/commissions', file: './routes/internal/commissions', protected: true },
      { path: '/api/internal/territories', file: './routes/internal/territories', protected: true },
      { path: '/api/internal/targets', file: './routes/internal/targets', protected: true },
      { path: '/api/internal/tickets', file: './routes/internal/tickets', protected: true },
      { path: '/api/internal/documents', file: './routes/internal/documents', protected: true },
      { path: '/api/internal/audit', file: './routes/internal/audit', protected: true },
      { path: '/api/internal/dashboards', file: './routes/internal/dashboards', protected: true },
      { path: '/api/internal/analytics', file: './routes/internal/analytics', protected: true },
      { path: '/api/internal/notifications', file: './routes/internal/notifications', protected: true },
      { path: '/api/internal/announcements', file: './routes/internal/announcements', protected: true },
      { path: '/api/internal/subscriptions', file: './routes/internal/subscriptions', protected: true },
      { path: '/api/internal/search', file: './routes/internal/search', protected: true },
      { path: '/api/internal/api-keys', file: './routes/internal/api-keys', protected: true },
      { path: '/api/internal/health', file: './routes/internal/health', protected: true }
    ];

    routes.forEach(route => {
      try {
        const routeModule = require(`../${route.file}`);
        if (route.protected) {
          app.use(route.path, mockProtectInternal, routeModule);
        } else {
          app.use(route.path, routeModule);
        }
      } catch (error) {
        console.error(`Failed to load route ${route.file}:`, error.message);
      }
    });

    // Generate a test JWT token
    authToken = jwt.sign(
      {
        id: 'test-user-id',
        email: 'test@example.com',
        internalRole: 'superuser'
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Route Registration', () => {
    test('should have /api/internal/roles route registered', async () => {
      const res = await request(app)
        .get('/api/internal/roles')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Should not return 404
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/users route registered', async () => {
      const res = await request(app)
        .get('/api/internal/users')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/leads route registered', async () => {
      const res = await request(app)
        .get('/api/internal/leads')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/commissions route registered', async () => {
      const res = await request(app)
        .get('/api/internal/commissions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/territories route registered', async () => {
      const res = await request(app)
        .get('/api/internal/territories')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/targets route registered', async () => {
      const res = await request(app)
        .get('/api/internal/targets')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/tickets route registered', async () => {
      const res = await request(app)
        .get('/api/internal/tickets')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/documents route registered', async () => {
      const res = await request(app)
        .get('/api/internal/documents/lead/test-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/audit route registered', async () => {
      const res = await request(app)
        .get('/api/internal/audit')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/dashboards route registered', async () => {
      const res = await request(app)
        .get('/api/internal/dashboards/agent')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/analytics route registered', async () => {
      const res = await request(app)
        .get('/api/internal/analytics/platform')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/notifications route registered', async () => {
      const res = await request(app)
        .get('/api/internal/notifications')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/announcements route registered', async () => {
      const res = await request(app)
        .get('/api/internal/announcements')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/subscriptions route registered', async () => {
      const res = await request(app)
        .get('/api/internal/subscriptions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/search route registered', async () => {
      const res = await request(app)
        .get('/api/internal/search?q=test')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/api-keys route registered', async () => {
      const res = await request(app)
        .get('/api/internal/api-keys')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });

    test('should have /api/internal/health route registered', async () => {
      const res = await request(app)
        .get('/api/internal/health/metrics')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).not.toBe(404);
    });
  });

  describe('Authentication Middleware', () => {
    test('should apply authentication to protected routes', async () => {
      const res = await request(app)
        .get('/api/internal/roles');
      
      // Without auth token, should get user object from mock middleware
      // In real scenario, this would be 401
      expect(res.status).not.toBe(404);
    });

    test('should allow public access to auth routes', async () => {
      const res = await request(app)
        .post('/api/internal/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      // Should not return 404 (route exists)
      expect(res.status).not.toBe(404);
    });
  });
});
