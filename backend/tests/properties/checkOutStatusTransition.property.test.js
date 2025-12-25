/**
 * Property-Based Tests for Check-out Status Transition
 * Feature: internal-management-system, Property 11: Check-out status transition
 * 
 * Property: For any booking, when check-out is completed, the booking status must 
 * change to completed and the associated room status must change to vacant_dirty
 * 
 * Validates: Requirements 9.3
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
  },
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
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
  actualCheckInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualCheckOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkedInBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  checkedOutBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'bookings'
});

// Define associations
Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Room, { foreignKey: 'ownerId', as: 'rooms' });
Booking.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Booking.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Booking.belongsTo(User, { foreignKey: 'checkedInBy', as: 'checkedInByUser' });
Booking.belongsTo(User, { foreignKey: 'checkedOutBy', as: 'checkedOutByUser' });
Room.hasMany(Booking, { foreignKey: 'roomId', as: 'bookings' });

describe('Property 11: Check-out Status Transition', () => {
  let testOwner;
  let testGuest;
  let testStaff;

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

    testGuest = await User.create({
      name: 'Test Guest',
      email: 'testguest@example.com',
      phone: '9876543210',
      role: 'user'
    });

    testStaff = await User.create({
      name: 'Test Staff',
      email: 'teststaff@example.com',
      phone: '5555555555',
      role: 'owner',
      staffRole: 'front_desk'
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await Booking.destroy({ where: {}, truncate: true });
    await Room.destroy({ where: {}, truncate: true, cascade: true });
  });

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
   * Generator for past dates (for check-in that already happened)
   */
  const pastDateArbitrary = () =>
    fc.date({ 
      min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      max: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) 
    });

  /**
   * Simulate check-in process (prerequisite for check-out)
   */
  const performCheckIn = async (booking, room, staffUser) => {
    await booking.update({
      status: 'confirmed',
      actualCheckInTime: new Date(),
      checkedInBy: staffUser.id
    });

    await room.update({
      currentStatus: 'occupied'
    });

    return { booking, room };
  };

  /**
   * Simulate check-out process
   */
  const performCheckOut = async (booking, room, staffUser) => {
    // Verify pre-conditions
    if (booking.status !== 'confirmed') {
      throw new Error(`Cannot check out booking with status: ${booking.status}`);
    }

    if (!booking.actualCheckInTime) {
      throw new Error('Booking has not been checked in yet');
    }

    if (booking.actualCheckOutTime) {
      throw new Error('Booking has already been checked out');
    }

    if (room.currentStatus !== 'occupied') {
      throw new Error('Room is not currently occupied');
    }

    // Perform check-out
    await booking.update({
      status: 'completed',
      actualCheckOutTime: new Date(),
      checkedOutBy: staffUser.id
    });

    await room.update({
      currentStatus: 'vacant_dirty'
    });

    return { booking, room };
  };

  test('Property 11: Check-out transitions booking to completed and room to vacant_dirty', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        pastDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          // Generate check-out date after check-in
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create a room with occupied status (guest is checked in)
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for check-out status transition',
            price: 1000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'Hotel Room',
            roomType: 'Hotel Room',
            ownerId: testOwner.id,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          // Create a booking that will be checked in
          const booking = await Booking.create({
            roomId: room.id,
            userId: testGuest.id,
            ownerId: testOwner.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: 2,
            totalAmount: 7000,
            contactInfo: {
              phone: '9876543210',
              email: 'testguest@example.com'
            },
            status: 'pending',
            paymentStatus: 'pending',
            bookingSource: 'offline'
          });

          // First perform check-in to set up proper state
          await performCheckIn(booking, room, testStaff);
          await booking.reload();
          await room.reload();

          // Verify we're in the correct pre-checkout state
          expect(booking.status).toBe('confirmed');
          expect(room.currentStatus).toBe('occupied');

          // Store initial states
          const initialBookingStatus = booking.status;
          const initialRoomStatus = room.currentStatus;

          // Perform check-out
          const result = await performCheckOut(booking, room, testStaff);

          // Reload from database to get fresh data
          await result.booking.reload();
          await result.room.reload();

          // Property assertions
          // 1. Booking status must be 'completed' after check-out
          expect(result.booking.status).toBe('completed');

          // 2. Room status must be 'vacant_dirty' after check-out
          expect(result.room.currentStatus).toBe('vacant_dirty');

          // 3. actualCheckOutTime must be set
          expect(result.booking.actualCheckOutTime).not.toBeNull();
          expect(result.booking.actualCheckOutTime).toBeInstanceOf(Date);

          // 4. checkedOutBy must be set to the staff user
          expect(result.booking.checkedOutBy).toBe(testStaff.id);

          // 5. Verify the transition happened (status changed)
          expect(result.booking.status).not.toBe(initialBookingStatus);
          expect(result.room.currentStatus).not.toBe(initialRoomStatus);

          // 6. Check-out time should be after check-in time
          expect(result.booking.actualCheckOutTime.getTime()).toBeGreaterThan(
            result.booking.actualCheckInTime.getTime()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Check-out is idempotent - cannot check out twice', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        pastDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room and booking
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for idempotent check-out',
            price: 1000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'Hotel Room',
            roomType: 'Hotel Room',
            ownerId: testOwner.id,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'vacant_clean'
          });

          const booking = await Booking.create({
            roomId: room.id,
            userId: testGuest.id,
            ownerId: testOwner.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: 2,
            totalAmount: 7000,
            contactInfo: {
              phone: '9876543210',
              email: 'testguest@example.com'
            },
            status: 'pending',
            paymentStatus: 'pending',
            bookingSource: 'offline'
          });

          // Perform check-in first
          await performCheckIn(booking, room, testStaff);
          await booking.reload();
          await room.reload();

          // Perform first check-out
          await performCheckOut(booking, room, testStaff);
          await booking.reload();
          await room.reload();

          const firstCheckOutTime = booking.actualCheckOutTime;

          // Attempt second check-out should fail
          let errorThrown = false;
          try {
            await performCheckOut(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            // The error can be either about status or already checked out
            const validErrors = [
              'already been checked out',
              'Cannot check out booking with status: completed'
            ];
            const hasValidError = validErrors.some(msg => error.message.includes(msg));
            expect(hasValidError).toBe(true);
          }

          // Property: Second check-out must fail
          expect(errorThrown).toBe(true);

          // Verify state hasn't changed
          await booking.reload();
          expect(booking.actualCheckOutTime.getTime()).toBe(firstCheckOutTime.getTime());
          expect(booking.status).toBe('completed');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Cannot check out booking that is not confirmed', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        pastDateArbitrary(),
        fc.constantFrom('pending', 'cancelled', 'completed'),
        async (roomNumber, floorNumber, checkInDate, invalidStatus) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for invalid status check-out prevention',
            price: 1000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'Hotel Room',
            roomType: 'Hotel Room',
            ownerId: testOwner.id,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'occupied'
          });

          // Create booking with invalid status for check-out
          const booking = await Booking.create({
            roomId: room.id,
            userId: testGuest.id,
            ownerId: testOwner.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: 2,
            totalAmount: 7000,
            contactInfo: {
              phone: '9876543210',
              email: 'testguest@example.com'
            },
            status: invalidStatus,
            paymentStatus: 'pending',
            bookingSource: 'offline'
          });

          // Attempt check-out should fail
          let errorThrown = false;
          try {
            await performCheckOut(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('Cannot check out booking with status');
          }

          // Property: Check-out with invalid status must fail
          expect(errorThrown).toBe(true);

          // Verify booking status hasn't changed
          await booking.reload();
          expect(booking.status).toBe(invalidStatus);
          expect(booking.actualCheckOutTime).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Cannot check out booking that was never checked in', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        pastDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for no check-in prevention',
            price: 1000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'Hotel Room',
            roomType: 'Hotel Room',
            ownerId: testOwner.id,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: 'occupied'
          });

          // Create booking with confirmed status but no actual check-in
          const booking = await Booking.create({
            roomId: room.id,
            userId: testGuest.id,
            ownerId: testOwner.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: 2,
            totalAmount: 7000,
            contactInfo: {
              phone: '9876543210',
              email: 'testguest@example.com'
            },
            status: 'confirmed',
            paymentStatus: 'pending',
            bookingSource: 'offline',
            actualCheckInTime: null // No check-in performed
          });

          // Attempt check-out should fail
          let errorThrown = false;
          try {
            await performCheckOut(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('not been checked in yet');
          }

          // Property: Check-out without check-in must fail
          expect(errorThrown).toBe(true);

          // Verify booking status hasn't changed
          await booking.reload();
          expect(booking.status).toBe('confirmed');
          expect(booking.actualCheckOutTime).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Cannot check out from non-occupied room', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        pastDateArbitrary(),
        fc.constantFrom('vacant_clean', 'vacant_dirty'),
        async (roomNumber, floorNumber, checkInDate, roomStatus) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room with non-occupied status
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for non-occupied check-out prevention',
            price: 1000,
            location: {
              address: 'Test Address',
              city: 'Test City',
              state: 'Test State',
              pincode: '123456',
              coordinates: { lat: 0, lng: 0 }
            },
            category: 'Hotel Room',
            roomType: 'Hotel Room',
            ownerId: testOwner.id,
            floorNumber: floorNumber,
            roomNumber: roomNumber,
            currentStatus: roomStatus
          });

          // Create booking with confirmed status and check-in time
          const booking = await Booking.create({
            roomId: room.id,
            userId: testGuest.id,
            ownerId: testOwner.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: 2,
            totalAmount: 7000,
            contactInfo: {
              phone: '9876543210',
              email: 'testguest@example.com'
            },
            status: 'confirmed',
            paymentStatus: 'pending',
            bookingSource: 'offline',
            actualCheckInTime: new Date(),
            checkedInBy: testStaff.id
          });

          // Attempt check-out should fail
          let errorThrown = false;
          try {
            await performCheckOut(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('not currently occupied');
          }

          // Property: Check-out from non-occupied room must fail
          expect(errorThrown).toBe(true);

          // Verify booking status hasn't changed
          await booking.reload();
          expect(booking.status).toBe('confirmed');
          expect(booking.actualCheckOutTime).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
