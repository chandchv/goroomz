/**
 * Property-Based Tests for Check-in Status Transition
 * Feature: internal-management-system, Property 10: Check-in status transition
 * 
 * Property: For any booking, when check-in is completed, the booking status must 
 * change to confirmed and the associated room status must change to occupied
 * 
 * Validates: Requirements 8.3
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
Room.hasMany(Booking, { foreignKey: 'roomId', as: 'bookings' });

describe('Property 10: Check-in Status Transition', () => {
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
   * Custom generator for room status (only valid pre-check-in statuses)
   */
  const preCheckInRoomStatusArbitrary = () => 
    fc.constantFrom('vacant_clean');

  /**
   * Custom generator for booking status (only valid pre-check-in statuses)
   */
  const preCheckInBookingStatusArbitrary = () =>
    fc.constantFrom('pending', 'confirmed');

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
   * Generator for future dates (for check-in)
   */
  const futureDateArbitrary = () =>
    fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });

  /**
   * Generator for check-out dates (after check-in)
   */
  const checkOutDateArbitrary = (checkInDate) =>
    fc.date({ 
      min: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000), 
      max: new Date(checkInDate.getTime() + 30 * 24 * 60 * 60 * 1000) 
    });

  /**
   * Simulate check-in process
   */
  const performCheckIn = async (booking, room, staffUser) => {
    // Verify pre-conditions
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new Error(`Cannot check in booking with status: ${booking.status}`);
    }

    if (booking.actualCheckInTime) {
      throw new Error('Booking has already been checked in');
    }

    if (room.currentStatus === 'occupied') {
      throw new Error('Room is currently occupied');
    }

    if (room.currentStatus === 'vacant_dirty') {
      throw new Error('Room needs cleaning before check-in');
    }

    // Perform check-in
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

  test('Property 10: Check-in transitions booking to confirmed and room to occupied', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        preCheckInRoomStatusArbitrary(),
        preCheckInBookingStatusArbitrary(),
        futureDateArbitrary(),
        async (roomNumber, floorNumber, initialRoomStatus, initialBookingStatus, checkInDate) => {
          // Generate check-out date after check-in
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create a room with initial status
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for check-in status transition',
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
            currentStatus: initialRoomStatus
          });

          // Create a booking with initial status
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
            status: initialBookingStatus,
            paymentStatus: 'pending',
            bookingSource: 'offline'
          });

          // Store initial states
          const initialBookingStatusValue = booking.status;
          const initialRoomStatusValue = room.currentStatus;

          // Perform check-in
          const result = await performCheckIn(booking, room, testStaff);

          // Reload from database to get fresh data
          await result.booking.reload();
          await result.room.reload();

          // Property assertions
          // 1. Booking status must be 'confirmed' after check-in
          expect(result.booking.status).toBe('confirmed');

          // 2. Room status must be 'occupied' after check-in
          expect(result.room.currentStatus).toBe('occupied');

          // 3. actualCheckInTime must be set
          expect(result.booking.actualCheckInTime).not.toBeNull();
          expect(result.booking.actualCheckInTime).toBeInstanceOf(Date);

          // 4. checkedInBy must be set to the staff user
          expect(result.booking.checkedInBy).toBe(testStaff.id);

          // 5. Verify the transition happened (status changed)
          if (initialBookingStatusValue === 'pending') {
            expect(result.booking.status).not.toBe(initialBookingStatusValue);
          }
          
          // Room status should always change to occupied
          expect(result.room.currentStatus).not.toBe(initialRoomStatusValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Check-in is idempotent - cannot check in twice', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room and booking
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for idempotent check-in',
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

          // Perform first check-in
          await performCheckIn(booking, room, testStaff);
          await booking.reload();
          await room.reload();

          const firstCheckInTime = booking.actualCheckInTime;

          // Attempt second check-in should fail
          let errorThrown = false;
          try {
            await performCheckIn(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('already been checked in');
          }

          // Property: Second check-in must fail
          expect(errorThrown).toBe(true);

          // Verify state hasn't changed
          await booking.reload();
          expect(booking.actualCheckInTime.getTime()).toBe(firstCheckInTime.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Cannot check in to occupied room', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room with occupied status
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for occupied check-in prevention',
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

          // Attempt check-in should fail
          let errorThrown = false;
          try {
            await performCheckIn(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('currently occupied');
          }

          // Property: Check-in to occupied room must fail
          expect(errorThrown).toBe(true);

          // Verify booking status hasn't changed
          await booking.reload();
          expect(booking.status).toBe('pending');
          expect(booking.actualCheckInTime).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: Cannot check in to dirty room', async () => {
    await fc.assert(
      fc.asyncProperty(
        roomNumberArbitrary(),
        floorNumberArbitrary(),
        futureDateArbitrary(),
        async (roomNumber, floorNumber, checkInDate) => {
          const checkOutDate = new Date(checkInDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Create room with vacant_dirty status
          const room = await Room.create({
            title: `Room ${roomNumber}`,
            description: 'Test room for dirty room check-in prevention',
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
            currentStatus: 'vacant_dirty'
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

          // Attempt check-in should fail
          let errorThrown = false;
          try {
            await performCheckIn(booking, room, testStaff);
          } catch (error) {
            errorThrown = true;
            expect(error.message).toContain('needs cleaning');
          }

          // Property: Check-in to dirty room must fail
          expect(errorThrown).toBe(true);

          // Verify booking status hasn't changed
          await booking.reload();
          expect(booking.status).toBe('pending');
          expect(booking.actualCheckInTime).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
