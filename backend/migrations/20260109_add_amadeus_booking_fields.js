/**
 * Migration: Add Amadeus booking fields to bookings table
 * 
 * This migration adds support for external bookings from Amadeus API:
 * - externalBookingId: Amadeus booking confirmation number
 * - externalHotelId: Amadeus hotel ID (8 characters)
 * - bookingProvider: Enum to distinguish local vs Amadeus bookings
 * - externalBookingData: JSONB field for raw Amadeus booking data
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add externalBookingId field
    await queryInterface.addColumn('bookings', 'external_booking_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Amadeus booking confirmation number'
    });

    // Add externalHotelId field
    await queryInterface.addColumn('bookings', 'external_hotel_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Amadeus hotel ID (8 chars)'
    });

    // Add bookingProvider enum field
    await queryInterface.addColumn('bookings', 'booking_provider', {
      type: Sequelize.ENUM('local', 'amadeus'),
      defaultValue: 'local',
      allowNull: false,
      comment: 'Booking provider source'
    });

    // Add externalBookingData JSONB field
    await queryInterface.addColumn('bookings', 'external_booking_data', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Raw booking data from external provider'
    });

    // Add index on booking_provider for filtering
    await queryInterface.addIndex('bookings', ['booking_provider'], {
      name: 'bookings_booking_provider_idx'
    });

    // Add unique index on external_booking_id (only for non-null values)
    await queryInterface.addIndex('bookings', ['external_booking_id'], {
      name: 'bookings_external_booking_id_unique_idx',
      unique: true,
      where: {
        external_booking_id: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    // Add index on external_hotel_id for lookups
    await queryInterface.addIndex('bookings', ['external_hotel_id'], {
      name: 'bookings_external_hotel_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('bookings', 'bookings_external_hotel_id_idx');
    await queryInterface.removeIndex('bookings', 'bookings_external_booking_id_unique_idx');
    await queryInterface.removeIndex('bookings', 'bookings_booking_provider_idx');

    // Remove columns
    await queryInterface.removeColumn('bookings', 'external_booking_data');
    await queryInterface.removeColumn('bookings', 'booking_provider');
    await queryInterface.removeColumn('bookings', 'external_hotel_id');
    await queryInterface.removeColumn('bookings', 'external_booking_id');

    // Remove enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_booking_provider";');
  }
};
