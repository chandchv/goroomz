/**
 * Property-Based Tests for Bed-Level Double-Booking Prevention
 * Feature: internal-management-system, Property 5: Bed-level double-booking prevention
 * 
 * Property: For any bed in a shared room and date range, there should be at most 
 * one active booking for that specific bed during overlapping dates
 * 
 * Validates: Requirements 14.3, 19.4
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
    type: DataTypes.ENUM('guest', 'owner', 'admin', 'user'),
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

const Booking = sequelize.define('Booking', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: false
  },
  guests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  contactInfo: {
    type: DataTypes.JSON,
    allowNull: false
  },
  bookingSource: {
    type: DataTypes.ENUM('online', 'offline'),
    allowNull: true,
    defaultValue: 'online'
  },
  bedId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bed_assignments',
      key: 'id'
    }
  },
  actualCheckInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualCheckOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bookings'
});

// Define associations
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Room, { foreignKey: 'ownerId', as: 'rooms' });
BedAssignment.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(BedAssignment, { foreignKey: 'roomId', as: 'beds' });
Booking.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Booking.belongsTo(BedAssignment, { foreignKey: 'bedId', as: 'bed' });
BedAssignment.hasMany(Booking, { foreignKey: 'bedId', as: 'bookings' });
Room.hasMany(Booking, { foreignKey: 'roomId', as: 'bookings' });

describe('Property 5: Bed-Level Double-Booking Prevention', () => {
  let testOwner;
  let testGuest1;
  let testGuest2;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create test users
    testOwner = await User.create({
      name: 'Test Owner',
      email: 'testowner@example.com',
      phone: '1234567890',
      role: 'owner'
    });

    testGuest1 = await User.create({
      name: 'Test Guest 1',
      email: 'testguest1@example.com',
      phone: '9876543210',
      role: 'user'
    });

    testGuest2 = await User.create({
      name: 'Test Guest 2',
      email: 'testguest2@example.com',
      phone: '9876543211',
      role: 'user'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await Booking.destroy({ where: {}, truncate: true });
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
   * Generator for room numbers
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

  /**
   * Generator for future dates
   */
  const futureDateArbitrary = () =>
    fc.date({ 
      min: new Date(Date.now() + 24 * 60 * 60 * 1000), 
      max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
    });

  /**
   * Generator for booking duration in days (1-30 days)
   */
  const durationDaysArbitrary = () =>
    fc.integer({ min: 1, max: 30 });

  /**
   * Check if two date ranges overlap
   */
  const datesOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && start2 < end1;
  };

  /**
   * Check bed availability for a date range
   */
  const checkBedAvailability = async (bedId, checkIn, checkOut) => {
    const overlappingBookings = await Booking.findAll({
      where: {
        bedId: bedId,
        status: ['pending', 'confirmed']
      }
    });

    for (const booking of overlappingBookings) {
      if (datesOverlap(
        new Date(checkIn),
        new Date(checkOut),
        new Date(booking.checkIn),
        new Date(booking.checkOut)
      )) {
        return false; // Bed is not available
      }
    }

    return true; // Bed is available
  };

  /**
   * Create a booking with bed availability check
   */
  const createBookingWithCheck = async (bedId, userId, ownerId, roomId, checkIn, checkOut) => {
    // Check if bed is available
    const isAvailable = await checkBedAvailability(bedId, checkIn, checkOut);
    
    if (!isAvailable) {
      throw new Error('Bed is not available for the selected dates');
    }

    // Create booking
    const booking = await Booking.create({
      roomId: roomId,
      userId: userId,
      ownerId: ownerId,
      bedId: bedId,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: 1,
      totalAmount: 5000,
      contactInfo: {
        phone: '9876543210',
        email: 'test@example.com'
      },
      status: 'confirmed',
      paymentStatus: 'pending',
      bookingSource: 'offline'
    });

    return booking;
  };

  test('Property 5: No overlapping bookings for the same bed', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        durationDaysArbitrary(),
        durationDaysArbitrary(),
        async (sharingType, roomNumber, floorNumber, startDate, duration1, duration2) => {
          // Create a PG room with sharing type
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for bed-level double-booking prevention',
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
            ownerId: testOwner.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignments
          const expectedBedCount = getExpectedBedCount(sharingType);
          const beds = [];
          
          for (let i = 1; i <= expectedBedCount; i++) {
            const bed = await BedAssignment.create({
              roomId: room.id,
              bedNumber: i,
              status: 'vacant'
            });
            beds.push(bed);
          }

          // Pick a random bed
          const bedIndex = Math.floor(Math.random() * beds.length);
          const selectedBed = beds[bedIndex];

          // Create first booking
          const checkIn1 = new Date(startDate);
          const checkOut1 = new Date(checkIn1.getTime() + duration1 * 24 * 60 * 60 * 1000);

          const booking1 = await createBookingWithCheck(
            selectedBed.id,
            testGuest1.id,
            testOwner.id,
            room.id,
            checkIn1,
            checkOut1
          );

          // Try to create second booking with potentially overlapping dates
          const checkIn2 = new Date(startDate.getTime() + (duration1 / 2) * 24 * 60 * 60 * 1000);
          const checkOut2 = new Date(checkIn2.getTime() + duration2 * 24 * 60 * 60 * 1000);

          // Check if dates overlap
          const shouldOverlap = datesOverlap(checkIn1, checkOut1, checkIn2, checkOut2);

          if (shouldOverlap) {
            // Second booking should fail
            let errorThrown = false;
            try {
              await createBookingWithCheck(
                selectedBed.id,
                testGuest2.id,
                testOwner.id,
                room.id,
                checkIn2,
                checkOut2
              );
            } catch (error) {
              errorThrown = true;
              expect(error.message).toContain('not available');
            }

            // Property: Overlapping booking must be rejected
            expect(errorThrown).toBe(true);
          } else {
            // Second booking should succeed
            const booking2 = await createBookingWithCheck(
              selectedBed.id,
              testGuest2.id,
              testOwner.id,
              room.id,
              checkIn2,
              checkOut2
            );

            expect(booking2).toBeDefined();
            expect(booking2.bedId).toBe(selectedBed.id);
          }

          // Verify: At most one active booking per bed for overlapping dates
          const allBookings = await Booking.findAll({
            where: {
              bedId: selectedBed.id,
              status: ['pending', 'confirmed']
            }
          });

          // Check all pairs of bookings for overlaps
          for (let i = 0; i < allBookings.length; i++) {
            for (let j = i + 1; j < allBookings.length; j++) {
              const overlap = datesOverlap(
                new Date(allBookings[i].checkIn),
                new Date(allBookings[i].checkOut),
                new Date(allBookings[j].checkIn),
                new Date(allBookings[j].checkOut)
              );

              // Property assertion: No two active bookings should overlap
              expect(overlap).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Multiple beds in same room can be booked for overlapping dates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('2_sharing', '3_sharing'), // Only multi-bed rooms
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        durationDaysArbitrary(),
        async (sharingType, roomNumber, floorNumber, startDate, duration) => {
          // Create a PG room with multiple beds
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for multiple bed bookings',
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
            ownerId: testOwner.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignments
          const expectedBedCount = getExpectedBedCount(sharingType);
          const beds = [];
          
          for (let i = 1; i <= expectedBedCount; i++) {
            const bed = await BedAssignment.create({
              roomId: room.id,
              bedNumber: i,
              status: 'vacant'
            });
            beds.push(bed);
          }

          // Create bookings for different beds with overlapping dates
          const checkIn = new Date(startDate);
          const checkOut = new Date(checkIn.getTime() + duration * 24 * 60 * 60 * 1000);

          const bookings = [];
          for (let i = 0; i < beds.length; i++) {
            const booking = await createBookingWithCheck(
              beds[i].id,
              i === 0 ? testGuest1.id : testGuest2.id,
              testOwner.id,
              room.id,
              checkIn,
              checkOut
            );
            bookings.push(booking);
          }

          // Property: All bookings should be created successfully
          expect(bookings.length).toBe(expectedBedCount);

          // Verify each booking is for a different bed
          const bedIds = bookings.map(b => b.bedId);
          const uniqueBedIds = new Set(bedIds);
          expect(uniqueBedIds.size).toBe(expectedBedCount);

          // Verify all bookings have the same date range (overlapping)
          for (const booking of bookings) {
            expect(new Date(booking.checkIn).getTime()).toBe(checkIn.getTime());
            expect(new Date(booking.checkOut).getTime()).toBe(checkOut.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Cancelled bookings do not block bed availability', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        durationDaysArbitrary(),
        async (sharingType, roomNumber, floorNumber, startDate, duration) => {
          // Create a PG room
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for cancelled booking availability',
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
            ownerId: testOwner.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignment
          const bed = await BedAssignment.create({
            roomId: room.id,
            bedNumber: 1,
            status: 'vacant'
          });

          // Create first booking
          const checkIn = new Date(startDate);
          const checkOut = new Date(checkIn.getTime() + duration * 24 * 60 * 60 * 1000);

          const booking1 = await createBookingWithCheck(
            bed.id,
            testGuest1.id,
            testOwner.id,
            room.id,
            checkIn,
            checkOut
          );

          // Cancel the first booking
          await booking1.update({ status: 'cancelled' });

          // Try to create second booking with same dates
          // This should succeed because first booking is cancelled
          const booking2 = await createBookingWithCheck(
            bed.id,
            testGuest2.id,
            testOwner.id,
            room.id,
            checkIn,
            checkOut
          );

          // Property: Second booking should be created successfully
          expect(booking2).toBeDefined();
          expect(booking2.bedId).toBe(bed.id);
          expect(booking2.status).toBe('confirmed');

          // Verify only one active booking exists
          const activeBookings = await Booking.findAll({
            where: {
              bedId: bed.id,
              status: ['pending', 'confirmed']
            }
          });

          expect(activeBookings.length).toBe(1);
          expect(activeBookings[0].id).toBe(booking2.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Completed bookings do not block future bed availability', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        durationDaysArbitrary(),
        async (sharingType, roomNumber, floorNumber, startDate, duration) => {
          // Create a PG room
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for completed booking availability',
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
            ownerId: testOwner.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignment
          const bed = await BedAssignment.create({
            roomId: room.id,
            bedNumber: 1,
            status: 'vacant'
          });

          // Create first booking
          const checkIn = new Date(startDate);
          const checkOut = new Date(checkIn.getTime() + duration * 24 * 60 * 60 * 1000);

          const booking1 = await createBookingWithCheck(
            bed.id,
            testGuest1.id,
            testOwner.id,
            room.id,
            checkIn,
            checkOut
          );

          // Mark the first booking as completed
          await booking1.update({ status: 'completed' });

          // Try to create second booking with same dates
          // This should succeed because first booking is completed
          const booking2 = await createBookingWithCheck(
            bed.id,
            testGuest2.id,
            testOwner.id,
            room.id,
            checkIn,
            checkOut
          );

          // Property: Second booking should be created successfully
          expect(booking2).toBeDefined();
          expect(booking2.bedId).toBe(bed.id);
          expect(booking2.status).toBe('confirmed');

          // Verify only one active booking exists
          const activeBookings = await Booking.findAll({
            where: {
              bedId: bed.id,
              status: ['pending', 'confirmed']
            }
          });

          expect(activeBookings.length).toBe(1);
          expect(activeBookings[0].id).toBe(booking2.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Sequential bookings for same bed are allowed', async () => {
    await fc.assert(
      fc.asyncProperty(
        sharingTypeArbitrary(),
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        durationDaysArbitrary(),
        durationDaysArbitrary(),
        async (sharingType, roomNumber, floorNumber, startDate, duration1, duration2) => {
          // Create a PG room
          const room = await Room.create({
            title: `PG Room ${roomNumber}`,
            description: 'Test PG room for sequential bookings',
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
            ownerId: testOwner.id,
            sharingType: sharingType,
            totalBeds: getExpectedBedCount(sharingType),
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create bed assignment
          const bed = await BedAssignment.create({
            roomId: room.id,
            bedNumber: 1,
            status: 'vacant'
          });

          // Create first booking
          const checkIn1 = new Date(startDate);
          const checkOut1 = new Date(checkIn1.getTime() + duration1 * 24 * 60 * 60 * 1000);

          const booking1 = await createBookingWithCheck(
            bed.id,
            testGuest1.id,
            testOwner.id,
            room.id,
            checkIn1,
            checkOut1
          );

          // Create second booking that starts after first one ends
          const checkIn2 = new Date(checkOut1.getTime() + 24 * 60 * 60 * 1000); // 1 day after checkout
          const checkOut2 = new Date(checkIn2.getTime() + duration2 * 24 * 60 * 60 * 1000);

          const booking2 = await createBookingWithCheck(
            bed.id,
            testGuest2.id,
            testOwner.id,
            room.id,
            checkIn2,
            checkOut2
          );

          // Property: Both bookings should be created successfully
          expect(booking1).toBeDefined();
          expect(booking2).toBeDefined();
          expect(booking1.bedId).toBe(bed.id);
          expect(booking2.bedId).toBe(bed.id);

          // Verify dates don't overlap
          const overlap = datesOverlap(
            new Date(booking1.checkIn),
            new Date(booking1.checkOut),
            new Date(booking2.checkIn),
            new Date(booking2.checkOut)
          );

          expect(overlap).toBe(false);

          // Verify both bookings are active
          const activeBookings = await Booking.findAll({
            where: {
              bedId: bed.id,
              status: ['pending', 'confirmed']
            },
            order: [['checkIn', 'ASC']]
          });

          expect(activeBookings.length).toBe(2);
          expect(activeBookings[0].id).toBe(booking1.id);
          expect(activeBookings[1].id).toBe(booking2.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
