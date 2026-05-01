const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'booking_id',
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_date'
  },
  paymentType: {
    type: DataTypes.ENUM('booking', 'monthly_rent', 'security_deposit'),
    allowNull: true,
    defaultValue: 'booking',
    field: 'payment_type'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'upi', 'bank_transfer', 'card'),
    allowNull: true,
    defaultValue: 'cash',
    field: 'payment_method'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: true,
    defaultValue: 'completed'
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'transaction_reference'
  },
  recordedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'recorded_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
