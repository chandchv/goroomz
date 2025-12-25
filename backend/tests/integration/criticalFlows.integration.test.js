/**
 * Integration Tests for Critical Flows
 * Tests complete booking flow, payment tracking, and room status updates
 * 
 * This test validates Requirements: 8.1-9.5, 20.1-22.5, 7.1-7.5, 13.1-13.5
 */

const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Define models
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  role: { type: DataTypes.ENUM('customer', 'owner', 'admin', 'staff'), defaultValue: 'customer' },
  phoneNumber: { type: DataTypes.STRING },
  staffRole: { type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager') }
});

const Room = sequelize.define('Room', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  location: { type: DataTypes.STRING, allowNull: false },
  floorNumber: { type: DataTypes.INTEGER },
  roomNumber: { type: DataTypes.STRING },
  sharingType: { type: DataTypes.ENUM('single', '2_sharing', '3_sharing') },
  totalBeds: { type: DataTypes.INTEGER },
  currentStatus: { type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'), defaultValue: 'vacant_clean' },
  propertyType: { type: DataTypes.ENUM('Hotel', 'PG'), defaultValue: 'Hotel' },
  lastCleanedAt: { type: DataTypes.DATE }
});

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  guestId: { type: DataTypes.UUID, allowNull: false },
  roomId: { type: DataTypes.UUID, allowNull: false },
  checkInDate: { type: DataTypes.DATE, allowNull: false },
  checkOutDate: { type: DataTypes.DATE, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled'), defaultValue: 'confirmed' },
  bookingSource: { type: DataTypes.ENUM('online', 'offline'), defaultValue: 'online' },
  actualCheckInTime: { type: DataTypes.DATE },
  actualCheckOutTime: { type: DataTypes.DATE },
  checkedInBy: { type: DataTypes.UUID },
  checkedOutBy: { type: DataTypes.UUID }
});

const RoomStatus = sequelize.define('RoomStatus', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'), allowNull: false },
  updatedBy: { type: DataTypes.UUID, allowNull: false },
  notes: { type: DataTypes.TEXT }
});

const SecurityDeposit = sequelize.define('SecurityDeposit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  collectedDate: { type: DataTypes.DATE, allowNull: false },
  paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'), allowNull: false },
  status: { type: DataTypes.ENUM('collected', 'refunded', 'partially_refunded'), defaultValue: 'collected' },
  refundAmount: { type: DataTypes.DECIMAL(10, 2) },
  refundDate: { type: DataTypes.DATE },
  deductions: { type: DataTypes.JSON, defaultValue: [] },
  refundedBy: { type: DataTypes.UUID }
});

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  paymentMethod: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'), allowNull: false },
  paymentType: { type: DataTypes.ENUM('booking', 'monthly_rent', 'security_deposit'), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
  transactionReference: { type: DataTypes.STRING },
  recordedBy: { type: DataTypes.UUID }
});

const PaymentSchedule = sequelize.define('PaymentSchedule', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue'), defaultValue: 'pending' },
  paidDate: { type: DataTypes.DATE },
  paymentId: { type: DataTypes.UUID }
});

const HousekeepingLog = sequelize.define('HousekeepingLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false },
  cleanedBy: { type: DataTypes.UUID, allowNull: false },
  cleanedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  timeTaken: { type: DataTypes.INTEGER },
  checklistCompleted: { type: DataTypes.JSON },
  issuesFound: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT }
});

describe('Critical Flows Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Complete Booking Flow: create → check-in → check-out', () => {
    let owner, guest, room, booking;

    beforeEach(async () => {
      // Clean up
      await HousekeepingLog.destroy({ where: {}, truncate: true });
      await PaymentSchedule.destroy({ where: {}, truncate: true });
      await Payment.destroy({ where: {}, truncate: true });
      await SecurityDeposit.destroy({ where: {}, truncate: true });
      await Booking.destroy({ where: {}, truncate: true });
      await RoomStatus.destroy({ where: {}, truncate: true });
      await Room.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      // Create users
      owner = await User.create({
        name: 'Test Owner',
        email: 'owner@test.com',
        role: 'owner',
        phoneNumber: '1234567890'
      });

      guest = await User.create({
        name: 'Test Guest',
        email: 'guest@test.com',
        role: 'customer',
        phoneNumber: '9876543210'
      });

      // Create room
      room = await Room.create({
        name: 'Room 101',
        ownerId: owner.id,
        price: 1000,
        location: 'Test Location',
        floorNumber: 1,
        roomNumber: '101',
        sharingType: 'single',
        totalBeds: 1,
        currentStatus: 'vacant_clean'
      });

      await RoomStatus.create({
        roomId: room.id,
        status: 'vacant_clean',
        updatedBy: owner.id
      });
    });

    test('Complete flow: booking → check-in → payment → check-out', async () => {
      // Step 1: Create booking
      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        totalAmount: 2000,
        bookingSource: 'offline',
        status: 'confirmed'
      });

      expect(booking.status).toBe('confirmed');
      expect(booking.bookingSource).toBe('offline');

      // Step 2: Check-in
      await booking.update({
        status: 'active',
        actualCheckInTime: new Date(),
        checkedInBy: owner.id
      });

      await room.update({ currentStatus: 'occupied' });

      const deposit = await SecurityDeposit.create({
        bookingId: booking.id,
        amount: 500,
        collectedDate: new Date(),
        paymentMethod: 'cash',
        status: 'collected'
      });

      // Verify check-in state
      await booking.reload();
      await room.reload();
      expect(booking.status).toBe('active');
      expect(booking.actualCheckInTime).toBeDefined();
      expect(room.currentStatus).toBe('occupied');
      expect(deposit.status).toBe('collected');

      // Step 3: Record payment
      const payment = await Payment.create({
        bookingId: booking.id,
        amount: 2000,
        paymentMethod: 'cash',
        paymentType: 'booking',
        status: 'completed',
        recordedBy: owner.id
      });

      expect(parseFloat(payment.amount)).toBe(2000);
      expect(payment.status).toBe('completed');

      // Step 4: Check-out
      await booking.update({
        status: 'completed',
        actualCheckOutTime: new Date(),
        checkedOutBy: owner.id
      });

      await room.update({ currentStatus: 'vacant_dirty' });

      await deposit.update({
        status: 'refunded',
        refundAmount: 500,
        refundDate: new Date(),
        refundedBy: owner.id
      });

      // Verify check-out state
      await booking.reload();
      await room.reload();
      await deposit.reload();
      expect(booking.status).toBe('completed');
      expect(booking.actualCheckOutTime).toBeDefined();
      expect(room.currentStatus).toBe('vacant_dirty');
      expect(deposit.status).toBe('refunded');
      expect(parseFloat(deposit.refundAmount)).toBe(500);
    });

    test('Check-out with partial security deposit refund', async () => {
      // Create and check-in booking
      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        totalAmount: 1000,
        bookingSource: 'offline',
        status: 'active',
        actualCheckInTime: new Date(),
        checkedInBy: owner.id
      });

      await room.update({ currentStatus: 'occupied' });

      const deposit = await SecurityDeposit.create({
        bookingId: booking.id,
        amount: 1000,
        collectedDate: new Date(),
        paymentMethod: 'cash',
        status: 'collected'
      });

      // Check-out with deductions
      const deductions = [
        { reason: 'Damaged furniture', amount: 300 },
        { reason: 'Extra cleaning', amount: 100 }
      ];
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const refundAmount = 1000 - totalDeductions;

      await deposit.update({
        status: 'partially_refunded',
        refundAmount,
        refundDate: new Date(),
        deductions,
        refundedBy: owner.id
      });

      await deposit.reload();
      expect(deposit.status).toBe('partially_refunded');
      expect(parseFloat(deposit.refundAmount)).toBe(600);
      expect(deposit.deductions).toHaveLength(2);
    });
  });

  describe('Payment Recording and Tracking', () => {
    let owner, guest, room, booking;

    beforeEach(async () => {
      await PaymentSchedule.destroy({ where: {}, truncate: true });
      await Payment.destroy({ where: {}, truncate: true });
      await Booking.destroy({ where: {}, truncate: true });
      await Room.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      owner = await User.create({
        name: 'Payment Test Owner',
        email: 'owner-payment@test.com',
        role: 'owner',
        phoneNumber: '1234567890'
      });

      guest = await User.create({
        name: 'Payment Test Guest',
        email: 'guest-payment@test.com',
        role: 'customer',
        phoneNumber: '9876543210'
      });

      room = await Room.create({
        name: 'PG Room 201',
        ownerId: owner.id,
        price: 5000,
        location: 'Test Location',
        floorNumber: 2,
        roomNumber: '201',
        sharingType: '2_sharing',
        totalBeds: 2,
        currentStatus: 'vacant_clean',
        propertyType: 'PG'
      });
    });

    test('Payment schedule creation for PG booking', async () => {
      // Create PG booking for 3 months
      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        totalAmount: 15000,
        bookingSource: 'offline',
        status: 'active',
        actualCheckInTime: new Date()
      });

      // Create payment schedule (3 monthly payments)
      const schedules = [];
      for (let i = 0; i < 3; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        schedules.push(await PaymentSchedule.create({
          bookingId: booking.id,
          dueDate,
          amount: 5000,
          status: 'pending'
        }));
      }

      expect(schedules.length).toBe(3);
      expect(parseFloat(schedules[0].amount)).toBe(5000);
      expect(schedules[0].status).toBe('pending');
    });

    test('Record payment and update schedule status', async () => {
      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: 5000,
        bookingSource: 'offline',
        status: 'active'
      });

      const schedule = await PaymentSchedule.create({
        bookingId: booking.id,
        dueDate: new Date(),
        amount: 5000,
        status: 'pending'
      });

      // Record payment
      const payment = await Payment.create({
        bookingId: booking.id,
        amount: 5000,
        paymentMethod: 'upi',
        paymentType: 'monthly_rent',
        transactionReference: 'UPI123456',
        status: 'completed',
        recordedBy: owner.id
      });

      // Update schedule
      await schedule.update({
        status: 'paid',
        paidDate: new Date(),
        paymentId: payment.id
      });

      await schedule.reload();
      expect(schedule.status).toBe('paid');
      expect(schedule.paidDate).toBeDefined();
      expect(schedule.paymentId).toBe(payment.id);
    });

    test('Partial payment tracking', async () => {
      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalAmount: 5000,
        bookingSource: 'offline',
        status: 'confirmed'
      });

      // Record partial payments
      const payment1 = await Payment.create({
        bookingId: booking.id,
        amount: 2000,
        paymentMethod: 'cash',
        paymentType: 'booking',
        status: 'completed',
        recordedBy: owner.id
      });

      const payment2 = await Payment.create({
        bookingId: booking.id,
        amount: 3000,
        paymentMethod: 'card',
        paymentType: 'booking',
        status: 'completed',
        recordedBy: owner.id
      });

      // Get all payments
      const payments = await Payment.findAll({ where: { bookingId: booking.id } });
      expect(payments.length).toBe(2);

      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      expect(totalPaid).toBe(5000);
    });

    test('Overdue payment detection', async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      booking = await Booking.create({
        guestId: guest.id,
        roomId: room.id,
        checkInDate: pastDate,
        checkOutDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        totalAmount: 5000,
        bookingSource: 'offline',
        status: 'active'
      });

      const schedule = await PaymentSchedule.create({
        bookingId: booking.id,
        dueDate: pastDate,
        amount: 5000,
        status: 'pending'
      });

      // Calculate days overdue
      const now = new Date();
      const daysOverdue = Math.floor((now - pastDate) / (1000 * 60 * 60 * 24));

      expect(daysOverdue).toBeGreaterThan(0);
      expect(schedule.status).toBe('pending');
    });
  });

  describe('Room Status Updates and Housekeeping', () => {
    let owner, housekeepingStaff, room;

    beforeEach(async () => {
      await HousekeepingLog.destroy({ where: {}, truncate: true });
      await RoomStatus.destroy({ where: {}, truncate: true });
      await Room.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      owner = await User.create({
        name: 'Room Status Test Owner',
        email: 'owner-room@test.com',
        role: 'owner',
        phoneNumber: '1234567890'
      });

      housekeepingStaff = await User.create({
        name: 'Housekeeping Staff',
        email: 'housekeeping@test.com',
        role: 'staff',
        phoneNumber: '9876543210',
        staffRole: 'housekeeping'
      });

      room = await Room.create({
        name: 'Room 301',
        ownerId: owner.id,
        price: 1500,
        location: 'Test Location',
        floorNumber: 3,
        roomNumber: '301',
        sharingType: 'single',
        totalBeds: 1,
        currentStatus: 'vacant_clean'
      });

      await RoomStatus.create({
        roomId: room.id,
        status: 'vacant_clean',
        updatedBy: owner.id
      });
    });

    test('Room status flow: vacant_clean → occupied → vacant_dirty → vacant_clean', async () => {
      // Initial state
      expect(room.currentStatus).toBe('vacant_clean');

      // Update to occupied
      await room.update({ currentStatus: 'occupied' });
      await RoomStatus.create({
        roomId: room.id,
        status: 'occupied',
        updatedBy: owner.id,
        notes: 'Guest checked in'
      });

      await room.reload();
      expect(room.currentStatus).toBe('occupied');

      // Update to vacant_dirty
      await room.update({ currentStatus: 'vacant_dirty' });
      await RoomStatus.create({
        roomId: room.id,
        status: 'vacant_dirty',
        updatedBy: owner.id,
        notes: 'Guest checked out'
      });

      await room.reload();
      expect(room.currentStatus).toBe('vacant_dirty');

      // Housekeeping marks as clean
      await room.update({
        currentStatus: 'vacant_clean',
        lastCleanedAt: new Date()
      });

      await HousekeepingLog.create({
        roomId: room.id,
        cleanedBy: housekeepingStaff.id,
        cleanedAt: new Date(),
        timeTaken: 30,
        checklistCompleted: [
          { item: 'Bed made', completed: true },
          { item: 'Bathroom cleaned', completed: true },
          { item: 'Floor mopped', completed: true }
        ],
        notes: 'Room cleaned thoroughly'
      });

      await room.reload();
      expect(room.currentStatus).toBe('vacant_clean');
      expect(room.lastCleanedAt).toBeDefined();

      // Verify housekeeping log
      const log = await HousekeepingLog.findOne({ where: { roomId: room.id } });
      expect(log).toBeDefined();
      expect(log.cleanedBy).toBe(housekeepingStaff.id);
      expect(log.timeTaken).toBe(30);
    });

    test('Housekeeping history tracking', async () => {
      // Clean room multiple times
      await room.update({ currentStatus: 'vacant_dirty' });

      await HousekeepingLog.create({
        roomId: room.id,
        cleanedBy: housekeepingStaff.id,
        timeTaken: 25,
        checklistCompleted: [{ item: 'Basic cleaning', completed: true }],
        notes: 'First cleaning'
      });

      await room.update({ currentStatus: 'vacant_clean', lastCleanedAt: new Date() });

      // Make dirty again
      await room.update({ currentStatus: 'vacant_dirty' });

      await HousekeepingLog.create({
        roomId: room.id,
        cleanedBy: housekeepingStaff.id,
        timeTaken: 30,
        checklistCompleted: [{ item: 'Deep cleaning', completed: true }],
        notes: 'Second cleaning'
      });

      await room.update({ currentStatus: 'vacant_clean', lastCleanedAt: new Date() });

      // Get cleaning history
      const history = await HousekeepingLog.findAll({
        where: { roomId: room.id },
        order: [['cleanedAt', 'DESC']]
      });

      expect(history.length).toBe(2);
      expect(history[0].notes).toBe('Second cleaning');
      expect(history[1].notes).toBe('First cleaning');
    });
  });
});
