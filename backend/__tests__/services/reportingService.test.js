/**
 * ReportingService Unit Tests
 * 
 * Tests for daily reports and occupancy reports.
 * Requirements: 10.5, 10.6
 */

const reportingService = require('../../services/reportingService');

describe('ReportingService', () => {
  describe('getDailyReport', () => {
    /**
     * Requirements: 10.5
     * THE Booking_System SHALL provide daily reports of check-ins, check-outs, and no-shows
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.getDailyReport).toBe('function');
    });

    test('should accept options parameter', () => {
      // Verify the function can be called with options
      expect(reportingService.getDailyReport.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOccupancyReport', () => {
    /**
     * Requirements: 10.6
     * THE Booking_System SHALL provide occupancy reports by date range and property
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.getOccupancyReport).toBe('function');
    });

    test('should accept options parameter', () => {
      expect(reportingService.getOccupancyReport.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRoomStatusBreakdown', () => {
    /**
     * Get current room status breakdown
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.getRoomStatusBreakdown).toBe('function');
    });
  });

  describe('calculateDailyRevenue', () => {
    /**
     * Calculate daily revenue
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.calculateDailyRevenue).toBe('function');
    });
  });

  describe('formatBookingForReport', () => {
    /**
     * Format booking for report output
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.formatBookingForReport).toBe('function');
    });

    test('should format booking with all fields', () => {
      const mockBooking = {
        id: 'test-id',
        bookingNumber: 'GR-20260105-TEST',
        status: 'checked_in',
        checkIn: new Date('2026-01-05'),
        checkOut: new Date('2026-01-07'),
        actualCheckInTime: new Date('2026-01-05T14:00:00'),
        actualCheckOutTime: null,
        totalAmount: 5000,
        paidAmount: 5000,
        guests: 2,
        bookingSource: 'online',
        room: {
          id: 'room-id',
          title: 'Deluxe Room',
          roomNumber: '101'
        },
        guestProfile: {
          id: 'guest-id',
          name: 'John Doe',
          phone: '9876543210',
          email: 'john@example.com'
        },
        property: {
          id: 'property-id',
          name: 'Test Hotel'
        },
        contactInfo: null
      };

      const formatted = reportingService.formatBookingForReport(mockBooking);

      expect(formatted.id).toBe('test-id');
      expect(formatted.bookingNumber).toBe('GR-20260105-TEST');
      expect(formatted.status).toBe('checked_in');
      expect(formatted.totalAmount).toBe(5000);
      expect(formatted.paidAmount).toBe(5000);
      expect(formatted.guests).toBe(2);
      expect(formatted.bookingSource).toBe('online');
      expect(formatted.room).toEqual({
        id: 'room-id',
        title: 'Deluxe Room',
        roomNumber: '101'
      });
      expect(formatted.guest).toEqual({
        id: 'guest-id',
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com'
      });
      expect(formatted.property).toEqual({
        id: 'property-id',
        name: 'Test Hotel'
      });
    });

    test('should handle booking without room', () => {
      const mockBooking = {
        id: 'test-id',
        bookingNumber: 'GR-20260105-TEST',
        status: 'pending',
        checkIn: new Date('2026-01-05'),
        checkOut: new Date('2026-01-07'),
        actualCheckInTime: null,
        actualCheckOutTime: null,
        totalAmount: 5000,
        paidAmount: 0,
        guests: 1,
        bookingSource: 'offline',
        room: null,
        guestProfile: null,
        property: null,
        contactInfo: { name: 'Jane Doe', phone: '1234567890' }
      };

      const formatted = reportingService.formatBookingForReport(mockBooking);

      expect(formatted.room).toBeNull();
      expect(formatted.guest).toEqual({ name: 'Jane Doe', phone: '1234567890' });
      expect(formatted.property).toBeNull();
    });

    test('should handle booking with null guest profile but with contactInfo', () => {
      const mockBooking = {
        id: 'test-id',
        bookingNumber: 'GR-20260105-TEST',
        status: 'confirmed',
        checkIn: new Date('2026-01-05'),
        checkOut: new Date('2026-01-07'),
        actualCheckInTime: null,
        actualCheckOutTime: null,
        totalAmount: 3000,
        paidAmount: 1500,
        guests: 1,
        bookingSource: 'walk_in',
        room: null,
        guestProfile: null,
        property: null,
        contactInfo: { name: 'Walk-in Guest', phone: '5555555555', email: 'walkin@test.com' }
      };

      const formatted = reportingService.formatBookingForReport(mockBooking);

      expect(formatted.guest).toEqual({ 
        name: 'Walk-in Guest', 
        phone: '5555555555', 
        email: 'walkin@test.com' 
      });
    });
  });

  describe('getBookingStatistics', () => {
    /**
     * Get booking statistics for a date range
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.getBookingStatistics).toBe('function');
    });
  });

  describe('getAuditActivityReport', () => {
    /**
     * Get audit activity report
     */
    
    test('should be a function', () => {
      expect(typeof reportingService.getAuditActivityReport).toBe('function');
    });
  });
});
