const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Deposit = sequelize.define('Deposit', {
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
    allowNull: false
  },
  collectedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'collected_date',
    comment: 'Timestamp when deposit was collected'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refund_amount'
  },
  refundDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refund_date'
  },
  deductions: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  refundedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'refunded_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'held'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_method',
    defaultValue: 'cash'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'security_deposits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Deposit;
