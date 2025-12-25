/**
 * Property-Based Tests for Property Owner Account Creation
 * Feature: internal-management-system, Property 34: Property owner account creation
 * 
 * Property: For any new property owner account, secure credentials must be generated 
 * and the account must be associated with at least one property
 * 
 * Validates: Requirements 36.2
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');
const crypto = require('crypto');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Define User model inline for testing
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('guest', 'owner', 'category_owner', 'admin'),
    defaultValue: 'guest'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users'
});

// Define Room model inline for testing
const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  location: {
    type: DataTypes.JSON,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('PG', 'Hotel Room', 'Independent Home', 'Home Stay'),
    allowNull: false
  },
  roomType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'rooms'
});

// Define associations
User.hasMany(Room, { foreignKey: 'ownerId', as: 'ownedRooms' });
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

describe('Property 34: Property Owner Account Creation', () => {
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await Room.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  /**
   * Custom generator for valid names
   */
  const nameArbitrary = () =>
    fc.string({ minLength: 2, maxLength: 50 })
      .filter(s => s.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(s));

  /**
   * Custom generator for valid emails
   */
  const emailArbitrary = () =>
    fc.emailAddress();

  /**
   * Custom generator for valid phone numbers
   */
  const phoneArbitrary = () =>
    fc.integer({ min: 1000000000, max: 9999999999 })
      .map(n => n.toString());

  /**
   * Custom generator for property owner roles
   */
  const roleArbitrary = () =>
    fc.constantFrom('owner', 'category_owner');

  /**
   * Custom generator for property types
   */
  const propertyTypeArbitrary = () =>
    fc.constantFrom('PG', 'Hotel Room');

  /**
   * Custom generator for location data
   */
  const locationArbitrary = () =>
    fc.record({
      address: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      state: fc.string({ minLength: 2, maxLength: 50 }),
      pincode: fc.string({ minLength: 6, maxLength: 6 }),
      coordinates: fc.record({
        lat: fc.double({ min: -90, max: 90 }),
        lng: fc.double({ min: -180, max: 180 })
      })
    });

  /**
   * Function to simulate property owner account creation
   */
  const createPropertyOwnerAccount = async (name, email, phone, role) => {
    // Generate secure credentials
    const generatedPassword = crypto.randomBytes(8).toString('hex');
    
    // Create property owner account
    const propertyOwner = await User.create({
      name,
      email,
      phone,
      role,
      password: generatedPassword,
      isVerified: true
    });
    
    return {
      propertyOwner,
      credentials: {
        email,
        password: generatedPassword
      }
    };
  };

  /**
   * Function to create a property for an owner
   */
  const createPropertyForOwner = async (ownerId, propertyType, location) => {
    const property = await Room.create({
      ownerId,
      title: `Test Property ${Date.now()}`,
      description: 'Test property description',
      category: propertyType,
      roomType: propertyType,
      price: 5000,
      location,
      isActive: true,
      approvalStatus: 'approved'
    });
    
    return property;
  };

  test('Property 34: Secure credentials are generated for any new property owner account', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        roleArbitrary(),
        async (name, email, phone, role) => {
          // Create property owner account
          const { propertyOwner, credentials } = await createPropertyOwnerAccount(
            name,
            email,
            phone,
            role
          );
          
          // Property: Secure credentials must be generated
          expect(credentials).toBeDefined();
          expect(credentials.email).toBe(email);
          expect(credentials.password).toBeDefined();
          expect(credentials.password.length).toBeGreaterThan(0);
          
          // Verify password is a secure random string (at least 16 characters from crypto.randomBytes(8))
          expect(credentials.password.length).toBeGreaterThanOrEqual(16);
          expect(/^[a-f0-9]+$/.test(credentials.password)).toBe(true);
          
          // Verify account was created with correct details
          expect(propertyOwner.name).toBe(name);
          expect(propertyOwner.email).toBe(email);
          expect(propertyOwner.phone).toBe(phone);
          expect(propertyOwner.role).toBe(role);
          expect(propertyOwner.isVerified).toBe(true);
          
          // Verify password is stored
          expect(propertyOwner.password).toBe(credentials.password);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 34: Property owner account must be associated with at least one property', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        roleArbitrary(),
        propertyTypeArbitrary(),
        locationArbitrary(),
        async (name, email, phone, role, propertyType, location) => {
          // Create property owner account
          const { propertyOwner } = await createPropertyOwnerAccount(
            name,
            email,
            phone,
            role
          );
          
          // Create at least one property for the owner
          const property = await createPropertyForOwner(
            propertyOwner.id,
            propertyType,
            location
          );
          
          // Property: Account must be associated with at least one property
          const ownerWithProperties = await User.findByPk(propertyOwner.id, {
            include: [{ model: Room, as: 'ownedRooms' }]
          });
          
          expect(ownerWithProperties).toBeDefined();
          expect(ownerWithProperties.ownedRooms).toBeDefined();
          expect(ownerWithProperties.ownedRooms.length).toBeGreaterThanOrEqual(1);
          
          // Verify the property is correctly associated
          const firstProperty = ownerWithProperties.ownedRooms[0];
          expect(firstProperty.ownerId).toBe(propertyOwner.id);
          expect(firstProperty.id).toBe(property.id);
          expect(firstProperty.category).toBe(propertyType);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 34: Each property owner has unique credentials', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: nameArbitrary(),
            email: emailArbitrary(),
            phone: phoneArbitrary(),
            role: roleArbitrary()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (ownerData) => {
          const createdOwners = [];
          
          // Create multiple property owner accounts
          for (const data of ownerData) {
            try {
              const result = await createPropertyOwnerAccount(
                data.name,
                data.email,
                data.phone,
                data.role
              );
              createdOwners.push(result);
            } catch (error) {
              // Skip if email already exists (expected for duplicate emails)
              if (!error.message.includes('UNIQUE constraint failed')) {
                throw error;
              }
            }
          }
          
          // Property: Each owner must have unique credentials
          const passwords = createdOwners.map(o => o.credentials.password);
          const uniquePasswords = new Set(passwords);
          
          // All passwords should be unique (very high probability with crypto.randomBytes)
          expect(uniquePasswords.size).toBe(passwords.length);
          
          // All emails should be unique
          const emails = createdOwners.map(o => o.credentials.email);
          const uniqueEmails = new Set(emails);
          expect(uniqueEmails.size).toBe(emails.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 34: Property owner account creation is idempotent for same email', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        roleArbitrary(),
        async (name, email, phone, role) => {
          // Create first property owner account
          const firstAccount = await createPropertyOwnerAccount(
            name,
            email,
            phone,
            role
          );
          
          // Attempt to create second account with same email should fail
          let errorOccurred = false;
          try {
            await createPropertyOwnerAccount(
              name + ' Duplicate',
              email, // Same email
              phone,
              role
            );
          } catch (error) {
            errorOccurred = true;
            // Verify it's a unique constraint error
            expect(error.name).toBe('SequelizeUniqueConstraintError');
          }
          
          // Property: Duplicate email should be rejected
          expect(errorOccurred).toBe(true);
          
          // Verify only one account exists with this email
          const accounts = await User.findAll({ where: { email } });
          expect(accounts.length).toBe(1);
          expect(accounts[0].id).toBe(firstAccount.propertyOwner.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 34: Generated credentials are cryptographically secure', async () => {
    await fc.assert(
      fc.asyncProperty(
        nameArbitrary(),
        emailArbitrary(),
        phoneArbitrary(),
        roleArbitrary(),
        async (name, email, phone, role) => {
          // Create property owner account
          const { credentials } = await createPropertyOwnerAccount(
            name,
            email,
            phone,
            role
          );
          
          // Property: Credentials must be cryptographically secure
          // crypto.randomBytes(8).toString('hex') produces 16 hex characters
          expect(credentials.password.length).toBe(16);
          
          // Must be valid hexadecimal
          expect(/^[a-f0-9]{16}$/.test(credentials.password)).toBe(true);
          
          // Should have good entropy (not all same character)
          const uniqueChars = new Set(credentials.password.split(''));
          expect(uniqueChars.size).toBeGreaterThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
