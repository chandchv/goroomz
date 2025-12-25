const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AgentTarget = sequelize.define('AgentTarget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'territories',
      key: 'id'
    }
  },
  period: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isAfterStartDate(value) {
        if (this.startDate && value <= this.startDate) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  targetProperties: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  targetRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  actualProperties: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  actualRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  setBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Regional manager who set the target'
  }
}, {
  tableName: 'agent_targets',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['agent_id']
    },
    {
      fields: ['territory_id']
    },
    {
      fields: ['period']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

module.exports = AgentTarget;
