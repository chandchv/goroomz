const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Discount = sequelize.define('Discount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed_amount'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  maxDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  applicablePlans: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: ['basic', 'premium', 'enterprise']
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'discounts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

// Instance methods
Discount.prototype.isValid = function() {
  const now = new Date();
  
  if (!this.isActive) return false;
  if (now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  
  return true;
};

Discount.prototype.calculateDiscount = function(amount, planType) {
  if (!this.isValid()) return 0;
  if (this.applicablePlans && !this.applicablePlans.includes(planType)) return 0;
  if (this.minOrderAmount && amount < this.minOrderAmount) return 0;
  
  let discountAmount = 0;
  
  if (this.type === 'percentage') {
    discountAmount = (amount * this.value) / 100;
    if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  } else if (this.type === 'fixed_amount') {
    discountAmount = Math.min(this.value, amount);
  }
  
  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
};

module.exports = Discount;