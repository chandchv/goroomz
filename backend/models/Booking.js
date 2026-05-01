const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
  // New: bed_id for shared rooms
  bedId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'beds',
      key: 'id'
    },
    comment: 'For shared rooms - references specific bed'
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
  // New: property_id for direct property reference
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'properties',
      key: 'id'
    },
    comment: 'Direct reference to property'
  },
  // New: booking_number - human-readable confirmation number
  bookingNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Human-readable booking confirmation number'
  },
  // New: booking_source - where the booking originated
  bookingSource: {
    type: DataTypes.ENUM('online', 'offline', 'walk_in'),
    defaultValue: 'offline',
    allowNull: false,
    comment: 'Source of booking: online (website), offline (staff), walk_in (instant)'
  },
  // New: booking_type - daily or monthly
  bookingType: {
    type: DataTypes.ENUM('daily', 'monthly'),
    defaultValue: 'daily',
    allowNull: false,
    comment: 'Type of booking: daily for hotels, monthly for PG'
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      notNull: true
    }
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      notNull: true,
      isAfterCheckIn(value) {
        if (this.checkIn && value <= this.checkIn) {
          throw new Error('Check-out date must be after check-in date');
        }
      }
    }
  },
  // New: actual check-in/check-out timestamps
  actualCheckInTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Actual timestamp when guest checked in'
  },
  actualCheckOutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Actual timestamp when guest checked out'
  },
  guests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
      notNull: true
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      notNull: true
    }
  },
  // New: paid_amount - track partial payments
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Amount paid so far'
  },
  // Updated status enum with new values
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  // Updated payment status enum
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: [0, 500]
    }
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidContactInfo(value) {
        if (!value.phone || !value.email) {
          throw new Error('Contact phone and email are required');
        }
        // Accept phone with optional country code (+91) or plain 10-digit
        const digits = value.phone.replace(/[^0-9]/g, '');
        if (digits.length < 10) {
          throw new Error('Phone must have at least 10 digits');
        }
        if (!/^\S+@\S+\.\S+$/.test(value.email)) {
          throw new Error('Email must be valid');
        }
      }
    }
  },
  // New: check-in details
  checkInNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes recorded during check-in'
  },
  checkInBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Staff who processed check-in'
  },
  // New: check-out details
  checkOutNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes recorded during check-out'
  },
  checkOutBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Staff who processed check-out'
  },
  // New: room inspection flag
  roomInspected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether room was inspected at check-out'
  },
  // New: guest profile reference
  guestProfileId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'guest_profiles',
      key: 'id'
    },
    comment: 'Reference to guest profile for returning guests'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.ENUM('user', 'owner', 'admin'),
    allowNull: true
  }
  // Amadeus integration fields (virtual - columns not yet in DB)
  // These will be added when Amadeus booking integration is implemented
}, {
  tableName: 'bookings',
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['room_id', 'check_in', 'check_out']
    },
    {
      fields: ['status', 'created_at']
    },
    {
      fields: ['owner_id']
    },
    {
      fields: ['booking_number'],
      unique: true
    },
    {
      fields: ['property_id']
    },
    {
      fields: ['booking_source']
    },
    {
      fields: ['guest_profile_id']
    },
    {
      fields: ['booking_provider']
    },
    {
      fields: ['external_booking_id'],
      unique: true,
      where: {
        external_booking_id: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      fields: ['external_hotel_id']
    }
  ],
  hooks: {
    beforeValidate: async (booking) => {
      // Calculate total amount if check-in/check-out dates are provided
      if (booking.checkIn && booking.checkOut && booking.guests) {
        const duration = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
        
        // Get room price (this would need to be done in the route handler with proper association)
        // For now, we'll set it in the route handler
      }
    }
  }
});

// Instance methods
Booking.prototype.getDuration = function() {
  if (this.checkIn && this.checkOut) {
    return Math.ceil((new Date(this.checkOut) - new Date(this.checkIn)) / (1000 * 60 * 60 * 24));
  }
  return 0;
};

Booking.prototype.canBeCancelled = function() {
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const daysUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60 * 24);
  
  return (this.status === 'confirmed' || this.status === 'pending') && daysUntilCheckIn > 1;
};

// New: Check if booking can be checked in
Booking.prototype.canCheckIn = function() {
  return this.status === 'confirmed';
};

// New: Check if booking can be checked out
Booking.prototype.canCheckOut = function() {
  return this.status === 'confirmed';
};

// New: Get outstanding balance
Booking.prototype.getOutstandingBalance = function() {
  return parseFloat(this.totalAmount) - parseFloat(this.paidAmount);
};

// New: Check if fully paid
Booking.prototype.isFullyPaid = function() {
  return parseFloat(this.paidAmount) >= parseFloat(this.totalAmount);
};

// Static method: Valid status transitions
Booking.getValidTransitions = function() {
  return {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['completed', 'cancelled'],
    'completed': ['refunded'],
    'cancelled': [],
    'refunded': []
  };
};

// Static method: Validate status transition
Booking.isValidTransition = function(fromStatus, toStatus) {
  const validTransitions = Booking.getValidTransitions();
  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

module.exports = Booking;