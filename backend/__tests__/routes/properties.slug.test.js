/**
 * Tests for SEO-friendly property slug URLs
 */

const request = require('supertest');
const { sequelize } = require('../../config/database');
const { Property, User } = require('../../models');

// Mock app setup
const express = require('express');
const propertiesRouter = require('../../routes/properties');

const app = express();
app.use(express.json());
app.use('/api/properties', propertiesRouter);

describe('Property Slug URLs', () => {
  let testProperty;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.create({
      name: 'Test Owner',
      email: 'owner@test.com',
      phone: '9876543210',
      role: 'owner'
    });

    // Create test property with slug
    testProperty = await Property.create({
      name: 'Cozy PG for Students',
      slug: 'cozy-pg-for-students-bangalore-koramangala',
      description: 'A comfortable PG near tech parks',
      type: 'pg',
      ownerId: testUser.id,
      location: {
        city: 'Bangalore',
        area: 'Koramangala',
        address: '123 Main Street'
      },
      isActive: true,
      approvalStatus: 'approved',
      metadata: {
        pgOptions: {
          basePrice: 8000,
          sharingPrices: {
            single: 12000,
            double: 8000
          }
        },
        genderPreference: 'any'
      }
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/properties/:identifier', () => {
    test('should fetch property by UUID', async () => {
      const response = await request(app)
        .get(`/api/properties/${testProperty.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProperty.id);
      expect(response.body.data.name).toBe('Cozy PG for Students');
    });

    test('should fetch property by slug', async () => {
      const response = await request(app)
        .get('/api/properties/cozy-pg-for-students-bangalore-koramangala')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProperty.id);
      expect(response.body.data.slug).toBe('cozy-pg-for-students-bangalore-koramangala');
      expect(response.body.data.name).toBe('Cozy PG for Students');
    });

    test('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/properties/non-existent-property-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Property not found');
    });

    test('should return 404 for non-existent UUID', async () => {
      const response = await request(app)
        .get('/api/properties/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Slug Generation', () => {
    test('should generate slug from property name and location', () => {
      const slug = Property.generateSlug('Modern Hostel', 'Bangalore', 'Indiranagar');
      expect(slug).toBe('modern-hostel-bangalore-indiranagar');
    });

    test('should handle special characters in name', () => {
      const slug = Property.generateSlug('PG @ HSR Layout!', 'Bangalore', 'HSR');
      expect(slug).toBe('pg-hsr-layout-bangalore-hsr');
    });

    test('should handle multiple spaces', () => {
      const slug = Property.generateSlug('Cozy    PG    for    Students', 'Bangalore', 'Koramangala');
      expect(slug).toBe('cozy-pg-for-students-bangalore-koramangala');
    });

    test('should convert to lowercase', () => {
      const slug = Property.generateSlug('LUXURY PG', 'BANGALORE', 'WHITEFIELD');
      expect(slug).toBe('luxury-pg-bangalore-whitefield');
    });

    test('should handle missing location', () => {
      const slug = Property.generateSlug('Test PG', '', '');
      expect(slug).toBe('test-pg');
    });
  });

  describe('Auto-slug generation on create', () => {
    test('should auto-generate slug when creating property', async () => {
      const newProperty = await Property.create({
        name: 'New Test PG',
        description: 'Test description',
        type: 'pg',
        ownerId: testUser.id,
        location: {
          city: 'Bangalore',
          area: 'Whitefield',
          address: '456 Test Street'
        },
        isActive: true,
        approvalStatus: 'approved'
      });

      expect(newProperty.slug).toBeTruthy();
      expect(newProperty.slug).toContain('new-test-pg');
      expect(newProperty.slug).toContain('bangalore');
      expect(newProperty.slug).toContain('whitefield');
    });
  });

  describe('POST /api/properties/:identifier/claim', () => {
    test('should allow claiming property by slug', async () => {
      const claimData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        proofOfOwnership: 'I have property documents'
      };

      const response = await request(app)
        .post('/api/properties/cozy-pg-for-students-bangalore-koramangala/claim')
        .send(claimData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Claim request submitted successfully');
    });

    test('should allow claiming property by UUID', async () => {
      // Create another property for this test
      const anotherProperty = await Property.create({
        name: 'Another PG',
        slug: 'another-pg-bangalore-btm',
        description: 'Test',
        type: 'pg',
        ownerId: testUser.id,
        location: { city: 'Bangalore', area: 'BTM', address: 'Test' },
        isActive: true,
        approvalStatus: 'approved'
      });

      const claimData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543211',
        proofOfOwnership: 'I have property documents'
      };

      const response = await request(app)
        .post(`/api/properties/${anotherProperty.id}/claim`)
        .send(claimData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});
