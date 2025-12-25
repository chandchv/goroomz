const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  planName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  planType: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    allowNull: false,
    defaultValue: 'basic'
  },
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR',
    validate: {
      len: [3, 3]
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled', 'suspended'),
    allowNull: false,
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  nextBillingDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      maxRooms: 10,
      maxBookings: 100,
      advancedReports: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false
    }
  },
  discountId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['property_owner_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['end_date']
    },
    {
      fields: ['next_billing_date']
    }
  ]
});

// Instance methods
Subscription.prototype.isExpired = function() {
  return new Date() > this.endDate;
};

Subscription.prototype.daysUntilExpiry = function() {
  const now = new Date();
  const expiry = new Date(this.endDate);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

Subscription.prototype.calculateProration = function(newAmount, upgradeDate = new Date()) {
  const currentPeriodStart = new Date(this.startDate);
  const currentPeriodEnd = new Date(this.endDate);
  const totalDays = Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((currentPeriodEnd - upgradeDate) / (1000 * 60 * 60 * 24));
  
  if (remainingDays <= 0) return 0;
  
  const currentDailyRate = this.amount / totalDays;
  const newDailyRate = newAmount / totalDays;
  const proratedAmount = (newDailyRate - currentDailyRate) * remainingDays;
  
  return Math.max(0, proratedAmount);
};

module.exports = Subscription;