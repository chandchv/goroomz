/**
 * Property-Based Tests for Lead Required Field Validation
 * Feature: internal-user-roles, Property 5: Required field validation
 * 
 * Property: For any property onboarding submission, all required fields 
 * (name, email, phone, business details, property information) must be present 
 * or the submission should be rejected
 * 
 * Validates: Requirements 1.2, 1.5
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
    underscored: false
  }
});

// Define Lead model inline for testing
const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyOwnerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidPhone(value) {
        const phone = value.trim();
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          throw new Error('Phone number must be 10-15 digits and may start with +');
        }
      }
    }
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  propertyType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['hotel', 'pg']]
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India'
  },
  estimatedRooms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'contacted'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'leads'
});

/**
 * Function to validate lead data
 */
function validateLeadData(leadData) {
  const errors = [];

  // Check required fields
  if (!leadData.propertyOwnerName || leadData.propertyOwnerName.trim().length === 0) {
    errors.push('propertyOwnerName is required');
  }

  if (!leadData.email || leadData.email.trim().length === 0) {
    errors.push('email is required');
  }

  if (!leadData.phone || leadData.phone.trim().length === 0) {
    errors.push('phone is required');
  }

  if (!leadData.propertyType) {
    errors.push('propertyType is required');
  }

  if (!leadData.city || leadData.city.trim().length === 0) {
    errors.push('city is required');
  }

  if (!leadData.state || leadData.state.trim().length === 0) {
    errors.push('state is required');
  }

  if (!leadData.agentId) {
    errors.push('agentId is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

describe('Property 5: Required Field Validation', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Lead.destroy({ where: {}, truncate: true });
  });

  /**
   * Generator for valid property owner names
   */
  const propertyOwnerNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Raj', 'Priya'),
      fc.constantFrom('Smith', 'Johnson', 'Kumar', 'Patel', 'Singh', 'Sharma')
    ).map(([first, last]) => `${first} ${last}`);

  /**
   * Generator for valid email addresses
   */
  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'), { minLength: 5, maxLength: 15 }),
      fc.constantFrom('example.com', 'test.com', 'demo.com', 'gmail.com')
    ).map(([localChars, domain]) => `${localChars.join('')}@${domain}`);

  /**
   * Generator for valid phone numbers
   */
  const phoneArbitrary = () =>
    fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString());

  /**
   * Generator for property types
   */
  const propertyTypeArbitrary = () =>
    fc.constantFrom('hotel', 'pg');

  /**
   * Generator for city names
   */
  const cityArbitrary = () =>
    fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad');

  /**
   * Generator for state names
   */
  const stateArbitrary = () =>
    fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat');

  /**
   * Generator for UUIDs
   */
  const uuidArbitrary = () =>
    fc.uuid();

  /**
   * Generator for complete valid lead data
   */
  const validLeadDataArbitrary = () =>
    fc.record({
      propertyOwnerName: propertyOwnerNameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      propertyType: propertyTypeArbitrary(),
      city: cityArbitrary(),
      state: stateArbitrary(),
      agentId: uuidArbitrary(),
      businessName: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: null }),
      address: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
      country: fc.constant('India'),
      estimatedRooms: fc.option(fc.integer({ min: 1, max: 500 }), { nil: null }),
      territoryId: fc.option(uuidArbitrary(), { nil: null })
    });

  test('Property 5: Valid lead data with all required fields passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        async (leadData) => {
          // Validate the lead data
          const validation = validateLeadData(leadData);

          // Property assertion: Valid data should pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);

          // Try to create the lead in database
          const lead = await Lead.create(leadData);

          // Verify lead was created successfully
          expect(lead).toBeDefined();
          expect(lead.id).toBeDefined();
          expect(lead.propertyOwnerName).toBe(leadData.propertyOwnerName);
          expect(lead.email).toBe(leadData.email);
          expect(lead.phone).toBe(leadData.phone);
          expect(lead.propertyType).toBe(leadData.propertyType);
          expect(lead.city).toBe(leadData.city);
          expect(lead.state).toBe(leadData.state);
          expect(lead.agentId).toBe(leadData.agentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Missing propertyOwnerName fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (leadData, invalidName) => {
          // Create lead data with invalid name
          const invalidLeadData = { ...leadData, propertyOwnerName: invalidName };

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing name should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('propertyOwnerName is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing email fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (leadData, invalidEmail) => {
          // Create lead data with invalid email
          const invalidLeadData = { ...leadData, email: invalidEmail };

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing email should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('email is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing phone fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (leadData, invalidPhone) => {
          // Create lead data with invalid phone
          const invalidLeadData = { ...leadData, phone: invalidPhone };

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing phone should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('phone is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing propertyType fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        async (leadData) => {
          // Create lead data without propertyType
          const invalidLeadData = { ...leadData };
          delete invalidLeadData.propertyType;

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing propertyType should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('propertyType is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing city fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (leadData, invalidCity) => {
          // Create lead data with invalid city
          const invalidLeadData = { ...leadData, city: invalidCity };

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing city should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('city is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing state fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        fc.constantFrom(null, undefined, '', '   '),
        async (leadData, invalidState) => {
          // Create lead data with invalid state
          const invalidLeadData = { ...leadData, state: invalidState };

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing state should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('state is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Missing agentId fails validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        async (leadData) => {
          // Create lead data without agentId
          const invalidLeadData = { ...leadData };
          delete invalidLeadData.agentId;

          // Validate the lead data
          const validation = validateLeadData(invalidLeadData);

          // Property assertion: Missing agentId should fail validation
          expect(validation.isValid).toBe(false);
          expect(validation.errors).toContain('agentId is required');

          // Try to create the lead in database - should fail
          await expect(Lead.create(invalidLeadData)).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 5: Optional fields can be null or undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        validLeadDataArbitrary(),
        async (leadData) => {
          // Create lead data with optional fields as null
          const leadDataWithNulls = {
            ...leadData,
            businessName: null,
            address: null,
            estimatedRooms: null,
            territoryId: null
          };

          // Validate the lead data
          const validation = validateLeadData(leadDataWithNulls);

          // Property assertion: Optional fields being null should still pass validation
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);

          // Try to create the lead in database
          const lead = await Lead.create(leadDataWithNulls);

          // Verify lead was created successfully
          expect(lead).toBeDefined();
          expect(lead.id).toBeDefined();
          expect(lead.businessName).toBeNull();
          expect(lead.address).toBeNull();
          expect(lead.estimatedRooms).toBeNull();
          expect(lead.territoryId).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
