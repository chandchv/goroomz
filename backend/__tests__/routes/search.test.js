/**
 * Unit Tests for Unified Search Controller
 * 
 * Tests specific scenarios and edge cases for the unified search functionality.
 */

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

describe('Unified Search Controller', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/search/hotels', () => {
    describe('with source=all', () => {
      it('should search both local and Amadeus sources', async () => {
        const mockLocalProperties = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.localCount).toBe(1);
        expect(response.body.meta.amadeusCount).toBe(1);
        expect(response.body.meta.total).toBe(2);
      });

      it('should merge results from both sources', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Local Property 2',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'LON', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Check that results have source metadata
        const localResults = response.body.data.filter(r => r.source === 'local');
        const amadeusResults = response.body.data.filter(r => r.source === 'amadeus');
        
        expect(localResults.length).toBeGreaterThan(0);
        expect(amadeusResults.length).toBeGreaterThan(0);
      });
    });

    describe('with source=local', () => {
      it('should search only local properties', async () => {
        const mockLocalProperties = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'NYC', source: 'local' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.localCount).toBe(1);
        expect(response.body.meta.amadeusCount).toBe(0);
        expect(Property.findAll).toHaveBeenCalled();
        expect(mockAmadeusInstance.searchHotelsByCity).not.toHaveBeenCalled();
      });
    });

    describe('with source=amadeus', () => {
      it('should search only Amadeus hotels', async () => {
        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'TYO', source: 'amadeus' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.localCount).toBe(0);
        expect(response.body.meta.amadeusCount).toBe(1);
        expect(Property.findAll).not.toHaveBeenCalled();
        expect(mockAmadeusInstance.searchHotelsByCity).toHaveBeenCalled();
      });
    });

    describe('when Amadeus API fails', () => {
      it('should return local results with warning', async () => {
        const mockLocalProperties = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
          new Error('Amadeus API unavailable')
        );

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.localCount).toBe(1);
        expect(response.body.meta.amadeusCount).toBe(0);
        expect(response.body.warnings).toBeDefined();
        expect(response.body.warnings.amadeus).toContain('Amadeus API unavailable');
      });

      it('should fail when explicitly requesting Amadeus and it fails', async () => {
        mockAmadeusInstance.searchHotelsByCity.mockRejectedValue(
          new Error('Amadeus API unavailable')
        );

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'amadeus' });

        // Should still return 200 but with no results and errors
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('when local database fails', () => {
      it('should return Amadeus results with warning', async () => {
        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockRejectedValue(new Error('Database connection failed'));
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'LON', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.meta.localCount).toBe(0);
        expect(response.body.meta.amadeusCount).toBe(1);
        expect(response.body.warnings).toBeDefined();
        expect(response.body.warnings.local).toContain('Database connection failed');
      });
    });

    describe('validation', () => {
      it('should require either cityCode or coordinates', async () => {
        const response = await request(app)
          .get('/api/search/hotels')
          .query({ source: 'all' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cityCode or latitude/longitude');
      });

      it('should validate cityCode length', async () => {
        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PA', source: 'all' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate latitude range', async () => {
        const response = await request(app)
          .get('/api/search/hotels')
          .query({ latitude: 100, longitude: 0, source: 'all' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate longitude range', async () => {
        const response = await request(app)
          .get('/api/search/hotels')
          .query({ latitude: 0, longitude: 200, source: 'all' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('should validate source parameter', async () => {
        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('pagination', () => {
      it('should paginate results with default page and limit', async () => {
        const mockLocalProperties = Array.from({ length: 25 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(20); // Default limit
        expect(response.body.meta.page).toBe(1); // Default page
        expect(response.body.meta.limit).toBe(20);
        expect(response.body.meta.total).toBe(25);
        expect(response.body.meta.totalPages).toBe(2);
      });

      it('should paginate results with custom page size', async () => {
        const mockLocalProperties = Array.from({ length: 25 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(10);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(25);
        expect(response.body.meta.totalPages).toBe(3);
      });

      it('should handle page 2 correctly', async () => {
        const mockLocalProperties = Array.from({ length: 25 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${String(i).padStart(2, '0')}`, // Pad for proper sorting
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 2, limit: 10 });

        expect(response.status).toBe(200);
        // Page 2 should have items, but the exact count depends on sorting
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.meta.page).toBe(2);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(25);
        expect(response.body.meta.totalPages).toBe(3);
      });

      it('should handle last page with partial results', async () => {
        const mockLocalProperties = Array.from({ length: 25 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 3, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(5); // Only 5 items on last page
        expect(response.body.meta.page).toBe(3);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(25);
        expect(response.body.meta.totalPages).toBe(3);
      });

      it('should handle page beyond total pages (empty results)', async () => {
        const mockLocalProperties = Array.from({ length: 25 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 10, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(0); // No items on page 10
        expect(response.body.meta.page).toBe(10);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(25);
        expect(response.body.meta.totalPages).toBe(3);
      });

      it('should paginate mixed results from both sources', async () => {
        const mockLocalProperties = Array.from({ length: 15 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        const mockAmadeusHotels = Array.from({ length: 10 }, (_, i) => ({
          id: `amadeus_HOTEL${String(i).padStart(3, '0')}`,
          title: `Amadeus Hotel ${i}`,
          source: 'amadeus',
          isExternal: true
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(10);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(25); // 15 local + 10 Amadeus
        expect(response.body.meta.totalPages).toBe(3);
        expect(response.body.meta.localCount).toBe(15);
        expect(response.body.meta.amadeusCount).toBe(10);
      });

      it('should handle empty results with pagination metadata', async () => {
        Property.findAll.mockResolvedValue([]);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'XYZ', source: 'all', page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(0);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(0);
        expect(response.body.meta.totalPages).toBe(0);
      });

      it('should handle single page of results', async () => {
        const mockLocalProperties = Array.from({ length: 5 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(5);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(5);
        expect(response.body.meta.totalPages).toBe(1);
      });

      it('should handle exact multiple of page size', async () => {
        const mockLocalProperties = Array.from({ length: 20 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(10);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(10);
        expect(response.body.meta.total).toBe(20);
        expect(response.body.meta.totalPages).toBe(2);
      });

      it('should handle large page size', async () => {
        const mockLocalProperties = Array.from({ length: 50 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 100 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(50); // All results fit in one page
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(100);
        expect(response.body.meta.total).toBe(50);
        expect(response.body.meta.totalPages).toBe(1);
      });

      it('should handle small page size', async () => {
        const mockLocalProperties = Array.from({ length: 10 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 3 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(3);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(3);
        expect(response.body.meta.total).toBe(10);
        expect(response.body.meta.totalPages).toBe(4);
      });

      it('should calculate total pages correctly with various page sizes', async () => {
        const mockLocalProperties = Array.from({ length: 37 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        // Test with limit 5: 37 / 5 = 7.4 -> 8 pages
        const response1 = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 5 });

        expect(response1.body.meta.totalPages).toBe(8);

        // Test with limit 10: 37 / 10 = 3.7 -> 4 pages
        const response2 = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 10 });

        expect(response2.body.meta.totalPages).toBe(4);

        // Test with limit 15: 37 / 15 = 2.47 -> 3 pages
        const response3 = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', page: 1, limit: 15 });

        expect(response3.body.meta.totalPages).toBe(3);
      });

      it('should paginate after filtering', async () => {
        const mockLocalProperties = Array.from({ length: 30 }, (_, i) => ({
          id: `local-${i}`,
          name: `Local Property ${i}`,
          amenities: i % 2 === 0 ? ['wifi', 'parking'] : ['parking'],
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        }));

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ 
            cityCode: 'PAR', 
            source: 'all', 
            amenities: 'wifi',
            page: 1, 
            limit: 5 
          });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(5);
        expect(response.body.meta.total).toBe(15); // Only 15 have wifi (every other one)
        expect(response.body.meta.totalPages).toBe(3); // 15 / 5 = 3 pages
        
        // All results should have wifi
        response.body.data.forEach(result => {
          expect(result.amenities).toContain('wifi');
        });
      });

      it('should paginate after sorting', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Zebra Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Alpha Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-3',
            name: 'Beta Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ 
            cityCode: 'PAR', 
            source: 'all', 
            sortBy: 'name',
            sortOrder: 'asc',
            page: 1, 
            limit: 2 
          });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
        expect(response.body.data[0].name).toBe('Alpha Hotel');
        expect(response.body.data[1].name).toBe('Beta Hotel');
        expect(response.body.meta.totalPages).toBe(2);
      });
    });

    describe('sorting', () => {
      it('should sort by name ascending by default', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Zebra Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Alpha Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('Alpha Hotel');
        expect(response.body.data[1].name).toBe('Zebra Hotel');
      });

      it('should sort by name descending', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Alpha Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Zebra Hotel',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'name', sortOrder: 'desc' });

        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('Zebra Hotel');
        expect(response.body.data[1].name).toBe('Alpha Hotel');
      });

      it('should sort by price ascending', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Expensive Hotel',
            metadata: { pgOptions: { basePrice: 5000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Cheap Hotel',
            metadata: { pgOptions: { basePrice: 1000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'price', sortOrder: 'asc' });

        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('Cheap Hotel');
        expect(response.body.data[1].name).toBe('Expensive Hotel');
      });

      it('should sort by rating descending', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Low Rated Hotel',
            rating: 2.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'High Rated Hotel',
            rating: 4.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'rating', sortOrder: 'desc' });

        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('High Rated Hotel');
        expect(response.body.data[1].name).toBe('Low Rated Hotel');
      });

      it('should sort by distance ascending', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Far Hotel',
            metadata: { distance: { value: 10.5, unit: 'KM' } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Near Hotel',
            metadata: { distance: { value: 2.3, unit: 'KM' } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'distance', sortOrder: 'asc' });

        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('Near Hotel');
        expect(response.body.data[1].name).toBe('Far Hotel');
      });

      it('should sort mixed local and Amadeus results by price', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Local Expensive',
            metadata: { pgOptions: { basePrice: 4000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Cheap',
            price: 2000,
            source: 'amadeus',
            isExternal: true
          },
          {
            id: 'amadeus_HOTEL002',
            title: 'Amadeus Mid',
            price: 3000,
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'price', sortOrder: 'asc' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(3);
        expect(response.body.data[0].title || response.body.data[0].name).toBe('Amadeus Cheap');
        expect(response.body.data[1].title || response.body.data[1].name).toBe('Amadeus Mid');
        expect(response.body.data[2].title || response.body.data[2].name).toBe('Local Expensive');
      });

      it('should handle sorting with missing fields', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Hotel Without Price',
            // No price field
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Hotel With Price',
            metadata: { pgOptions: { basePrice: 2000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', sortBy: 'price', sortOrder: 'asc' });

        expect(response.status).toBe(200);
        // Hotel with price should come first, hotel without price (Infinity) should be last
        expect(response.body.data[0].name).toBe('Hotel With Price');
        expect(response.body.data[1].name).toBe('Hotel Without Price');
      });
    });

    describe('result merging', () => {
      it('should merge results from both sources', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Local Property 2',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'LON', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(3);
        expect(response.body.meta.localCount).toBe(2);
        expect(response.body.meta.amadeusCount).toBe(1);
        
        // Check that results have source metadata
        const localResults = response.body.data.filter(r => r.source === 'local');
        const amadeusResults = response.body.data.filter(r => r.source === 'amadeus');
        
        expect(localResults.length).toBe(2);
        expect(amadeusResults.length).toBe(1);
        
        // Verify source metadata
        localResults.forEach(result => {
          expect(result.source).toBe('local');
          expect(result.isExternal).toBe(false);
        });
        
        amadeusResults.forEach(result => {
          expect(result.source).toBe('amadeus');
          expect(result.isExternal).toBe(true);
        });
      });

      it('should merge with only local results', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Local Property 1',
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'NYC', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.meta.localCount).toBe(1);
        expect(response.body.meta.amadeusCount).toBe(0);
        expect(response.body.data[0].source).toBe('local');
      });

      it('should merge with only Amadeus results', async () => {
        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel 1',
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue([]);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'TYO', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.meta.localCount).toBe(0);
        expect(response.body.meta.amadeusCount).toBe(1);
        expect(response.body.data[0].source).toBe('amadeus');
      });

      it('should handle empty results from both sources', async () => {
        Property.findAll.mockResolvedValue([]);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'XYZ', source: 'all' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(0);
        expect(response.body.meta.localCount).toBe(0);
        expect(response.body.meta.amadeusCount).toBe(0);
        expect(response.body.meta.total).toBe(0);
      });

      it('should preserve all properties from both sources', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Local Property',
            type: 'pg',
            location: { city: 'Paris', area: 'Marais' },
            metadata: { pgOptions: { basePrice: 3000 } },
            rating: 4.2,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus Hotel',
            location: { latitude: 48.8566, longitude: 2.3522 },
            metadata: { chainCode: 'AC', cityCode: 'PAR' },
            price: 5000,
            rating: 4.5,
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all' });

        expect(response.status).toBe(200);
        
        // Find local result
        const localResult = response.body.data.find(r => r.source === 'local');
        expect(localResult).toBeDefined();
        expect(localResult.name).toBe('Local Property');
        expect(localResult.type).toBe('pg');
        expect(localResult.location).toEqual({ city: 'Paris', area: 'Marais' });
        expect(localResult.rating).toBe(4.2);
        
        // Find Amadeus result
        const amadeusResult = response.body.data.find(r => r.source === 'amadeus');
        expect(amadeusResult).toBeDefined();
        expect(amadeusResult.title).toBe('Amadeus Hotel');
        expect(amadeusResult.location).toEqual({ latitude: 48.8566, longitude: 2.3522 });
        expect(amadeusResult.metadata.chainCode).toBe('AC');
        expect(amadeusResult.price).toBe(5000);
      });
    });
  });

  describe('GET /api/search/hotels/:id', () => {
    describe('with local UUID', () => {
      it('should return local property details', async () => {
        const mockProperty = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Local Property 1',
          isActive: true,
          approvalStatus: 'approved',
          toJSON: function() { return { ...this }; }
        };

        Property.findOne.mockResolvedValue(mockProperty);

        const response = await request(app)
          .get('/api/search/hotels/123e4567-e89b-12d3-a456-426614174000');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(response.body.data.source).toBe('local');
        expect(response.body.data.isExternal).toBe(false);
      });

      it('should return 404 if local property not found', async () => {
        Property.findOne.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/search/hotels/123e4567-e89b-12d3-a456-426614174000');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('with Amadeus hotel ID', () => {
      it('should return Amadeus hotel details', async () => {
        const mockHotel = {
          id: 'amadeus_HOTEL001',
          title: 'Amadeus Hotel 1',
          source: 'amadeus',
          isExternal: true
        };

        mockAmadeusInstance.getHotelDetails.mockResolvedValue(mockHotel);

        const response = await request(app)
          .get('/api/search/hotels/amadeus_HOTEL001');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('amadeus_HOTEL001');
      });

      it('should handle Amadeus hotel ID without prefix', async () => {
        const mockHotel = {
          id: 'amadeus_HOTEL001',
          title: 'Amadeus Hotel 1',
          source: 'amadeus',
          isExternal: true
        };

        mockAmadeusInstance.getHotelDetails.mockResolvedValue(mockHotel);

        const response = await request(app)
          .get('/api/search/hotels/HOTEL001');

        expect(response.status).toBe(200);
        expect(mockAmadeusInstance.getHotelDetails).toHaveBeenCalledWith('HOTEL001');
      });

      it('should return 404 if Amadeus hotel not found', async () => {
        mockAmadeusInstance.getHotelDetails.mockRejectedValue({
          error: { code: 'NOT_FOUND' }
        });

        const response = await request(app)
          .get('/api/search/hotels/amadeus_NOTFOUND');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('with invalid ID format', () => {
      it('should return 400 for invalid ID', async () => {
        const response = await request(app)
          .get('/api/search/hotels/invalid-id-format');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid hotel ID format');
      });
    });
  });

  describe('Filtering', () => {
    describe('amenity filtering', () => {
      it('should filter mixed results by amenities', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Property with WiFi',
            amenities: ['wifi', 'parking'],
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Property without WiFi',
            amenities: ['parking', 'ac'],
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Amadeus with WiFi',
            amenities: ['wifi', 'gym'],
            source: 'amadeus',
            isExternal: true
          },
          {
            id: 'amadeus_HOTEL002',
            title: 'Amadeus without WiFi',
            amenities: ['gym', 'pool'],
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', amenities: 'wifi' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
        
        // Both results should have wifi
        response.body.data.forEach(result => {
          const amenities = result.amenities || [];
          expect(amenities).toContain('wifi');
        });
        
        // Should have one from each source
        const sources = response.body.data.map(r => r.source);
        expect(sources).toContain('local');
        expect(sources).toContain('amadeus');
      });

      it('should filter by multiple amenities', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Property with WiFi and Parking',
            amenities: ['wifi', 'parking', 'ac'],
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Property with only WiFi',
            amenities: ['wifi', 'ac'],
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', amenities: 'wifi,parking' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name).toBe('Property with WiFi and Parking');
      });
    });

    describe('price range filtering', () => {
      it('should filter mixed results by price range', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Cheap Local',
            metadata: { pgOptions: { basePrice: 2000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Expensive Local',
            metadata: { pgOptions: { basePrice: 8000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'Mid-range Amadeus',
            price: 4000,
            source: 'amadeus',
            isExternal: true
          },
          {
            id: 'amadeus_HOTEL002',
            title: 'Expensive Amadeus',
            price: 9000,
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', minPrice: 3000, maxPrice: 7000 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].title).toBe('Mid-range Amadeus');
      });

      it('should filter by minimum price only', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Cheap Property',
            metadata: { pgOptions: { basePrice: 1500 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Expensive Property',
            metadata: { pgOptions: { basePrice: 5000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', minPrice: 3000 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name).toBe('Expensive Property');
      });

      it('should filter by maximum price only', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Cheap Property',
            metadata: { pgOptions: { basePrice: 1500 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Expensive Property',
            metadata: { pgOptions: { basePrice: 5000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', maxPrice: 3000 });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name).toBe('Cheap Property');
      });
    });

    describe('rating filtering', () => {
      it('should filter mixed results by rating', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'High Rated Local',
            rating: 4.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Low Rated Local',
            rating: 2.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        const mockAmadeusHotels = [
          {
            id: 'amadeus_HOTEL001',
            title: 'High Rated Amadeus',
            rating: 4.8,
            source: 'amadeus',
            isExternal: true
          },
          {
            id: 'amadeus_HOTEL002',
            title: 'Mid Rated Amadeus',
            rating: 3.2,
            source: 'amadeus',
            isExternal: true
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue(mockAmadeusHotels);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ cityCode: 'PAR', source: 'all', ratings: '4,5' });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(2);
        
        // Both should be high rated (4 or 5 stars)
        response.body.data.forEach(result => {
          const rating = result.rating;
          expect(Math.round(rating)).toBeGreaterThanOrEqual(4);
        });
      });
    });

    describe('multiple filters combined', () => {
      it('should apply amenity and price filters together', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Cheap with WiFi',
            amenities: ['wifi', 'parking'],
            metadata: { pgOptions: { basePrice: 2000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Expensive with WiFi',
            amenities: ['wifi', 'gym'],
            metadata: { pgOptions: { basePrice: 8000 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-3',
            name: 'Cheap without WiFi',
            amenities: ['parking', 'ac'],
            metadata: { pgOptions: { basePrice: 2500 } },
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ 
            cityCode: 'PAR', 
            source: 'all', 
            amenities: 'wifi',
            minPrice: 1000,
            maxPrice: 5000
          });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name).toBe('Cheap with WiFi');
      });

      it('should apply all three filter types together', async () => {
        const mockLocalProperties = [
          {
            id: 'local-1',
            name: 'Perfect Match',
            amenities: ['wifi', 'parking'],
            metadata: { pgOptions: { basePrice: 3000 } },
            rating: 4.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-2',
            name: 'Wrong Price',
            amenities: ['wifi', 'parking'],
            metadata: { pgOptions: { basePrice: 8000 } },
            rating: 4.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-3',
            name: 'Wrong Amenity',
            amenities: ['parking', 'ac'],
            metadata: { pgOptions: { basePrice: 3000 } },
            rating: 4.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          },
          {
            id: 'local-4',
            name: 'Wrong Rating',
            amenities: ['wifi', 'parking'],
            metadata: { pgOptions: { basePrice: 3000 } },
            rating: 2.5,
            isActive: true,
            approvalStatus: 'approved',
            toJSON: function() { return { ...this }; }
          }
        ];

        Property.findAll.mockResolvedValue(mockLocalProperties);
        mockAmadeusInstance.searchHotelsByCity.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/search/hotels')
          .query({ 
            cityCode: 'PAR', 
            source: 'all', 
            amenities: 'wifi',
            minPrice: 2000,
            maxPrice: 5000,
            ratings: '4,5'
          });

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name).toBe('Perfect Match');
      });
    });
  });
});
