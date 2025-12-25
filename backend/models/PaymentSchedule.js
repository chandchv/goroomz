const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentSchedule = sequelize.define('PaymentSchedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  bedId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bed_assignments',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paidDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'payments',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  daysOverdue: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.status === 'overdue' && this.dueDate) {
        const today = new Date();
        const due = new Date(this.dueDate);
        const diffTime = today - due;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      }
      return 0;
    }
  }
}, {
  tableName: 'payment_schedules',
  underscored: true,
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['bed_id']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = PaymentSchedule;
