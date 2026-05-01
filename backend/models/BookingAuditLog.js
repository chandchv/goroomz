const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BookingAuditLog = sequelize.define('BookingAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Reference to booking
  bookingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id'
    },
    comment: 'Reference to the booking being audited'
  },
  // Action performed
  action: {
    type: DataTypes.ENUM(
      'created',
      'status_changed',
      'modified',
      'check_in',
      'check_out',
      'payment_received',
      'payment_recorded',
      'payment_refunded',
      'deposit_collected',
      'deposit_refunded',
      'room_changed',
      'room_status_changed',
      'dates_changed',
      'cancelled',
      'no_show_marked',
      'manager_approval_checkout'
    ),
    allowNull: false,
    comment: 'Type of action performed'
  },
  // Old and new values for tracking changes
  oldValue: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Previous state/values before the action'
  },
  newValue: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'New state/values after the action'
  },
  // Who performed the action
  performedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who performed the action'
  },
  // When the action was performed
  performedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'Timestamp when action was performed'
  },
  // Additional context
  ipAddress: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP address of the user who performed the action'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes or reason for the action'
  }
}, {
  tableName: 'booking_audit_logs',
  underscored: true,
  timestamps: false, // We use performedAt instead
  indexes: [
    {
      fields: ['booking_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['performed_by']
    },
    {
      fields: ['performed_at']
    },
    {
      fields: ['booking_id', 'action']
    }
  ]
});

// Static method: Create audit log entry
BookingAuditLog.logAction = async function(bookingId, action, options = {}) {
  const {
    oldValue = null,
    newValue = null,
    performedBy = null,
    ipAddress = null,
    notes = null
  } = options;

  return await BookingAuditLog.create({
    bookingId,
    action,
    oldValue,
    newValue,
    performedBy,
    ipAddress,
    notes
  });
};

// Static method: Log status change
BookingAuditLog.logStatusChange = async function(bookingId, oldStatus, newStatus, performedBy, notes = null) {
  return await BookingAuditLog.logAction(bookingId, 'status_changed', {
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    performedBy,
    notes
  });
};

// Static method: Log check-in
BookingAuditLog.logCheckIn = async function(bookingId, performedBy, details = {}) {
  return await BookingAuditLog.logAction(bookingId, 'check_in', {
    newValue: {
      actualCheckInTime: new Date(),
      ...details
    },
    performedBy,
    notes: details.notes
  });
};

// Static method: Log check-out
BookingAuditLog.logCheckOut = async function(bookingId, performedBy, details = {}) {
  return await BookingAuditLog.logAction(bookingId, 'check_out', {
    newValue: {
      actualCheckOutTime: new Date(),
      ...details
    },
    performedBy,
    notes: details.notes
  });
};

// Static method: Log payment
BookingAuditLog.logPayment = async function(bookingId, amount, method, performedBy, notes = null) {
  return await BookingAuditLog.logAction(bookingId, 'payment_received', {
    newValue: {
      amount,
      method,
      timestamp: new Date()
    },
    performedBy,
    notes
  });
};

// Static method: Log room change
BookingAuditLog.logRoomChange = async function(bookingId, oldRoomId, newRoomId, performedBy, notes = null) {
  return await BookingAuditLog.logAction(bookingId, 'room_changed', {
    oldValue: { roomId: oldRoomId },
    newValue: { roomId: newRoomId },
    performedBy,
    notes
  });
};

// Static method: Log date change
BookingAuditLog.logDateChange = async function(bookingId, oldDates, newDates, performedBy, notes = null) {
  return await BookingAuditLog.logAction(bookingId, 'dates_changed', {
    oldValue: oldDates,
    newValue: newDates,
    performedBy,
    notes
  });
};

// Static method: Get audit trail for a booking
BookingAuditLog.getAuditTrail = async function(bookingId, options = {}) {
  const { limit = 50, offset = 0, action = null } = options;
  
  const where = { bookingId };
  if (action) {
    where.action = action;
  }
  
  return await BookingAuditLog.findAll({
    where,
    order: [['performedAt', 'DESC']],
    limit,
    offset
  });
};

module.exports = BookingAuditLog;
