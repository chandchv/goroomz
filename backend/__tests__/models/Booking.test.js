/**
 * Unit tests for extended Booking model with Amadeus integration fields
 * 
 * Tests cover:
 * - Creating bookings with Amadeus fields
 * - Querying bookings by provider
 * - Storing external booking data
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

const Booking = require('../../models/Booking');
const { sequelize } = require('../../config/database');

describe('Booking Model - Amadeus Integration', () => {
  beforeAll(async () => {
    // Sync database schema for testing
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await Booking.destroy({ where: {}, truncate: true });
  });

  describe('Creating booking with Amadeus fields', () => {
    it('should create a local booking with default provider', async () => {
      const bookingData = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        }
      };

      const booking = await Booking.create(bookingData);

      expect(booking.bookingProvider).toBe('local');
      expect(booking.externalBookingId).toBeNull();
      expect(booking.externalHotelId).toBeNull();
      expect(booking.externalBookingData).toBeNull();
    });

    it('should create an Amadeus booking with all external fields', async () => {
      const bookingData = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'amadeus',
        externalBookingId: 'AMADEUS123456',
        externalHotelId: 'ACPAR419',
        externalBookingData: {
          confirmationNumber: 'AMADEUS123456',
          hotelId: 'ACPAR419',
          hotelName: 'LE NOTRE DAME',
          roomType: 'DELUXE',
          rateCode: 'BAR',
          totalPrice: {
            amount: 5000.00,
            currency: 'INR'
          },
          cancellationPolicy: 'Free cancellation until 24 hours before check-in'
        }
      };

      const booking = await Booking.create(bookingData);

      expect(booking.bookingProvider).toBe('amadeus');
      expect(booking.externalBookingId).toBe('AMADEUS123456');
      expect(booking.externalHotelId).toBe('ACPAR419');
      expect(booking.externalBookingData).toBeDefined();
      expect(booking.externalBookingData.confirmationNumber).toBe('AMADEUS123456');
      expect(booking.externalBookingData.hotelName).toBe('LE NOTRE DAME');
    });

    it('should enforce unique constraint on externalBookingId', async () => {
      const bookingData1 = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'amadeus',
        externalBookingId: 'AMADEUS123456'
      };

      const bookingData2 = {
        ...bookingData1,
        roomId: '223e4567-e89b-12d3-a456-426614174000',
        userId: '223e4567-e89b-12d3-a456-426614174001'
      };

      await Booking.create(bookingData1);

      // Attempting to create another booking with same externalBookingId should fail
      await expect(Booking.create(bookingData2)).rejects.toThrow();
    });

    it('should allow multiple bookings with null externalBookingId', async () => {
      const bookingData1 = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'local'
      };

      const bookingData2 = {
        ...bookingData1,
        roomId: '223e4567-e89b-12d3-a456-426614174000',
        userId: '223e4567-e89b-12d3-a456-426614174001'
      };

      const booking1 = await Booking.create(bookingData1);
      const booking2 = await Booking.create(bookingData2);

      expect(booking1.externalBookingId).toBeNull();
      expect(booking2.externalBookingId).toBeNull();
      expect(booking1.id).not.toBe(booking2.id);
    });
  });

  describe('Querying bookings by provider', () => {
    beforeEach(async () => {
      // Create test bookings
      await Booking.bulkCreate([
        {
          roomId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          ownerId: '123e4567-e89b-12d3-a456-426614174002',
          checkIn: new Date('2026-02-01'),
          checkOut: new Date('2026-02-05'),
          guests: 2,
          totalAmount: 5000.00,
          contactInfo: { phone: '1234567890', email: 'test1@example.com' },
          bookingProvider: 'local'
        },
        {
          roomId: '223e4567-e89b-12d3-a456-426614174000',
          userId: '223e4567-e89b-12d3-a456-426614174001',
          ownerId: '223e4567-e89b-12d3-a456-426614174002',
          checkIn: new Date('2026-02-10'),
          checkOut: new Date('2026-02-15'),
          guests: 2,
          totalAmount: 6000.00,
          contactInfo: { phone: '1234567891', email: 'test2@example.com' },
          bookingProvider: 'amadeus',
          externalBookingId: 'AMADEUS123456',
          externalHotelId: 'ACPAR419'
        },
        {
          roomId: '323e4567-e89b-12d3-a456-426614174000',
          userId: '323e4567-e89b-12d3-a456-426614174001',
          ownerId: '323e4567-e89b-12d3-a456-426614174002',
          checkIn: new Date('2026-02-20'),
          checkOut: new Date('2026-02-25'),
          guests: 2,
          totalAmount: 7000.00,
          contactInfo: { phone: '1234567892', email: 'test3@example.com' },
          bookingProvider: 'amadeus',
          externalBookingId: 'AMADEUS789012',
          externalHotelId: 'ACLON123'
        }
      ]);
    });

    it('should query all local bookings', async () => {
      const localBookings = await Booking.findAll({
        where: { bookingProvider: 'local' }
      });

      expect(localBookings).toHaveLength(1);
      expect(localBookings[0].bookingProvider).toBe('local');
      expect(localBookings[0].externalBookingId).toBeNull();
    });

    it('should query all Amadeus bookings', async () => {
      const amadeusBookings = await Booking.findAll({
        where: { bookingProvider: 'amadeus' }
      });

      expect(amadeusBookings).toHaveLength(2);
      amadeusBookings.forEach(booking => {
        expect(booking.bookingProvider).toBe('amadeus');
        expect(booking.externalBookingId).toBeDefined();
        expect(booking.externalHotelId).toBeDefined();
      });
    });

    it('should find booking by externalBookingId', async () => {
      const booking = await Booking.findOne({
        where: { externalBookingId: 'AMADEUS123456' }
      });

      expect(booking).toBeDefined();
      expect(booking.bookingProvider).toBe('amadeus');
      expect(booking.externalHotelId).toBe('ACPAR419');
    });

    it('should find bookings by externalHotelId', async () => {
      const bookings = await Booking.findAll({
        where: { externalHotelId: 'ACPAR419' }
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].externalBookingId).toBe('AMADEUS123456');
    });
  });

  describe('Storing external booking data', () => {
    it('should store complex JSONB data in externalBookingData', async () => {
      const complexBookingData = {
        confirmationNumber: 'AMADEUS123456',
        hotelId: 'ACPAR419',
        hotelName: 'LE NOTRE DAME',
        hotelAddress: {
          street: '10 Rue de la Cité',
          city: 'Paris',
          postalCode: '75004',
          country: 'France'
        },
        roomDetails: {
          roomType: 'DELUXE',
          bedType: 'KING',
          smokingPreference: 'NON_SMOKING',
          floor: 3,
          roomNumber: '301'
        },
        rateDetails: {
          rateCode: 'BAR',
          ratePlan: 'Best Available Rate',
          totalPrice: {
            amount: 5000.00,
            currency: 'INR'
          },
          breakdown: [
            { date: '2026-02-01', amount: 1000.00 },
            { date: '2026-02-02', amount: 1000.00 },
            { date: '2026-02-03', amount: 1000.00 },
            { date: '2026-02-04', amount: 1000.00 },
            { date: '2026-02-05', amount: 1000.00 }
          ]
        },
        cancellationPolicy: {
          type: 'FLEXIBLE',
          deadline: '2026-01-31T23:59:59Z',
          penalty: 0
        },
        guestDetails: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+911234567890'
        },
        specialRequests: ['Late check-in', 'High floor'],
        amadeusMetadata: {
          bookingDate: '2026-01-15T10:30:00Z',
          lastModified: '2026-01-15T10:30:00Z',
          bookingSource: 'API'
        }
      };

      const booking = await Booking.create({
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'amadeus',
        externalBookingId: 'AMADEUS123456',
        externalHotelId: 'ACPAR419',
        externalBookingData: complexBookingData
      });

      // Retrieve and verify
      const retrieved = await Booking.findByPk(booking.id);
      
      expect(retrieved.externalBookingData).toBeDefined();
      expect(retrieved.externalBookingData.confirmationNumber).toBe('AMADEUS123456');
      expect(retrieved.externalBookingData.hotelAddress.city).toBe('Paris');
      expect(retrieved.externalBookingData.roomDetails.roomType).toBe('DELUXE');
      expect(retrieved.externalBookingData.rateDetails.breakdown).toHaveLength(5);
      expect(retrieved.externalBookingData.specialRequests).toContain('Late check-in');
    });

    it('should allow querying by nested JSONB fields', async () => {
      await Booking.create({
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'amadeus',
        externalBookingId: 'AMADEUS123456',
        externalHotelId: 'ACPAR419',
        externalBookingData: {
          hotelId: 'ACPAR419',
          hotelName: 'LE NOTRE DAME'
        }
      });

      // Query by nested JSONB field
      const bookings = await Booking.findAll({
        where: sequelize.where(
          sequelize.fn('jsonb_extract_path_text', 
            sequelize.col('external_booking_data'), 
            'hotelId'
          ),
          'ACPAR419'
        )
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].externalBookingData.hotelName).toBe('LE NOTRE DAME');
    });

    it('should handle null externalBookingData gracefully', async () => {
      const booking = await Booking.create({
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'local'
      });

      expect(booking.externalBookingData).toBeNull();
    });
  });

  describe('Booking model associations and methods', () => {
    it('should maintain existing model methods with Amadeus bookings', async () => {
      const booking = await Booking.create({
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        ownerId: '123e4567-e89b-12d3-a456-426614174002',
        checkIn: new Date('2026-02-01'),
        checkOut: new Date('2026-02-05'),
        guests: 2,
        totalAmount: 5000.00,
        paidAmount: 2000.00,
        contactInfo: {
          phone: '1234567890',
          email: 'test@example.com'
        },
        bookingProvider: 'amadeus',
        externalBookingId: 'AMADEUS123456'
      });

      // Test existing methods work with Amadeus bookings
      expect(booking.getDuration()).toBe(4);
      expect(booking.getOutstandingBalance()).toBe(3000.00);
      expect(booking.isFullyPaid()).toBe(false);
    });
  });
});
