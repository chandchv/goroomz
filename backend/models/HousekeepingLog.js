const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HousekeepingLog = sequelize.define('HousekeepingLog', {
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
  cleanedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  cleanedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 480
    }
  },
  checklistCompleted: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    validate: {
      isValidChecklist(value) {
        if (value && Array.isArray(value)) {
          value.forEach(item => {
            if (!item.item || typeof item.item !== 'string') {
              throw new Error('Each checklist item must have an item name');
            }
            if (typeof item.completed !== 'boolean') {
              throw new Error('Each checklist item must have a completed boolean');
            }
          });
        }
      }
    }
  },
  issuesFound: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'housekeeping_logs',
  underscored: true,
  indexes: [
    {
      fields: ['room_id']
    },
    {
      fields: ['cleaned_by']
    },
    {
      fields: ['cleaned_at']
    }
  ]
});

module.exports = HousekeepingLog;
