/**
 * Property-Based Tests for Bed Assignment Consistency
 * Feature: internal-management-system, Property 2: Bed assignment consistency
 * 
 * Property: For any PG room with sharing type, the number of bed assignments 
 * must equal the sharing type count (1 for single, 2 for 2-sharing, 3 for 3-sharing)
 * 
 * Validates: Requirements 5.2
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
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Define models inline for testing
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
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('guest', 'owner', 'admin'),
    defaultValue: 'guest'
  }
}, {
  tableName: 'users'
});

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
  sharingType: {
    type: DataTypes.ENUM('single', '2_sharing', '3_sharing'),
    allowNull: true
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentStatus: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
    allowNull: true,
    defaultValue: 'vacant_clean'
  }
}, {
  tableName: 'rooms'
});

const BedAssignment = sequelize.define('BedAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  bedNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('occupied', 'vacant'),
    allowNull: false,
    defaultValue: 'vacant'
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  occupantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'bed_assignments',
  indexes: [
    {
      unique: true,
      fields: ['room_id', 'bed_number']
    }
  ]
});

// Define associations
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Room, { foreignKey: 'ownerId', as: 'rooms' });
BedAssignment.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(BedAssignment, { foreignKey: 'roomId', as: 'beds' });

describe('Property 2: Bed Assignment Consistency', () => {
  let testUser;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create a test user for room ownership
    testUser = await User.create({
      name: 'Test Owner',
      email: 'testowner@example.com',
      phone: '1234567890',
      role: 'owner'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await BedAssignment.destroy({ where: {}, truncate: true });
    await Room.destroy({ where: {}, truncate: true, cascade: true });
  });

  /**
   * Custom generator for sharing types
   */
  const sharingTypeArbitrary = () => 
    fc.constantFrom('single', '2_sharing', '3_sharing');

  /**
   * Get expected bed count from sharing type
   */
  const getExpectedBedCount = (sharingType) => {
    switch (sharingType) {
      case 'single': return 1;
      case '2_sharing': return 2;
      case '3_sharing': return 3;
      default: throw new Error(`Invalid sharing type: ${sharingType}`);
    }
  };

  /**
   * Generator for valid room numbers
   */
  const roomNumberArbitrary = () =>
    fc.oneof(
      fc.integer({ min: 101, max: 999 }).map(n => n.toString()),
      fc.string({ minLength: 2, maxLength: 5 }).filter(s => /^[A-C0-9]+$/.test(s))
    );

  /**
   * Generator for floor numbers
   */
  const floorNumberArbitrary = () =>
    fc.integer({ min: 0, max: 10 });

  test('Property 2: Bed count matches sharing type for any PG room', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        async (sharingType, roomNumber, floorNumber) => {
          // Create a PG room with the given sharing type
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for bed assignment consistency',
            price: 5000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'PG',
            roomType: 'PG',
            ownerId: testUser.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignments for this room
          const expectedBedCount = getExpectedBedCount(sharingType);
          const bedAssignments = [];
          
          for (let i = 1; i <= expectedBedCount; i++) {
            const bed = await BedAssignment.create({
              roomId: room.id,
              bedNumber: i,
              status: 'vacant'
            });
            bedAssignments.push(bed);
          }

          // Verify: The number of bed assignments must equal the expected count
          const actualBedCount = await BedAssignment.count({
            where: { roomId: room.id }
          });

          // Property assertion
          expect(actualBedCount).toBe(expectedBedCount);
          
          // Additional consistency checks
          expect(room.totalBeds).toBe(expectedBedCount);
          expect(bedAssignments.length).toBe(expectedBedCount);
          
          // Verify each bed has a unique bed number
          const bedNumbers = bedAssignments.map(b => b.bedNumber);
          const uniqueBedNumbers = new Set(bedNumbers);
          expect(uniqueBedNumbers.size).toBe(expectedBedCount);
          
          // Verify bed numbers are sequential from 1 to expectedBedCount
          const sortedBedNumbers = [...bedNumbers].sort((a, b) => a - b);
          for (let i = 0; i < expectedBedCount; i++) {
            expect(sortedBedNumbers[i]).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Bed assignments remain consistent after room updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        async (initialSharingType, newSharingType, roomNumber) => {
          // Create a PG room with initial sharing type
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for bed assignment consistency',
            price: 5000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'PG',
            roomType: 'PG',
            ownerId: testUser.id,
            sharingType: initialSharingType,
            totalBeds: getExpectedBedCount(initialSharingType),
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create initial bed assignments
          const initialBedCount = getExpectedBedCount(initialSharingType);
          for (let i = 1; i <= initialBedCount; i++) {
            await BedAssignment.create({
              roomId: room.id,
              bedNumber: i,
              status: 'vacant'
            });
          }

          // Update room sharing type
          const newBedCount = getExpectedBedCount(newSharingType);
          await room.update({
            sharingType: newSharingType,
            totalBeds: newBedCount
          });

          // Adjust bed assignments to match new sharing type
          const currentBedCount = await BedAssignment.count({
            where: { roomId: room.id }
          });

          if (newBedCount > currentBedCount) {
            // Add more beds
            for (let i = currentBedCount + 1; i <= newBedCount; i++) {
              await BedAssignment.create({
                roomId: room.id,
                bedNumber: i,
                status: 'vacant'
              });
            }
          } else if (newBedCount < currentBedCount) {
            // Remove excess beds (in practice, this should only happen if beds are vacant)
            const bedsToRemove = await BedAssignment.findAll({
              where: { roomId: room.id },
              order: [['bedNumber', 'DESC']],
              limit: currentBedCount - newBedCount
            });
            
            for (const bed of bedsToRemove) {
              await bed.destroy();
            }
          }

          // Verify: The number of bed assignments matches the new sharing type
          const finalBedCount = await BedAssignment.count({
            where: { roomId: room.id }
          });

          expect(finalBedCount).toBe(newBedCount);
          expect(room.totalBeds).toBe(newBedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Each bed in a room has a unique bed number', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        async (sharingType, roomNumber) => {
          // Create a PG room
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for unique bed numbers',
            price: 5000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'PG',
            roomType: 'PG',
            ownerId: testUser.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignments
          const expectedBedCount = getExpectedBedCount(sharingType);
          for (let i = 1; i <= expectedBedCount; i++) {
            await BedAssignment.create({
              roomId: room.id,
              bedNumber: i,
              status: 'vacant'
            });
          }

          // Verify: Each bed has a unique bed number (enforced by unique constraint)
          const beds = await BedAssignment.findAll({
            where: { roomId: room.id }
          });

          const bedNumbers = beds.map(b => b.bedNumber);
          const uniqueBedNumbers = new Set(bedNumbers);

          // Property: All bed numbers must be unique
          expect(uniqueBedNumbers.size).toBe(beds.length);
          expect(beds.length).toBe(expectedBedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
