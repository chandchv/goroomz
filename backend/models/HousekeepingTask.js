const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HousekeepingTask = sequelize.define('HousekeepingTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'room_id',
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  cleanedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'cleaned_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cleanedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cleaned_at'
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'time_taken',
    comment: 'Duration in minutes'
  },
  checklistCompleted: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'checklist_completed'
  },
  issuesFound: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'issues_found'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'housekeeping_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = HousekeepingTask;
