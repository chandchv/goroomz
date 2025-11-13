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
        if (!/^[0-9]{10}$/.test(value.phone)) {
          throw new Error('Phone must be a valid 10-digit number');
        }
        if (!/^\S+@\S+\.\S+$/.test(value.email)) {
          throw new Error('Email must be valid');
        }
      }
    }
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
}, {
  tableName: 'bookings',
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
  
  return this.status === 'confirmed' && daysUntilCheckIn > 1;
};

module.exports = Booking;