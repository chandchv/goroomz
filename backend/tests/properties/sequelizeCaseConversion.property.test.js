/**
 * Property-Based Test for Sequelize Case Conversion
 * Feature: role-segregation-optimization, Property 23: Sequelize case conversion
 * Validates: Requirements 13.3
 * 
 * Tests that Sequelize automatically converts between camelCase (JavaScript) 
 * and snake_case (database) for all field names when underscored: true is configured.
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

// Define a test model with various field types to test case conversion
const TestModel = sequelize.define('TestModel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignedPropertyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'test_models',
  underscored: true
});

describe('Sequelize Case Conversion Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await TestModel.destroy({ where: {}, truncate: true, cascade: true });
  });

  // Generators for test data
  const userNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'),
      fc.constantFrom('Smith', 'Jones', 'Brown', 'Davis', 'Wilson')
    ).map(([first, last]) => `${first} ${last}`);

  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f'), { minLength: 5, maxLength: 10 }),
      fc.constantFrom('example.com', 'test.com', 'demo.org')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  const internalRoleArbitrary = () =>
    fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser', null);

  const uuidArbitrary = () => fc.uuid();

  const booleanArbitrary = () => fc.boolean();

  const dateArbitrary = () =>
    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') });

  /**
   * Property 23: Sequelize case conversion
   * Validates: Requirements 13.3
   */
  describe('Property 23: Sequelize case conversion', () => {
    test('Creating records with camelCase fields stores them as snake_case in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          userNameArbitrary(),
          emailArbitrary(),
          internalRoleArbitrary(),
          uuidArbitrary(),
          booleanArbitrary(),
          dateArbitrary(),
          async (userName, userEmail, internalRole, assignedPropertyId, isActive, lastLoginAt) => {
            // Create record using camelCase field names (JavaScript convention)
            const record = await TestModel.create({
              userName,
              userEmail,
              internalRole,
              assignedPropertyId,
              isActive,
              lastLoginAt
            });

            // Verify the record was created
            expect(record).toBeDefined();
            expect(record.id).toBeDefined();

            // Verify camelCase access works (Sequelize converts back to camelCase)
            expect(record.userName).toBe(userName);
            expect(record.userEmail).toBe(userEmail);
            expect(record.internalRole).toBe(internalRole);
            expect(record.assignedPropertyId).toBe(assignedPropertyId);
            expect(record.isActive).toBe(isActive);
            
            // Date comparison needs special handling
            if (lastLoginAt) {
              expect(record.lastLoginAt.getTime()).toBe(lastLoginAt.getTime());
            }

            // Verify the database column names are snake_case
            const rawAttributes = TestModel.rawAttributes;
            expect(rawAttributes.userName.field).toBe('user_name');
            expect(rawAttributes.userEmail.field).toBe('user_email');
            expect(rawAttributes.internalRole.field).toBe('internal_role');
            expect(rawAttributes.assignedPropertyId.field).toBe('assigned_property_id');
            expect(rawAttributes.isActive.field).toBe('is_active');
            expect(rawAttributes.lastLoginAt.field).toBe('last_login_at');

            // Verify timestamps are also converted
            expect(rawAttributes.createdAt.field).toBe('created_at');
            expect(rawAttributes.updatedAt.field).toBe('updated_at');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Querying with camelCase field names returns correct results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userName: userNameArbitrary(),
              userEmail: emailArbitrary(),
              internalRole: internalRoleArbitrary(),
              isActive: booleanArbitrary()
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (records) => {
            // Create multiple records
            const createdRecords = await TestModel.bulkCreate(records);
            expect(createdRecords.length).toBe(records.length);

            // Query using camelCase field names
            for (const original of records) {
              const found = await TestModel.findOne({
                where: {
                  userName: original.userName,
                  userEmail: original.userEmail
                }
              });

              // Verify record was found
              expect(found).toBeDefined();
              expect(found.userName).toBe(original.userName);
              expect(found.userEmail).toBe(original.userEmail);
              expect(found.internalRole).toBe(original.internalRole);
              expect(found.isActive).toBe(original.isActive);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Updating records with camelCase field names works correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userNameArbitrary(),
          emailArbitrary(),
          userNameArbitrary(),
          internalRoleArbitrary(),
          async (initialName, initialEmail, updatedName, updatedRole) => {
            // Create initial record
            const record = await TestModel.create({
              userName: initialName,
              userEmail: initialEmail,
              internalRole: null,
              isActive: true
            });

            // Update using camelCase field names
            await record.update({
              userName: updatedName,
              internalRole: updatedRole
            });

            // Verify updates were applied
            expect(record.userName).toBe(updatedName);
            expect(record.internalRole).toBe(updatedRole);
            expect(record.userEmail).toBe(initialEmail); // Unchanged

            // Fetch from database to verify persistence
            const fetched = await TestModel.findByPk(record.id);
            expect(fetched.userName).toBe(updatedName);
            expect(fetched.internalRole).toBe(updatedRole);
            expect(fetched.userEmail).toBe(initialEmail);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('toJSON returns camelCase field names', async () => {
      await fc.assert(
        fc.asyncProperty(
          userNameArbitrary(),
          emailArbitrary(),
          internalRoleArbitrary(),
          booleanArbitrary(),
          async (userName, userEmail, internalRole, isActive) => {
            // Create record
            const record = await TestModel.create({
              userName,
              userEmail,
              internalRole,
              isActive
            });

            // Get JSON representation
            const json = record.toJSON();

            // Verify all keys are in camelCase
            expect(json).toHaveProperty('userName');
            expect(json).toHaveProperty('userEmail');
            expect(json).toHaveProperty('internalRole');
            expect(json).toHaveProperty('isActive');
            expect(json).toHaveProperty('createdAt');
            expect(json).toHaveProperty('updatedAt');

            // Verify snake_case keys don't exist
            expect(json).not.toHaveProperty('user_name');
            expect(json).not.toHaveProperty('user_email');
            expect(json).not.toHaveProperty('internal_role');
            expect(json).not.toHaveProperty('is_active');
            expect(json).not.toHaveProperty('created_at');
            expect(json).not.toHaveProperty('updated_at');

            // Verify values are correct
            expect(json.userName).toBe(userName);
            expect(json.userEmail).toBe(userEmail);
            expect(json.internalRole).toBe(internalRole);
            expect(json.isActive).toBe(isActive);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Round-trip: create with camelCase, retrieve, and verify camelCase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userName: userNameArbitrary(),
            userEmail: emailArbitrary(),
            internalRole: internalRoleArbitrary(),
            assignedPropertyId: fc.option(uuidArbitrary(), { nil: null }),
            isActive: booleanArbitrary(),
            lastLoginAt: fc.option(dateArbitrary(), { nil: null })
          }),
          async (data) => {
            // Create record with camelCase
            const created = await TestModel.create(data);

            // Retrieve from database
            const retrieved = await TestModel.findByPk(created.id);

            // Verify all camelCase fields match
            expect(retrieved.userName).toBe(data.userName);
            expect(retrieved.userEmail).toBe(data.userEmail);
            expect(retrieved.internalRole).toBe(data.internalRole);
            expect(retrieved.assignedPropertyId).toBe(data.assignedPropertyId);
            expect(retrieved.isActive).toBe(data.isActive);
            
            if (data.lastLoginAt) {
              expect(retrieved.lastLoginAt.getTime()).toBe(data.lastLoginAt.getTime());
            } else {
              expect(retrieved.lastLoginAt).toBe(null);
            }

            // Verify toJSON returns camelCase
            const json = retrieved.toJSON();
            expect(json.userName).toBe(data.userName);
            expect(json.userEmail).toBe(data.userEmail);
            expect(json.internalRole).toBe(data.internalRole);
            expect(json.assignedPropertyId).toBe(data.assignedPropertyId);
            expect(json.isActive).toBe(data.isActive);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Bulk operations maintain camelCase conversion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userName: userNameArbitrary(),
              userEmail: emailArbitrary(),
              internalRole: internalRoleArbitrary(),
              isActive: booleanArbitrary()
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (records) => {
            // Clean up before this iteration
            await TestModel.destroy({ where: {}, truncate: true, cascade: true });

            // Bulk create with camelCase
            const created = await TestModel.bulkCreate(records);
            expect(created.length).toBe(records.length);

            // Verify each record has camelCase fields
            for (let i = 0; i < created.length; i++) {
              expect(created[i].userName).toBe(records[i].userName);
              expect(created[i].userEmail).toBe(records[i].userEmail);
              expect(created[i].internalRole).toBe(records[i].internalRole);
              expect(created[i].isActive).toBe(records[i].isActive);
            }

            // Bulk retrieve and verify
            const retrieved = await TestModel.findAll();
            expect(retrieved.length).toBe(records.length);

            // Verify all retrieved records have camelCase fields
            for (const record of retrieved) {
              expect(record.userName).toBeDefined();
              expect(record.userEmail).toBeDefined();
              expect(record).toHaveProperty('internalRole');
              expect(record).toHaveProperty('isActive');
              expect(record).toHaveProperty('createdAt');
              expect(record).toHaveProperty('updatedAt');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Complex queries with multiple camelCase fields work correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userName: userNameArbitrary(),
              userEmail: emailArbitrary(),
              internalRole: internalRoleArbitrary(),
              isActive: booleanArbitrary()
            }),
            { minLength: 5, maxLength: 10 }
          ),
          fc.constantFrom('agent', 'regional_manager', 'platform_admin'),
          fc.boolean(),
          async (records, targetRole, targetActive) => {
            // Clean up before this iteration
            await TestModel.destroy({ where: {}, truncate: true, cascade: true });

            // Create records
            await TestModel.bulkCreate(records);

            // Query with multiple camelCase conditions
            const results = await TestModel.findAll({
              where: {
                internalRole: targetRole,
                isActive: targetActive
              }
            });

            // Verify all results match the query conditions
            for (const result of results) {
              expect(result.internalRole).toBe(targetRole);
              expect(result.isActive).toBe(targetActive);
              
              // Verify camelCase fields are accessible
              expect(result.userName).toBeDefined();
              expect(result.userEmail).toBeDefined();
            }

            // Verify count matches
            const expectedCount = records.filter(
              r => r.internalRole === targetRole && r.isActive === targetActive
            ).length;
            expect(results.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
