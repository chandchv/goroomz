/**
 * Property-Based Tests for Graceful Degradation
 * 
 * Tests that the unified search handles partial failures gracefully.
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { Property } = require('../../models');

// Mock Property model before requiring the router
jest.mock('../../models', () => ({
  Property: {
    findAll: jest.fn(),
    findOne: jest.fn()
  }
}));

// Mock Amadeus config and service
const mockAmadeusInstance = {
  searchHotelsByCity: jest.fn(),
  searchHotelsByGeocode: jest.fn(),
  getHotelDetails: jest.fn()
};

jest.mock('../../services/amadeus/config', () => ({
  getConfig: jest.fn(() => ({
    isEnabled: () => true,
    baseUrl: 'https://test.api.amadeus.com',
    apiKey: 'test_key',
    apiSecret: 'test_secret'
  }))
}));

jest.mock('../../services/amadeus/AmadeusService', () => {
  return jest.fn().mockImplementation(() => mockAmadeusInstance);
});

// Now require the router after mocks are set up
const searchRouter = require('../../routes/search');

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/search', searchRouter);
  return app;
}

describe('Feature: amadeus-hotel-integration, Property 21: Graceful Degradation', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  /**
   * Property 21: Graceful Degradation
   * For any search request where the Amadeus API is unavailable or returns an error,
   * the system should still return local property results successfully.
   * 
   * Validates: Requirements 6.5, 6.6
   */
  it('should return local results when Amadeus API fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        async (cityCode, localIds) => {
          // Create mock local properties
          const mockLocalProperties = localIds.map(id => ({
            id,
            name: `Local Property ${id}`,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }));

          // Setup mocks - local succeeds, Amadeus fails
          Property.findAll.mockResolvedValue(mockLocalProperties);
          mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
            new Error('Amadeus API unavailable')
          );

          // Make request with source='all'
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Should still succeed with local results
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);

          // Should have local results
          expect(response.body.meta.localCount).toBe(localIds.length);
          expect(response.body.meta.localCount).toBeGreaterThan(0);

          // Amadeus count should be 0
          expect(response.body.meta.amadeusCount).toBe(0);

          // Should have warning about Amadeus failure
          expect(response.body.warnings).toBeDefined();
          expect(response.body.warnings.amadeus).toBeDefined();

          // Total should equal local count
          expect(response.body.meta.total).toBe(localIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return Amadeus results when local database fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        fc.array(fc.string({ minLength: 8, maxLength: 8 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'A')), { minLength: 1, maxLength: 10 }),
        async (cityCode, amadeusIds) => {
          // Create mock Amadeus hotels
          const mockAmadeusHotels = amadeusIds.map(id => ({
            id: `amadeus_${id}`,
            title: `Amadeus Hotel ${id}`,
            source: 'amadeus',
            isExternal: true
          }));

          // Setup mocks - local fails, Amadeus succeeds
          Property.findAll.mockRejectedValue(new Error('Database connection failed'));
          mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

          // Make request with source='all'
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Should still succeed with Amadeus results
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);

          // Should have Amadeus results
          expect(response.body.meta.amadeusCount).toBe(amadeusIds.length);
          expect(response.body.meta.amadeusCount).toBeGreaterThan(0);

          // Local count should be 0
          expect(response.body.meta.localCount).toBe(0);

          // Should have warning about local failure
          expect(response.body.warnings).toBeDefined();
          expect(response.body.warnings.local).toBeDefined();

          // Total should equal Amadeus count
          expect(response.body.meta.total).toBe(amadeusIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail only when both sources fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        async (cityCode) => {
          // Setup mocks - both fail
          Property.findAll.mockRejectedValue(new Error('Database connection failed'));
          mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
            new Error('Amadeus API unavailable')
          );

          // Make request with source='all'
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Should fail with 500 error
          expect(response.status).toBe(500);
          expect(response.body.success).toBe(false);

          // Should have error message
          expect(response.body.message).toContain('All search sources failed');

          // Should have errors for both sources
          expect(response.body.errors).toBeDefined();
          expect(response.body.errors.local).toBeDefined();
          expect(response.body.errors.amadeus).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle partial results with warnings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (cityCode, localIds) => {
          // Create mock local properties
          const mockLocalProperties = localIds.map(id => ({
            id,
            name: `Local Property ${id}`,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }));

          // Setup mocks - local succeeds, Amadeus fails
          Property.findAll.mockResolvedValue(mockLocalProperties);
          mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
            new Error('Rate limit exceeded')
          );

          // Make request
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Should succeed
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);

          // Should have results
          expect(response.body.data).toBeDefined();
          expect(Array.isArray(response.body.data)).toBe(true);

          // Should have warnings
          expect(response.body.warnings).toBeDefined();
          expect(response.body.warnings.amadeus).toContain('Rate limit exceeded');

          // All returned results should have source metadata
          response.body.data.forEach(result => {
            expect(result.source).toBeDefined();
            expect(['local', 'amadeus']).toContain(result.source);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve data integrity when one source fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        async (cityCode, localIds) => {
          // Create mock local properties with specific IDs
          const mockLocalProperties = localIds.map(id => ({
            id,
            name: `Local Property ${id}`,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }));

          // Setup mocks
          Property.findAll.mockResolvedValue(mockLocalProperties);
          mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
            new Error('Network timeout')
          );

          // Make request
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Verify all local properties are present
          const returnedIds = response.body.data.map(p => p.id);
          localIds.forEach(id => {
            expect(returnedIds).toContain(id);
          });

          // Verify no data corruption
          response.body.data.forEach(result => {
            expect(result.id).toBeDefined();
            expect(result.name).toBeDefined();
            expect(result.source).toBe('local');
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
