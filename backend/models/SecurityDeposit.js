const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SecurityDeposit = sequelize.define('SecurityDeposit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'bookings',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  collectedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('collected', 'refunded', 'partially_refunded'),
    allowNull: false,
    defaultValue: 'collected'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  refundDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  deductions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidDeductions(value) {
        if (value && Array.isArray(value)) {
          value.forEach(deduction => {
            if (!deduction.reason || typeof deduction.reason !== 'string') {
              throw new Error('Each deduction must have a reason');
            }
            if (!deduction.amount || isNaN(deduction.amount)) {
              throw new Error('Each deduction must have a valid amount');
            }
          });
        }
      }
    }
  },
  refundedBy: {
    type: DataTypes.UUID,
    allowNull: true,
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
  tableName: 'security_deposits',
  underscored: true,
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['collected_date']
    }
  ]
});

module.exports = SecurityDeposit;
