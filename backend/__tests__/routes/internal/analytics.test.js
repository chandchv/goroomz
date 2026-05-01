/**
 * Unit tests for Analytics Routes
 * 
 * Tests the analytics route module exports and basic structure
 */

const express = require('express');
const analyticsRoutes = require('../../../routes/internal/analytics');

describe('Analytics Routes', () => {
  describe('Module Export', () => {
    test('should export an Express router', () => {
      expect(analyticsRoutes).toBeDefined();
      expect(typeof analyticsRoutes).toBe('function');
      expect(analyticsRoutes.name).toBe('router');
    });

    test('should have route handlers registered', () => {
      const routes = [];
      analyticsRoutes.stack.forEach(layer => {
        if (layer.route) {
          const path = layer.route.path;
          const methods = Object.keys(layer.route.methods);
          routes.push({ path, methods });
        }
      });

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('Route Registration', () => {
    test('should register /internal/audit GET endpoint', () => {
      const routes = analyticsRoutes.stack
        .filter(layer => layer.route)
        .map(layer => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
        }));

      const auditRoute = routes.find(r => r.path === '/internal/audit');
      expect(auditRoute).toBeDefined();
      expect(auditRoute.methods).toContain('get');
    });

    test('should register /internal/analytics/platform GET endpoint', () => {
      const routes = analyticsRoutes.stack
        .filter(layer => layer.route)
        .map(layer => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
        }));

      const platformRoute = routes.find(r => r.path === '/internal/analytics/platform');
      expect(platformRoute).toBeDefined();
      expect(platformRoute.methods).toContain('get');
    });

    test('should register /internal/analytics/property-health GET endpoint', () => {
      const routes = analyticsRoutes.stack
        .filter(layer => layer.route)
        .map(layer => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
        }));

      const healthRoute = routes.find(r => r.path === '/internal/analytics/property-health');
      expect(healthRoute).toBeDefined();
      expect(healthRoute.methods).toContain('get');
    });
  });

  describe('Route Count', () => {
    test('should have exactly 3 routes registered', () => {
      const routes = analyticsRoutes.stack.filter(layer => layer.route);
      expect(routes.length).toBe(3);
    });
  });
});
