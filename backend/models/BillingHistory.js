const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BillingHistory = sequelize.define('BillingHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  subscriptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'id'
    }
  },
  propertyOwnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('invoice', 'payment', 'refund', 'adjustment'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gatewayResponse: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  billingPeriodStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  billingPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  discountApplied: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  processedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'billing_history',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['subscription_id']
    },
    {
      fields: ['property_owner_id']
    },
    {
      fields: ['invoice_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
BillingHistory.prototype.isPaid = function() {
  return this.status === 'paid';
};

BillingHistory.prototype.isOverdue = function() {
  if (!this.dueDate || this.isPaid()) return false;
  return new Date() > this.dueDate;
};

BillingHistory.prototype.daysPastDue = function() {
  if (!this.isOverdue()) return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = now - due;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods
BillingHistory.generateInvoiceNumber = function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

module.exports = BillingHistory;