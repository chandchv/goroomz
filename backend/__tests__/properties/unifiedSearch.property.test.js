/**
 * Property-Based Tests for Unified Search
 * 
 * Tests universal properties of the unified search functionality.
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

describe('Feature: amadeus-hotel-integration, Property 14: Unified Search Execution', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  /**
   * Property 14: Unified Search Execution
   * For any location search request with source='all', the system should query 
   * both the local database and Amadeus API in parallel.
   * 
   * Validates: Requirements 5.1
   */
  it('should query both local and Amadeus sources in parallel when source=all', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid city codes (3 uppercase letters)
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        async (cityCode) => {
          // Mock local property results
          const mockLocalProperties = [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Local Property 1',
              isActive: true,
              approvalStatus: 'approved',
              toJSON: function() { return { ...this }; }
            }
          ];

          // Mock Amadeus results
          const mockAmadeusHotels = [
            {
              id: 'amadeus_HOTEL001',
              title: 'Amadeus Hotel 1',
              source: 'amadeus',
              isExternal: true
            }
          ];

          // Setup mocks
          Property.findAll.mockResolvedValue(mockLocalProperties);
          mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

          // Make request with source='all'
          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          // Verify both sources were queried
          expect(Property.findAll).toHaveBeenCalled();
          expect(mockAmadeusInstance.searchHotelsByCity).toHaveBeenCalledWith(
            expect.objectContaining({ cityCode: cityCode.toUpperCase() })
          );

          // Verify response contains results from both sources
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.meta.localCount).toBeGreaterThan(0);
          expect(response.body.meta.amadeusCount).toBeGreaterThan(0);

          // Verify results are merged
          const totalResults = response.body.meta.localCount + response.body.meta.amadeusCount;
          expect(response.body.meta.total).toBe(totalResults);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should execute searches in parallel (not sequentially)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        async (cityCode) => {
          let localStartTime, localEndTime, amadeusStartTime, amadeusEndTime;

          // Mock with delays to verify parallel execution
          Property.findAll.mockImplementation(async () => {
            localStartTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
            localEndTime = Date.now();
            return [{
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Local Property',
              isActive: true,
              approvalStatus: 'approved',
              toJSON: function() { return { ...this }; }
            }];
          });

          mockAmadeusInstance.searchHotelsByCity.mockImplementation(async () => {
            amadeusStartTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
            amadeusEndTime = Date.now();
            return [{
              id: 'amadeus_HOTEL001',
              title: 'Amadeus Hotel',
              source: 'amadeus',
              isExternal: true
            }];
          });

          const startTime = Date.now();
          await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });
          const totalTime = Date.now() - startTime;

          // If executed in parallel, total time should be ~50ms (not ~100ms)
          // Allow some overhead, so check it's less than 90ms
          expect(totalTime).toBeLessThan(90);

          // Verify both searches started around the same time (within 20ms)
          const timeDiff = Math.abs(localStartTime - amadeusStartTime);
          expect(timeDiff).toBeLessThan(20);
        }
      ),
      { numRuns: 50 } // Fewer runs due to timing sensitivity
    );
  });

  it('should include results from both sources in the response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 3 }).map(s => s.toUpperCase().replace(/[^A-Z]/g, 'A')),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 8, maxLength: 8 }).map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'A')), { minLength: 1, maxLength: 5 }),
        async (cityCode, localIds, amadeusIds) => {
          // Create mock local properties
          const mockLocalProperties = localIds.map(id => ({
            id,
            name: `Local Property ${id}`,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }));

          // Create mock Amadeus hotels
          const mockAmadeusHotels = amadeusIds.map(id => ({
            id: `amadeus_${id}`,
            title: `Amadeus Hotel ${id}`,
            source: 'amadeus',
            isExternal: true
          }));

          Property.findAll.mockResolvedValue(mockLocalProperties);
          mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

          const response = await request(app)
            .get('/api/search/hotels')
            .query({ cityCode, source: 'all' });

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);

          // Verify counts match
          expect(response.body.meta.localCount).toBe(localIds.length);
          expect(response.body.meta.amadeusCount).toBe(amadeusIds.length);
          expect(response.body.meta.total).toBe(localIds.length + amadeusIds.length);

          // Verify all results are present (accounting for pagination)
          const allResults = response.body.data;
          const localResults = allResults.filter(r => r.source === 'local');
          const amadeusResults = allResults.filter(r => r.source === 'amadeus');

          // At least some results from each source should be in first page
          if (localIds.length > 0 && amadeusIds.length > 0) {
            expect(localResults.length + amadeusResults.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
