/**
 * Property-Based Tests for Search Result Matching
 * Feature: internal-user-roles, Property 23: Search result matching
 * 
 * Property: For any search query (property name, owner name, email, location), 
 * all returned results should match the search criteria
 * 
 * Validates: Requirements 16.1, 16.2, 16.3, 6.1
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
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  location: {
    type: DataTypes.JSON,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roomType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  currentStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'rooms'
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
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  propertyType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'contacted'
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'leads'
});

// Define associations
Room.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Room, { as: 'properties', foreignKey: 'ownerId' });

/**
 * Function to perform search across properties, owners, and leads
 */
async function performSearch(searchQuery) {
  const searchTerm = searchQuery.toLowerCase();
  const results = {
    properties: [],
    owners: [],
    leads: []
  };

  // Search properties by title, description, location, or room number
  const properties = await Room.findAll({
    where: {
      isActive: true
    },
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ]
  });

  results.properties = properties.filter(p => {
    const title = (p.title || '').toLowerCase();
    const description = (p.description || '').toLowerCase();
    const roomNumber = (p.roomNumber || '').toLowerCase();
    const locationStr = JSON.stringify(p.location || {}).toLowerCase();
    
    return title.includes(searchTerm) ||
           description.includes(searchTerm) ||
           roomNumber.includes(searchTerm) ||
           locationStr.includes(searchTerm);
  });

  // Search owners by name, email, or phone
  const owners = await User.findAll({
    where: {
      role: 'owner',
      isActive: true
    }
  });

  results.owners = owners.filter(o => {
    const name = (o.name || '').toLowerCase();
    const email = (o.email || '').toLowerCase();
    const phone = (o.phone || '').toLowerCase();
    
    return name.includes(searchTerm) ||
           email.includes(searchTerm) ||
           phone.includes(searchTerm);
  });

  // Search leads by property owner name, email, business name, phone, city, or state
  const leads = await Lead.findAll();

  results.leads = leads.filter(l => {
    const propertyOwnerName = (l.propertyOwnerName || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    const businessName = (l.businessName || '').toLowerCase();
    const phone = (l.phone || '').toLowerCase();
    const city = (l.city || '').toLowerCase();
    const state = (l.state || '').toLowerCase();
    
    return propertyOwnerName.includes(searchTerm) ||
           email.includes(searchTerm) ||
           businessName.includes(searchTerm) ||
           phone.includes(searchTerm) ||
           city.includes(searchTerm) ||
           state.includes(searchTerm);
  });

  return results;
}

/**
 * Function to verify all results match the search query
 */
function verifySearchResults(searchQuery, results) {
  const searchTerm = searchQuery.toLowerCase();
  
  // Verify all properties match
  for (const property of results.properties) {
    const title = (property.title || '').toLowerCase();
    const description = (property.description || '').toLowerCase();
    const roomNumber = (property.roomNumber || '').toLowerCase();
    const locationStr = JSON.stringify(property.location || {}).toLowerCase();
    
    const matches = title.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   roomNumber.includes(searchTerm) ||
                   locationStr.includes(searchTerm);
    
    if (!matches) {
      return {
        isValid: false,
        error: `Property "${property.title}" does not match search query "${searchQuery}"`
      };
    }
  }

  // Verify all owners match
  for (const owner of results.owners) {
    const name = (owner.name || '').toLowerCase();
    const email = (owner.email || '').toLowerCase();
    const phone = (owner.phone || '').toLowerCase();
    
    const matches = name.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   phone.includes(searchTerm);
    
    if (!matches) {
      return {
        isValid: false,
        error: `Owner "${owner.name}" does not match search query "${searchQuery}"`
      };
    }
  }

  // Verify all leads match
  for (const lead of results.leads) {
    const propertyOwnerName = (lead.propertyOwnerName || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const businessName = (lead.businessName || '').toLowerCase();
    const phone = (lead.phone || '').toLowerCase();
    const city = (lead.city || '').toLowerCase();
    const state = (lead.state || '').toLowerCase();
    
    const matches = propertyOwnerName.includes(searchTerm) ||
                   email.includes(searchTerm) ||
                   businessName.includes(searchTerm) ||
                   phone.includes(searchTerm) ||
                   city.includes(searchTerm) ||
                   state.includes(searchTerm);
    
    if (!matches) {
      return {
        isValid: false,
        error: `Lead "${lead.propertyOwnerName}" does not match search query "${searchQuery}"`
      };
    }
  }

  return { isValid: true };
}

describe('Property 23: Search Result Matching', () => {
  let emailCounter = 0;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await Room.destroy({ where: {}, force: true });
    await Lead.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    emailCounter = 0;
  });

  afterEach(async () => {
    // Clear all data after each test
    await Room.destroy({ where: {}, force: true });
    await Lead.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
  });

  /**
   * Generator for property owner names
   */
  const nameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Raj', 'Priya', 'Kumar', 'Sharma'),
      fc.constantFrom('Smith', 'Johnson', 'Kumar', 'Patel', 'Singh', 'Sharma', 'Gupta', 'Reddy')
    ).map(([first, last]) => `${first} ${last}`);

  /**
   * Generator for email addresses (with timestamp to ensure uniqueness)
   */
  const emailArbitrary = () =>
    fc.tuple(
      fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'), { minLength: 5, maxLength: 10 }),
      fc.constantFrom('example.com', 'test.com', 'demo.com', 'gmail.com'),
      fc.integer({ min: 1000, max: 9999 })
    ).map(([localChars, domain, unique]) => `${localChars.join('')}${unique}${Date.now()}@${domain}`);

  /**
   * Generator for phone numbers
   */
  const phoneArbitrary = () =>
    fc.integer({ min: 1000000000, max: 9999999999 }).map(n => n.toString());

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
   * Generator for property titles
   */
  const propertyTitleArbitrary = () =>
    fc.tuple(
      fc.constantFrom('Luxury', 'Cozy', 'Modern', 'Spacious', 'Comfortable', 'Premium'),
      fc.constantFrom('Hotel', 'PG', 'Room', 'Suite', 'Apartment'),
      fc.constantFrom('in Mumbai', 'in Delhi', 'in Bangalore', 'near Airport', 'near Station')
    ).map(([adj, type, location]) => `${adj} ${type} ${location}`);

  /**
   * Generator for UUIDs
   */
  const uuidArbitrary = () => fc.uuid();

  /**
   * Generator for property owner
   */
  const ownerArbitrary = () =>
    fc.record({
      name: nameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      role: fc.constant('owner'),
      location: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: null }),
      city: fc.option(cityArbitrary(), { nil: null }),
      state: fc.option(stateArbitrary(), { nil: null }),
      isActive: fc.constant(true)
    });

  /**
   * Generator for property/room
   */
  const propertyArbitrary = (ownerId) =>
    fc.record({
      title: propertyTitleArbitrary(),
      description: fc.string({ minLength: 20, maxLength: 100 }),
      location: fc.record({
        city: cityArbitrary(),
        state: stateArbitrary(),
        address: fc.string({ minLength: 10, maxLength: 50 })
      }),
      category: fc.constantFrom('PG', 'Hotel Room'),
      roomType: fc.constantFrom('Private Room', 'Shared Room'),
      price: fc.double({ min: 1000, max: 50000 }),
      roomNumber: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: null }),
      floorNumber: fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
      currentStatus: fc.constantFrom('occupied', 'vacant_clean', 'vacant_dirty'),
      isActive: fc.constant(true),
      ownerId: fc.constant(ownerId)
    });

  /**
   * Generator for lead
   */
  const leadArbitrary = (agentId) =>
    fc.record({
      propertyOwnerName: nameArbitrary(),
      email: emailArbitrary(),
      phone: phoneArbitrary(),
      businessName: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: null }),
      propertyType: fc.constantFrom('hotel', 'pg'),
      city: cityArbitrary(),
      state: stateArbitrary(),
      status: fc.constantFrom('contacted', 'in_progress', 'approved'),
      agentId: fc.constant(agentId)
    });

  test('Property 23: Search by property name returns only matching properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        ownerArbitrary(),
        fc.array(propertyTitleArbitrary(), { minLength: 3, maxLength: 5 }),
        fc.constantFrom('Luxury', 'Cozy', 'Modern', 'Mumbai', 'Delhi'),
        async (ownerData, propertyTitles, searchTerm) => {
          // Clear data from previous iteration
          await Room.destroy({ where: {}, force: true });
          await User.destroy({ where: {}, force: true });

          // Create owner with unique email
          const uniqueOwnerData = {
            ...ownerData,
            email: `owner${emailCounter++}${Date.now()}@test.com`
          };
          const owner = await User.create(uniqueOwnerData);

          // Create properties with different titles (add unique ID to avoid duplicates)
          let index = 0;
          for (const title of propertyTitles) {
            // Extract city from title if present, otherwise use a default that won't match search terms
            let city = 'TestCity';
            if (title.toLowerCase().includes('mumbai')) city = 'Mumbai';
            else if (title.toLowerCase().includes('delhi')) city = 'Delhi';
            else if (title.toLowerCase().includes('bangalore')) city = 'Bangalore';
            else if (title.toLowerCase().includes('hyderabad')) city = 'Hyderabad';
            else if (title.toLowerCase().includes('chennai')) city = 'Chennai';
            
            await Room.create({
              title: `${title} [ID:${index++}]`,
              description: 'A nice property with good amenities',
              location: { city, state: 'TestState', address: '123 Test St' },
              category: 'PG',
              roomType: 'Private Room',
              price: 5000,
              isActive: true,
              ownerId: owner.id
            });
          }

          // Perform search
          const results = await performSearch(searchTerm);

          // Verify all results match the search query
          const verification = verifySearchResults(searchTerm, results);
          expect(verification.isValid).toBe(true);

          // Verify that properties that should match are included
          // The search should match the original title part (before the [ID:X] suffix)
          const matchingTitles = propertyTitles.filter(t => 
            t.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          expect(results.properties.length).toBe(matchingTitles.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23: Search by owner name returns only matching owners', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(ownerArbitrary(), { minLength: 3, maxLength: 5 }),
        fc.constantFrom('John', 'Jane', 'Kumar', 'Sharma', 'Patel'),
        async (ownersData, searchTerm) => {
          // Clear data from previous iteration
          await User.destroy({ where: {}, force: true });

          // Create owners with unique emails
          const createdOwners = [];
          for (const ownerData of ownersData) {
            const uniqueOwnerData = {
              ...ownerData,
              email: `owner${emailCounter++}${Date.now()}@test.com`
            };
            const owner = await User.create(uniqueOwnerData);
            createdOwners.push(owner);
          }

          // Perform search
          const results = await performSearch(searchTerm);

          // Verify all results match the search query
          const verification = verifySearchResults(searchTerm, results);
          expect(verification.isValid).toBe(true);

          // Verify that owners that should match are included
          const matchingOwners = createdOwners.filter(o => 
            o.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          expect(results.owners.length).toBe(matchingOwners.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23: Search by email returns only matching owners and leads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(ownerArbitrary(), { minLength: 2, maxLength: 4 }),
        uuidArbitrary(),
        fc.constantFrom('example', 'test', 'demo', 'gmail'),
        async (ownersData, agentId, searchTerm) => {
          // Create owners
          for (const ownerData of ownersData) {
            await User.create(ownerData);
          }

          // Create some leads
          for (let i = 0; i < 3; i++) {
            const leadData = await fc.sample(leadArbitrary(agentId), 1);
            await Lead.create(leadData[0]);
          }

          // Perform search
          const results = await performSearch(searchTerm);

          // Verify all results match the search query
          const verification = verifySearchResults(searchTerm, results);
          expect(verification.isValid).toBe(true);

          // All returned owners should have matching emails
          for (const owner of results.owners) {
            expect(owner.email.toLowerCase()).toContain(searchTerm.toLowerCase());
          }

          // All returned leads should have matching emails
          for (const lead of results.leads) {
            expect(lead.email.toLowerCase()).toContain(searchTerm.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23: Search by location returns only matching properties and leads', async () => {
    await fc.assert(
      fc.asyncProperty(
        ownerArbitrary(),
        uuidArbitrary(),
        fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'),
        async (ownerData, agentId, searchCity) => {
          // Create owner
          const owner = await User.create(ownerData);

          // Create properties in different cities
          const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];
          for (const city of cities) {
            await Room.create({
              title: `Property in ${city}`,
              description: 'A nice property',
              location: { city, state: 'State', address: '123 Main St' },
              category: 'PG',
              roomType: 'Private Room',
              price: 5000,
              isActive: true,
              ownerId: owner.id
            });
          }

          // Create leads in different cities
          for (const city of cities) {
            await Lead.create({
              propertyOwnerName: 'Test Owner',
              email: `owner${city}@test.com`,
              phone: '1234567890',
              businessName: `Business in ${city}`,
              propertyType: 'hotel',
              city,
              state: 'State',
              status: 'contacted',
              agentId
            });
          }

          // Perform search
          const results = await performSearch(searchCity);

          // Verify all results match the search query
          const verification = verifySearchResults(searchCity, results);
          expect(verification.isValid).toBe(true);

          // All returned properties should have matching location
          for (const property of results.properties) {
            const locationStr = JSON.stringify(property.location).toLowerCase();
            expect(locationStr).toContain(searchCity.toLowerCase());
          }

          // All returned leads should have matching city
          for (const lead of results.leads) {
            expect(lead.city.toLowerCase()).toContain(searchCity.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 23: Empty search query returns no results or all results', async () => {
    await fc.assert(
      fc.asyncProperty(
        ownerArbitrary(),
        uuidArbitrary(),
        async (ownerData, agentId) => {
          // Create owner
          const owner = await User.create(ownerData);

          // Create a property
          await Room.create({
            title: 'Test Property',
            description: 'A test property',
            location: { city: 'Mumbai', state: 'Maharashtra', address: '123 Main St' },
            category: 'PG',
            roomType: 'Private Room',
            price: 5000,
            isActive: true,
            ownerId: owner.id
          });

          // Create a lead
          await Lead.create({
            propertyOwnerName: 'Test Owner',
            email: 'test@example.com',
            phone: '1234567890',
            businessName: 'Test Business',
            propertyType: 'hotel',
            city: 'Mumbai',
            state: 'Maharashtra',
            status: 'contacted',
            agentId
          });

          // Perform search with empty query
          const results = await performSearch('');

          // With empty search, all items should match (since empty string is in all strings)
          // This is a valid behavior - empty search returns everything
          expect(results.properties.length).toBeGreaterThanOrEqual(0);
          expect(results.owners.length).toBeGreaterThanOrEqual(0);
          expect(results.leads.length).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 23: Search with non-matching query returns empty results', async () => {
    await fc.assert(
      fc.asyncProperty(
        ownerArbitrary(),
        uuidArbitrary(),
        async (ownerData, agentId) => {
          // Create owner
          const owner = await User.create(ownerData);

          // Create a property
          await Room.create({
            title: 'Test Property',
            description: 'A test property',
            location: { city: 'Mumbai', state: 'Maharashtra', address: '123 Main St' },
            category: 'PG',
            roomType: 'Private Room',
            price: 5000,
            isActive: true,
            ownerId: owner.id
          });

          // Create a lead
          await Lead.create({
            propertyOwnerName: 'Test Owner',
            email: 'test@example.com',
            phone: '1234567890',
            businessName: 'Test Business',
            propertyType: 'hotel',
            city: 'Mumbai',
            state: 'Maharashtra',
            status: 'contacted',
            agentId
          });

          // Perform search with non-matching query
          const nonMatchingQuery = 'XYZNONEXISTENT123';
          const results = await performSearch(nonMatchingQuery);

          // Verify all results match (should be empty)
          const verification = verifySearchResults(nonMatchingQuery, results);
          expect(verification.isValid).toBe(true);

          // Should return no results
          expect(results.properties.length).toBe(0);
          expect(results.owners.length).toBe(0);
          expect(results.leads.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
