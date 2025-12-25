const { User, sequelize } = require('../models');

describe('User Helper Methods', () => {
  beforeAll(async () => {
    // Ensure database is connected
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('isPropertyOwner', () => {
    it('should return true for owner role without internalRole', () => {
      const user = User.build({ role: 'owner', internalRole: null });
      expect(user.isPropertyOwner()).toBe(true);
    });

    it('should return true for admin role without internalRole', () => {
      const user = User.build({ role: 'admin', internalRole: null });
      expect(user.isPropertyOwner()).toBe(true);
    });

    it('should return true for category_owner role without internalRole', () => {
      const user = User.build({ role: 'category_owner', internalRole: null });
      expect(user.isPropertyOwner()).toBe(true);
    });

    it('should return false for owner role with internalRole', () => {
      const user = User.build({ role: 'owner', internalRole: 'agent' });
      expect(user.isPropertyOwner()).toBe(false);
    });

    it('should return false for user role', () => {
      const user = User.build({ role: 'user', internalRole: null });
      expect(user.isPropertyOwner()).toBe(false);
    });
  });

  describe('isPlatformStaff', () => {
    it('should return true when internalRole is set', () => {
      const user = User.build({ role: 'user', internalRole: 'agent' });
      expect(user.isPlatformStaff()).toBe(true);
    });

    it('should return true for superuser', () => {
      const user = User.build({ role: 'user', internalRole: 'superuser' });
      expect(user.isPlatformStaff()).toBe(true);
    });

    it('should return false when internalRole is null', () => {
      const user = User.build({ role: 'owner', internalRole: null });
      expect(user.isPlatformStaff()).toBe(false);
    });
  });

  describe('isPropertyStaff', () => {
    it('should return true when staffRole is set and no internalRole', () => {
      const user = User.build({ role: 'user', staffRole: 'front_desk', internalRole: null });
      expect(user.isPropertyStaff()).toBe(true);
    });

    it('should return false when staffRole is set but internalRole exists', () => {
      const user = User.build({ role: 'user', staffRole: 'front_desk', internalRole: 'agent' });
      expect(user.isPropertyStaff()).toBe(false);
    });

    it('should return false when staffRole is null', () => {
      const user = User.build({ role: 'user', staffRole: null, internalRole: null });
      expect(user.isPropertyStaff()).toBe(false);
    });

    it('should return false when user has both property owner role and staffRole', () => {
      const user = User.build({ role: 'owner', staffRole: 'front_desk', internalRole: null });
      expect(user.isPropertyStaff()).toBe(false);
    });
  });

  describe('getUserType', () => {
    it('should return platform_staff for users with internalRole', () => {
      const user = User.build({ role: 'user', internalRole: 'agent' });
      expect(user.getUserType()).toBe('platform_staff');
    });

    it('should return property_owner for owner without internalRole', () => {
      const user = User.build({ role: 'owner', internalRole: null });
      expect(user.getUserType()).toBe('property_owner');
    });

    it('should return property_staff for users with staffRole', () => {
      const user = User.build({ role: 'user', staffRole: 'housekeeping', internalRole: null });
      expect(user.getUserType()).toBe('property_staff');
    });

    it('should return external_user for regular users', () => {
      const user = User.build({ role: 'user', internalRole: null, staffRole: null });
      expect(user.getUserType()).toBe('external_user');
    });

    it('should prioritize internalRole over role', () => {
      const user = User.build({ role: 'owner', internalRole: 'superuser' });
      expect(user.getUserType()).toBe('platform_staff');
    });

    it('should prioritize internalRole over staffRole', () => {
      const user = User.build({ role: 'user', staffRole: 'front_desk', internalRole: 'agent' });
      expect(user.getUserType()).toBe('platform_staff');
    });

    it('should prioritize property owner role over staffRole', () => {
      const user = User.build({ role: 'owner', staffRole: 'front_desk', internalRole: null });
      expect(user.getUserType()).toBe('property_owner');
    });
  });

  describe('getAccessiblePropertyIds', () => {
    it('should return empty array for external users', async () => {
      const user = User.build({ 
        id: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user', 
        internalRole: null, 
        staffRole: null 
      });
      const propertyIds = await user.getAccessiblePropertyIds();
      expect(Array.isArray(propertyIds)).toBe(true);
      expect(propertyIds.length).toBe(0);
    });

    it('should return empty array for property staff (until assignedPropertyId is implemented)', async () => {
      const user = User.build({ 
        id: '123e4567-e89b-12d3-a456-426614174001',
        role: 'user', 
        staffRole: 'front_desk', 
        internalRole: null 
      });
      const propertyIds = await user.getAccessiblePropertyIds();
      expect(Array.isArray(propertyIds)).toBe(true);
      expect(propertyIds.length).toBe(0);
    });

    it('should return empty array for agents (until PropertyAssignment is implemented)', async () => {
      const user = User.build({ 
        id: '123e4567-e89b-12d3-a456-426614174002',
        role: 'user', 
        internalRole: 'agent' 
      });
      const propertyIds = await user.getAccessiblePropertyIds();
      expect(Array.isArray(propertyIds)).toBe(true);
      expect(propertyIds.length).toBe(0);
    });

    it('should return empty array for regional managers (until PropertyAssignment is implemented)', async () => {
      const user = User.build({ 
        id: '123e4567-e89b-12d3-a456-426614174003',
        role: 'user', 
        internalRole: 'regional_manager',
        territoryId: '123e4567-e89b-12d3-a456-426614174010'
      });
      const propertyIds = await user.getAccessiblePropertyIds();
      expect(Array.isArray(propertyIds)).toBe(true);
      expect(propertyIds.length).toBe(0);
    });
  });
});
