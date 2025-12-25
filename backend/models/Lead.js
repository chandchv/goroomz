const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  propertyOwnerName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidPhone(value) {
        const phone = value.trim();
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          throw new Error('Phone number must be 10-15 digits and may start with +');
        }
      }
    }
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 200]
    }
  },
  propertyType: {
    type: DataTypes.ENUM('hotel', 'pg'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'India',
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  estimatedRooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10000
    }
  },
  status: {
    type: DataTypes.ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
    allowNull: false,
    defaultValue: 'contacted'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 100]
    }
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
  expectedCloseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'leads',
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
      fields: ['status']
    },
    {
      fields: ['email']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Lead;
