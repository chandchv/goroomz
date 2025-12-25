const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BedAssignment = sequelize.define('BedAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  bedNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10
    }
  },
  status: {
    type: DataTypes.ENUM('occupied', 'vacant'),
    allowNull: false,
    defaultValue: 'vacant'
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  occupantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'bed_assignments',
  underscored: true,
  indexes: [
    {
      fields: ['room_id']
    },
    {
      fields: ['booking_id']
    },
    {
      unique: true,
      fields: ['room_id', 'bed_number']
    }
  ]
});

module.exports = BedAssignment;
