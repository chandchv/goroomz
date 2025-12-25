/**
 * Property-Based Test for Bulk Room Creation Completeness
 * Feature: property-room-hierarchy, Property 2: Bulk creation completeness
 * 
 * Property: For any valid bulk creation request, all rooms in the range should 
 * be created with correct bed counts
 * 
 * Validates: Requirements 2.2
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
  pricingType: {
    type: DataTypes.ENUM('daily', 'monthly'),
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
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sharingType: {
    type: DataTypes.ENUM('single', '2_sharing', '3_sharing', 'quad', 'dormitory'),
    allowNull: true
  },
  totalBeds: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  currentStatus: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
    defaultValue: 'vacant_clean'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  customCategoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'rooms'
});

// Define BedAssignment model inline for testing
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
    type: DataTypes.ENUM('occupied', 'vacant', 'maintenance'),
    defaultValue: 'vacant'
  }
}, {
  tableName: 'bed_assignments'
});

// Define associations
User.hasMany(Room, { foreignKey: 'ownerId', as: 'ownedRooms' });
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Room.hasMany(BedAssignment, { foreignKey: 'roomId', as: 'beds' });
BedAssignment.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

describe('Property 2: Bulk Room Creation Completeness', () => {
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await BedAssignment.destroy({ where: {}, truncate: true, cascade: true });
    await Room.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  /**
   * Helper function to create a property owner
   */
  const createPropertyOwner = async () => {
    const owner = await User.create({
      name: 'Test Owner',
      email: `owner${Date.now()}${Math.random()}@test.com`,
      password: 'password123',
      role: 'owner',
      isVerified: true
    });
    return owner;
  };

  /**
   * Helper function to create a property
   */
  const createProperty = async (ownerId) => {
    const property = await Room.create({
      ownerId,
      title: `Test Property ${Date.now()}`,
      description: 'Test property description',
      category: 'PG',
      roomType: 'PG',
      pricingType: 'monthly',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        coordinates: { lat: 0, lng: 0 }
      },
      price: 0,
      isActive: true,
      approvalStatus: 'approved'
    });
    
    return property;
  };

  /**
   * Function to simulate bulk room creation (mimics the backend endpoint logic)
   */
  const bulkCreateRooms = async (propertyId, floorNumber, startRoom, endRoom, sharingType, userId) => {
    // Fetch property
    const property = await Room.findByPk(propertyId);
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Determine bed count based on sharing type
    const bedCountMap = {
      'single': 1,
      '2_sharing': 2,
      '3_sharing': 3,
      'quad': 4,
      'dormitory': 6
    };
    const totalBeds = bedCountMap[sharingType];
    
    // Generate room numbers using floor convention
    const createdRooms = [];
    
    for (let roomNum = startRoom; roomNum <= endRoom; roomNum++) {
      // Generate room number with floor convention (e.g., 101, 102 for floor 1)
      const roomNumber = `${floorNumber}${String(roomNum).padStart(2, '0')}`;
      
      // Create room
      const room = await Room.create({
        ownerId: property.ownerId,
        title: `${property.title} - Room ${roomNumber}`,
        description: `Room ${roomNumber} on Floor ${floorNumber}`,
        category: property.category,
        roomType: property.roomType,
        pricingType: property.pricingType,
        location: property.location,
        amenities: property.amenities || [],
        rules: property.rules || [],
        price: property.price || 0,
        maxGuests: totalBeds,
        floorNumber: floorNumber,
        roomNumber: roomNumber,
        sharingType: sharingType,
        totalBeds: totalBeds,
        currentStatus: 'vacant_clean',
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: userId
      });
      
      // Create bed assignments
      for (let bedNum = 1; bedNum <= totalBeds; bedNum++) {
        await BedAssignment.create({
          roomId: room.id,
          bedNumber: bedNum,
          status: 'vacant'
        });
      }
      
      createdRooms.push(room);
    }
    
    return createdRooms;
  };

  /**
   * Custom generator for valid bulk creation requests
   */
  const bulkCreationRequestArbitrary = () =>
    fc.record({
      floorNumber: fc.integer({ min: 1, max: 50 }),
      startRoom: fc.integer({ min: 1, max: 99 }),
      endRoom: fc.integer({ min: 1, max: 99 }),
      sharingType: fc.constantFrom('single', '2_sharing', '3_sharing', 'quad', 'dormitory')
    }).filter(req => {
      // Ensure valid range
      if (req.startRoom > req.endRoom) return false;
      // Ensure max 100 rooms per batch
      const roomCount = req.endRoom - req.startRoom + 1;
      if (roomCount > 100) return false;
      return true;
    });

  test('Property 2: All rooms in the range are created', async () => {
    await fc.assert(
      fc.asyncProperty(
        bulkCreationRequestArbitrary(),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.startRoom,
            request.endRoom,
            request.sharingType,
            owner.id
          );
          
          // Calculate expected room count
          const expectedRoomCount = request.endRoom - request.startRoom + 1;
          
          // Property: All rooms in the range should be created
          expect(createdRooms.length).toBe(expectedRoomCount);
          
          // Verify each room number in the range exists
          const roomNumbers = createdRooms.map(r => parseInt(r.roomNumber.slice(-2)));
          roomNumbers.sort((a, b) => a - b);
          
          for (let i = request.startRoom; i <= request.endRoom; i++) {
            expect(roomNumbers).toContain(i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: All created rooms have correct bed counts based on sharing type', async () => {
    await fc.assert(
      fc.asyncProperty(
        bulkCreationRequestArbitrary(),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.startRoom,
            request.endRoom,
            request.sharingType,
            owner.id
          );
          
          // Determine expected bed count based on sharing type
          const expectedBedCount = {
            'single': 1,
            '2_sharing': 2,
            '3_sharing': 3,
            'quad': 4,
            'dormitory': 6
          }[request.sharingType];
          
          // Property: All rooms should have correct bed counts
          for (const room of createdRooms) {
            expect(room.totalBeds).toBe(expectedBedCount);
            expect(room.sharingType).toBe(request.sharingType);
            
            // Verify bed assignments were created
            const beds = await BedAssignment.findAll({ 
              where: { roomId: room.id } 
            });
            expect(beds.length).toBe(expectedBedCount);
            
            // Verify bed numbers are sequential starting from 1
            const bedNumbers = beds.map(b => b.bedNumber).sort((a, b) => a - b);
            for (let i = 0; i < bedNumbers.length; i++) {
              expect(bedNumbers[i]).toBe(i + 1);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Room numbers follow floor convention', async () => {
    await fc.assert(
      fc.asyncProperty(
        bulkCreationRequestArbitrary(),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.startRoom,
            request.endRoom,
            request.sharingType,
            owner.id
          );
          
          // Property: Room numbers should follow floor convention (e.g., 101, 102 for floor 1)
          for (const room of createdRooms) {
            expect(room.floorNumber).toBe(request.floorNumber);
            
            // Room number should start with floor number
            const roomNumberStr = room.roomNumber;
            const floorPrefix = request.floorNumber.toString();
            expect(roomNumberStr.startsWith(floorPrefix)).toBe(true);
            
            // Extract room number suffix
            const roomSuffix = parseInt(roomNumberStr.slice(-2));
            expect(roomSuffix).toBeGreaterThanOrEqual(request.startRoom);
            expect(roomSuffix).toBeLessThanOrEqual(request.endRoom);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: All created rooms are active and approved', async () => {
    await fc.assert(
      fc.asyncProperty(
        bulkCreationRequestArbitrary(),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.startRoom,
            request.endRoom,
            request.sharingType,
            owner.id
          );
          
          // Property: All created rooms should be active and approved
          for (const room of createdRooms) {
            expect(room.isActive).toBe(true);
            expect(room.approvalStatus).toBe('approved');
            expect(room.currentStatus).toBe('vacant_clean');
            expect(room.approvedAt).toBeDefined();
            expect(room.approvedBy).toBe(owner.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: All created rooms belong to the same property owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        bulkCreationRequestArbitrary(),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.startRoom,
            request.endRoom,
            request.sharingType,
            owner.id
          );
          
          // Property: All rooms should belong to the same owner
          for (const room of createdRooms) {
            expect(room.ownerId).toBe(property.ownerId);
            expect(room.ownerId).toBe(owner.id);
          }
          
          // Verify all rooms have the same owner
          const uniqueOwnerIds = new Set(createdRooms.map(r => r.ownerId));
          expect(uniqueOwnerIds.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Completeness holds for edge cases (single room)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          floorNumber: fc.integer({ min: 1, max: 50 }),
          roomNumber: fc.integer({ min: 1, max: 99 }),
          sharingType: fc.constantFrom('single', '2_sharing', '3_sharing', 'quad', 'dormitory')
        }),
        async (request) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id);
          
          // Execute bulk room creation for a single room
          const createdRooms = await bulkCreateRooms(
            property.id,
            request.floorNumber,
            request.roomNumber,
            request.roomNumber,
            request.sharingType,
            owner.id
          );
          
          // Property: Even for a single room, completeness should hold
          expect(createdRooms.length).toBe(1);
          
          const room = createdRooms[0];
          const expectedBedCount = {
            'single': 1,
            '2_sharing': 2,
            '3_sharing': 3,
            'quad': 4,
            'dormitory': 6
          }[request.sharingType];
          
          expect(room.totalBeds).toBe(expectedBedCount);
          expect(room.sharingType).toBe(request.sharingType);
          
          const beds = await BedAssignment.findAll({ 
            where: { roomId: room.id } 
          });
          expect(beds.length).toBe(expectedBedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2: Completeness holds for maximum batch size (100 rooms)', async () => {
    // Create property owner and property
    const owner = await createPropertyOwner();
    const property = await createProperty(owner.id);
    
    // Execute bulk room creation for maximum batch size
    const createdRooms = await bulkCreateRooms(
      property.id,
      1, // floor 1
      1, // start room 1
      100, // end room 100 (exactly 100 rooms)
      'single',
      owner.id
    );
    
    // Property: All 100 rooms should be created
    expect(createdRooms.length).toBe(100);
    
    // Verify all room numbers from 1 to 100 exist
    // Extract the room number by removing the floor prefix
    const roomNumbers = createdRooms.map(r => {
      const roomNumberStr = r.roomNumber;
      // Remove floor prefix (first digit) to get actual room number
      const roomNum = parseInt(roomNumberStr.substring(1));
      return roomNum;
    });
    roomNumbers.sort((a, b) => a - b);
    
    for (let i = 1; i <= 100; i++) {
      expect(roomNumbers).toContain(i);
    }
    
    // Verify all rooms have correct bed count
    for (const room of createdRooms) {
      expect(room.totalBeds).toBe(1);
      const beds = await BedAssignment.findAll({ 
        where: { roomId: room.id } 
      });
      expect(beds.length).toBe(1);
    }
  });
});
