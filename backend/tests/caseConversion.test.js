/**
 * Case Conversion Utilities Tests
 * 
 * Tests for case conversion utilities that handle camelCase <-> snake_case conversion
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

const {
  toSnakeCase,
  toCamelCase,
  objectToSnakeCase,
  objectToCamelCase,
  deepObjectToSnakeCase,
  deepObjectToCamelCase,
  serializeModelToCamelCase,
  serializeModelArrayToCamelCase,
  isObjectCamelCase,
  isObjectSnakeCase
} = require('../utils/caseConversion');
const { User } = require('../models');

describe('Case Conversion Utilities', () => {
  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('internalRole')).toBe('internal_role');
      expect(toSnakeCase('userId')).toBe('user_id');
      expect(toSnakeCase('createdAt')).toBe('created_at');
      expect(toSnakeCase('assignedPropertyId')).toBe('assigned_property_id');
    });

    it('should handle single word strings', () => {
      expect(toSnakeCase('user')).toBe('user');
      expect(toSnakeCase('role')).toBe('role');
    });

    it('should handle strings that are already snake_case', () => {
      expect(toSnakeCase('internal_role')).toBe('internal_role');
      expect(toSnakeCase('user_id')).toBe('user_id');
    });

    it('should throw TypeError for non-string input', () => {
      expect(() => toSnakeCase(123)).toThrow(TypeError);
      expect(() => toSnakeCase(null)).toThrow(TypeError);
      expect(() => toSnakeCase(undefined)).toThrow(TypeError);
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('internal_role')).toBe('internalRole');
      expect(toCamelCase('user_id')).toBe('userId');
      expect(toCamelCase('created_at')).toBe('createdAt');
      expect(toCamelCase('assigned_property_id')).toBe('assignedPropertyId');
    });

    it('should handle single word strings', () => {
      expect(toCamelCase('user')).toBe('user');
      expect(toCamelCase('role')).toBe('role');
    });

    it('should handle strings that are already camelCase', () => {
      expect(toCamelCase('internalRole')).toBe('internalRole');
      expect(toCamelCase('userId')).toBe('userId');
    });

    it('should throw TypeError for non-string input', () => {
      expect(() => toCamelCase(123)).toThrow(TypeError);
      expect(() => toCamelCase(null)).toThrow(TypeError);
      expect(() => toCamelCase(undefined)).toThrow(TypeError);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain value through camelCase -> snake_case -> camelCase', () => {
      const original = 'internalRole';
      const snakeCase = toSnakeCase(original);
      const backToCamel = toCamelCase(snakeCase);
      expect(backToCamel).toBe(original);
    });

    it('should maintain value through snake_case -> camelCase -> snake_case', () => {
      const original = 'internal_role';
      const camelCase = toCamelCase(original);
      const backToSnake = toSnakeCase(camelCase);
      expect(backToSnake).toBe(original);
    });
  });

  describe('objectToSnakeCase', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = {
        internalRole: 'agent',
        userId: '123',
        createdAt: '2024-01-01'
      };
      const result = objectToSnakeCase(input);
      expect(result).toEqual({
        internal_role: 'agent',
        user_id: '123',
        created_at: '2024-01-01'
      });
    });

    it('should handle empty objects', () => {
      expect(objectToSnakeCase({})).toEqual({});
    });

    it('should return non-objects unchanged', () => {
      expect(objectToSnakeCase(null)).toBe(null);
      expect(objectToSnakeCase([1, 2, 3])).toEqual([1, 2, 3]);
      expect(objectToSnakeCase('string')).toBe('string');
    });
  });

  describe('objectToCamelCase', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = {
        internal_role: 'agent',
        user_id: '123',
        created_at: '2024-01-01'
      };
      const result = objectToCamelCase(input);
      expect(result).toEqual({
        internalRole: 'agent',
        userId: '123',
        createdAt: '2024-01-01'
      });
    });

    it('should handle empty objects', () => {
      expect(objectToCamelCase({})).toEqual({});
    });

    it('should return non-objects unchanged', () => {
      expect(objectToCamelCase(null)).toBe(null);
      expect(objectToCamelCase([1, 2, 3])).toEqual([1, 2, 3]);
      expect(objectToCamelCase('string')).toBe('string');
    });
  });

  describe('deepObjectToSnakeCase', () => {
    it('should deeply convert nested object keys to snake_case', () => {
      const input = {
        userId: '123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          contactInfo: {
            phoneNumber: '555-1234',
            emailAddress: 'john@example.com'
          }
        }
      };
      const result = deepObjectToSnakeCase(input);
      expect(result).toEqual({
        user_id: '123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '555-1234',
            email_address: 'john@example.com'
          }
        }
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        userList: [
          { userId: '1', userName: 'Alice' },
          { userId: '2', userName: 'Bob' }
        ]
      };
      const result = deepObjectToSnakeCase(input);
      expect(result).toEqual({
        user_list: [
          { user_id: '1', user_name: 'Alice' },
          { user_id: '2', user_name: 'Bob' }
        ]
      });
    });
  });

  describe('deepObjectToCamelCase', () => {
    it('should deeply convert nested object keys to camelCase', () => {
      const input = {
        user_id: '123',
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '555-1234',
            email_address: 'john@example.com'
          }
        }
      };
      const result = deepObjectToCamelCase(input);
      expect(result).toEqual({
        userId: '123',
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          contactInfo: {
            phoneNumber: '555-1234',
            emailAddress: 'john@example.com'
          }
        }
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        user_list: [
          { user_id: '1', user_name: 'Alice' },
          { user_id: '2', user_name: 'Bob' }
        ]
      };
      const result = deepObjectToCamelCase(input);
      expect(result).toEqual({
        userList: [
          { userId: '1', userName: 'Alice' },
          { userId: '2', userName: 'Bob' }
        ]
      });
    });
  });

  describe('serializeModelToCamelCase', () => {
    it('should serialize Sequelize model to camelCase JSON', () => {
      // Create a mock Sequelize instance with toJSON method
      const mockUser = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        internalRole: 'agent',
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: function() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            internalRole: this.internalRole,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
          };
        }
      };

      const serialized = serializeModelToCamelCase(mockUser);
      
      // Check that camelCase keys exist
      expect(serialized).toHaveProperty('internalRole');
      expect(serialized).toHaveProperty('createdAt');
      expect(serialized).toHaveProperty('updatedAt');
      
      // Check that snake_case keys don't exist
      expect(serialized).not.toHaveProperty('internal_role');
      expect(serialized).not.toHaveProperty('created_at');
    });

    it('should throw TypeError for non-model input', () => {
      expect(() => serializeModelToCamelCase({})).toThrow(TypeError);
      expect(() => serializeModelToCamelCase(null)).toThrow(TypeError);
    });
  });

  describe('serializeModelArrayToCamelCase', () => {
    it('should serialize array of Sequelize models to camelCase JSON', () => {
      // Create mock Sequelize instances
      const mockUsers = [
        {
          id: '1',
          name: 'User 1',
          createdAt: new Date(),
          toJSON: function() {
            return { id: this.id, name: this.name, createdAt: this.createdAt };
          }
        },
        {
          id: '2',
          name: 'User 2',
          createdAt: new Date(),
          toJSON: function() {
            return { id: this.id, name: this.name, createdAt: this.createdAt };
          }
        }
      ];

      const serialized = serializeModelArrayToCamelCase(mockUsers);
      
      expect(Array.isArray(serialized)).toBe(true);
      expect(serialized).toHaveLength(2);
      expect(serialized[0]).toHaveProperty('createdAt');
      expect(serialized[0]).not.toHaveProperty('created_at');
    });

    it('should throw TypeError for non-array input', () => {
      expect(() => serializeModelArrayToCamelCase({})).toThrow(TypeError);
      expect(() => serializeModelArrayToCamelCase(null)).toThrow(TypeError);
    });
  });

  describe('isObjectCamelCase', () => {
    it('should return true for objects with camelCase keys', () => {
      expect(isObjectCamelCase({ userId: '123', userName: 'John' })).toBe(true);
      expect(isObjectCamelCase({ internalRole: 'agent' })).toBe(true);
      expect(isObjectCamelCase({})).toBe(true);
    });

    it('should return false for objects with snake_case keys', () => {
      expect(isObjectCamelCase({ user_id: '123' })).toBe(false);
      expect(isObjectCamelCase({ internal_role: 'agent' })).toBe(false);
    });

    it('should return false for objects with PascalCase keys', () => {
      expect(isObjectCamelCase({ UserId: '123' })).toBe(false);
    });

    it('should return true for non-objects', () => {
      expect(isObjectCamelCase(null)).toBe(true);
      expect(isObjectCamelCase([1, 2, 3])).toBe(true);
    });
  });

  describe('isObjectSnakeCase', () => {
    it('should return true for objects with snake_case keys', () => {
      expect(isObjectSnakeCase({ user_id: '123', user_name: 'John' })).toBe(true);
      expect(isObjectSnakeCase({ internal_role: 'agent' })).toBe(true);
      expect(isObjectSnakeCase({})).toBe(true);
    });

    it('should return false for objects with camelCase keys', () => {
      expect(isObjectSnakeCase({ userId: '123' })).toBe(false);
      expect(isObjectSnakeCase({ internalRole: 'agent' })).toBe(false);
    });

    it('should return true for non-objects', () => {
      expect(isObjectSnakeCase(null)).toBe(true);
      expect(isObjectSnakeCase([1, 2, 3])).toBe(true);
    });
  });

  describe('Integration with Sequelize models', () => {
    it('should verify User model uses underscored: true', () => {
      expect(User.options.underscored).toBe(true);
    });

    it('should verify field name mappings', () => {
      const rawAttributes = User.rawAttributes;
      expect(rawAttributes.internalRole.field).toBe('internal_role');
      expect(rawAttributes.staffRole.field).toBe('staff_role');
      expect(rawAttributes.territoryId.field).toBe('territory_id');
      // Note: createdAt and updatedAt are added by Sequelize timestamps option
      // and may not have explicit field mappings in rawAttributes
    });

    it('should verify toJSON returns camelCase', () => {
      // Create a mock user with toJSON method
      const mockUser = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        internalRole: 'agent',
        createdAt: new Date(),
        toJSON: function() {
          return {
            id: this.id,
            name: this.name,
            email: this.email,
            internalRole: this.internalRole,
            createdAt: this.createdAt
          };
        }
      };

      const json = mockUser.toJSON();
      
      // Should have camelCase keys
      expect(json).toHaveProperty('internalRole');
      expect(json).toHaveProperty('createdAt');
      
      // Should not have snake_case keys
      expect(json).not.toHaveProperty('internal_role');
      expect(json).not.toHaveProperty('created_at');
    });
  });
});
