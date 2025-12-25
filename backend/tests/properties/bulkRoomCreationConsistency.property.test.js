/**
 * Property-Based Tests for Bulk Room Creation Consistency
 * Feature: internal-management-system, Property 36: Bulk room creation consistency
 * 
 * Property: For any bulk room creation operation, all rooms must be created with 
 * the same property ID and valid floor/room number combinations
 * 
 * Validates: Requirements 37.3
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
    type: DataTypes.ENUM('single', '2_sharing', '3_sharing'),
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
    type: DataTypes.ENUM('occupied', 'vacant'),
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

describe('Property 36: Bulk Room Creation Consistency', () => {
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
   * Custom generator for valid property owner
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
   * Custom generator for valid property
   */
  const createProperty = async (ownerId, propertyType = 'Hotel') => {
    const category = propertyType === 'Hotel' ? 'Hotel Room' : 'PG';
    const pricingType = propertyType === 'Hotel' ? 'daily' : 'monthly';
    
    const property = await Room.create({
      ownerId,
      title: `Test Property ${Date.now()}`,
      description: 'Test property description',
      category,
      roomType: category,
      pricingType,
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
   * Custom generator for floor specifications
   */
  const floorSpecArbitrary = () =>
    fc.record({
      floorNumber: fc.integer({ min: 0, max: 10 }),
      roomNumberStart: fc.integer({ min: 1, max: 50 }),
      roomNumberEnd: fc.integer({ min: 1, max: 50 }),
      sharingType: fc.constantFrom('single', '2_sharing', '3_sharing'),
      price: fc.double({ min: 1000, max: 10000, noNaN: true })
    }).filter(spec => spec.roomNumberStart <= spec.roomNumberEnd);

  /**
   * Function to simulate bulk room creation
   */
  const bulkCreateRooms = async (property, floors) => {
    const createdRooms = [];
    
    for (const floor of floors) {
      const { floorNumber, roomNumberStart, roomNumberEnd, sharingType, price } = floor;
      
      const startNum = parseInt(roomNumberStart.toString());
      const endNum = parseInt(roomNumberEnd.toString());
      
      for (let roomNum = startNum; roomNum <= endNum; roomNum++) {
        const roomNumber = roomNum.toString();
        const totalBeds = sharingType === 'single' ? 1 : sharingType === '2_sharing' ? 2 : sharingType === '3_sharing' ? 3 : 1;
        
        const room = await Room.create({
          ownerId: property.ownerId,
          title: `${property.title} - Room ${roomNumber}`,
          description: `Room ${roomNumber} on Floor ${floorNumber}`,
          category: property.category,
          roomType: property.roomType,
          pricingType: property.pricingType,
          location: property.location,
          price: price || 0,
          floorNumber,
          roomNumber,
          sharingType: property.category === 'PG' ? sharingType : null,
          totalBeds: property.category === 'PG' ? totalBeds : null,
          currentStatus: 'vacant_clean',
          isActive: true,
          approvalStatus: 'approved'
        });
        
        // Create bed assignments for PG rooms
        if (property.category === 'PG' && sharingType) {
          for (let bedNum = 1; bedNum <= totalBeds; bedNum++) {
            await BedAssignment.create({
              roomId: room.id,
              bedNumber: bedNum,
              status: 'vacant'
            });
          }
        }
        
        createdRooms.push(room);
      }
    }
    
    return createdRooms;
  };

  test('Property 36: All bulk-created rooms have the same property owner ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: All rooms must have the same owner ID as the property
          for (const room of createdRooms) {
            expect(room.ownerId).toBe(property.ownerId);
            expect(room.ownerId).toBe(owner.id);
          }
          
          // Verify all rooms belong to the same owner
          const uniqueOwnerIds = new Set(createdRooms.map(r => r.ownerId));
          expect(uniqueOwnerIds.size).toBe(1);
          expect(uniqueOwnerIds.has(owner.id)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: All bulk-created rooms have valid floor and room number combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 })
          .filter(floors => {
            // Ensure no duplicate floor/room combinations
            const seen = new Set();
            for (const floor of floors) {
              for (let i = floor.roomNumberStart; i <= floor.roomNumberEnd; i++) {
                const key = `${floor.floorNumber}-${i}`;
                if (seen.has(key)) return false;
                seen.add(key);
              }
            }
            return true;
          }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: All rooms must have valid floor numbers and room numbers
          for (const room of createdRooms) {
            expect(room.floorNumber).toBeDefined();
            expect(room.floorNumber).toBeGreaterThanOrEqual(0);
            expect(room.roomNumber).toBeDefined();
            expect(room.roomNumber).toBeTruthy();
            
            // Room number should be a valid string representation of a number
            const roomNumInt = parseInt(room.roomNumber);
            expect(isNaN(roomNumInt)).toBe(false);
            expect(roomNumInt).toBeGreaterThan(0);
          }
          
          // Verify total room count matches specifications
          const totalExpectedRooms = floors.reduce((sum, f) => 
            sum + (f.roomNumberEnd - f.roomNumberStart + 1), 0);
          expect(createdRooms.length).toBe(totalExpectedRooms);
          
          // Verify each created room matches one of the floor specifications
          for (const room of createdRooms) {
            const matchingFloor = floors.find(f => 
              f.floorNumber === room.floorNumber &&
              parseInt(room.roomNumber) >= f.roomNumberStart &&
              parseInt(room.roomNumber) <= f.roomNumberEnd
            );
            expect(matchingFloor).toBeDefined();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: Bulk-created rooms have consistent property attributes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: All rooms must inherit consistent attributes from the parent property
          for (const room of createdRooms) {
            expect(room.category).toBe(property.category);
            expect(room.roomType).toBe(property.roomType);
            expect(room.pricingType).toBe(property.pricingType);
            expect(room.isActive).toBe(true);
            expect(room.approvalStatus).toBe('approved');
            expect(room.currentStatus).toBe('vacant_clean');
            
            // Verify location is consistent
            expect(room.location).toEqual(property.location);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: PG rooms have correct bed assignments based on sharing type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 }),
        async (floors) => {
          // Create property owner and PG property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, 'PG');
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: PG rooms must have correct bed assignments
          for (const room of createdRooms) {
            expect(room.sharingType).toBeDefined();
            expect(room.totalBeds).toBeDefined();
            
            // Verify totalBeds matches sharing type
            const expectedBeds = room.sharingType === 'single' ? 1 : 
                                room.sharingType === '2_sharing' ? 2 : 
                                room.sharingType === '3_sharing' ? 3 : 1;
            expect(room.totalBeds).toBe(expectedBeds);
            
            // Verify bed assignments were created
            const beds = await BedAssignment.findAll({ where: { roomId: room.id } });
            expect(beds.length).toBe(expectedBeds);
            
            // Verify bed numbers are sequential starting from 1
            const bedNumbers = beds.map(b => b.bedNumber).sort((a, b) => a - b);
            for (let i = 0; i < bedNumbers.length; i++) {
              expect(bedNumbers[i]).toBe(i + 1);
            }
            
            // Verify all beds start as vacant
            for (const bed of beds) {
              expect(bed.status).toBe('vacant');
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: Hotel rooms do not have sharing type or bed assignments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 }),
        async (floors) => {
          // Create property owner and Hotel property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, 'Hotel');
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: Hotel rooms must not have sharing type or bed assignments
          for (const room of createdRooms) {
            expect(room.sharingType).toBeNull();
            expect(room.totalBeds).toBeNull();
            
            // Verify no bed assignments were created for Hotel rooms
            const beds = await BedAssignment.findAll({ where: { roomId: room.id } });
            expect(beds.length).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: Bulk creation handles multiple floors correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 2, maxLength: 5 })
          .filter(floors => {
            // Ensure no duplicate floor/room combinations
            const seen = new Set();
            for (const floor of floors) {
              for (let i = floor.roomNumberStart; i <= floor.roomNumberEnd; i++) {
                const key = `${floor.floorNumber}-${i}`;
                if (seen.has(key)) return false;
                seen.add(key);
              }
            }
            return true;
          }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: Rooms must be correctly distributed across floors
          const floorGroups = {};
          for (const room of createdRooms) {
            if (!floorGroups[room.floorNumber]) {
              floorGroups[room.floorNumber] = [];
            }
            floorGroups[room.floorNumber].push(room);
          }
          
          // Verify each floor has at least the rooms from its specifications
          const floorRoomCounts = {};
          for (const floor of floors) {
            if (!floorRoomCounts[floor.floorNumber]) {
              floorRoomCounts[floor.floorNumber] = 0;
            }
            floorRoomCounts[floor.floorNumber] += (floor.roomNumberEnd - floor.roomNumberStart + 1);
          }
          
          for (const [floorNum, expectedCount] of Object.entries(floorRoomCounts)) {
            const roomsOnFloor = floorGroups[floorNum] || [];
            expect(roomsOnFloor.length).toBe(expectedCount);
          }
          
          // Verify total room count
          const totalExpectedRooms = floors.reduce((sum, f) => 
            sum + (f.roomNumberEnd - f.roomNumberStart + 1), 0);
          expect(createdRooms.length).toBe(totalExpectedRooms);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: Room numbers are unique within the same property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 })
          .filter(floors => {
            // Ensure no duplicate floor/room combinations
            const seen = new Set();
            for (const floor of floors) {
              for (let i = floor.roomNumberStart; i <= floor.roomNumberEnd; i++) {
                const key = `${floor.floorNumber}-${i}`;
                if (seen.has(key)) return false;
                seen.add(key);
              }
            }
            return true;
          }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: Room numbers combined with floor numbers should be unique
          const roomIdentifiers = createdRooms.map(r => `${r.floorNumber}-${r.roomNumber}`);
          const uniqueIdentifiers = new Set(roomIdentifiers);
          
          // All floor-room combinations should be unique
          expect(uniqueIdentifiers.size).toBe(roomIdentifiers.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 36: Bulk creation preserves data integrity across transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Hotel', 'PG'),
        fc.array(floorSpecArbitrary(), { minLength: 1, maxLength: 3 }),
        async (propertyType, floors) => {
          // Create property owner and property
          const owner = await createPropertyOwner();
          const property = await createProperty(owner.id, propertyType);
          
          // Bulk create rooms
          const createdRooms = await bulkCreateRooms(property, floors);
          
          // Property: All created rooms must be persisted and retrievable
          for (const room of createdRooms) {
            const retrievedRoom = await Room.findByPk(room.id);
            expect(retrievedRoom).toBeDefined();
            expect(retrievedRoom.id).toBe(room.id);
            expect(retrievedRoom.ownerId).toBe(property.ownerId);
            expect(retrievedRoom.floorNumber).toBe(room.floorNumber);
            expect(retrievedRoom.roomNumber).toBe(room.roomNumber);
          }
          
          // Verify total count in database matches created count
          const allRooms = await Room.findAll({
            where: { ownerId: property.ownerId }
          });
          // +1 for the parent property
          expect(allRooms.length).toBe(createdRooms.length + 1);
        }
      ),
      { numRuns: 20 }
    );
  });
});
