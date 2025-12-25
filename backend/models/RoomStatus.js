const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomStatus = sequelize.define('RoomStatus', {
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
  status: {
    type: DataTypes.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
    allowNull: false,
    defaultValue: 'vacant_clean'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
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
  tableName: 'room_statuses',
  underscored: true,
  indexes: [
    {
      fields: ['room_id']
    },
    {
      fields: ['updated_at']
    }
  ]
});

module.exports = RoomStatus;
