const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Territory = sequelize.define('Territory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Basic Information
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 20],
      notEmpty: true,
      isUppercase: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Geographic Coverage
  states: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  cities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  pincodes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  
  // Management
  territoryHeadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  backupHeadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Status and Configuration
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false
  },
  
  // Capacity and Workload
  maxLeads: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 1000
    }
  },
  currentLeadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  
  // Contact Information
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 15]
    }
  },
  
  // Business Hours
  businessHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: { start: '09:00', end: '18:00', active: true },
      tuesday: { start: '09:00', end: '18:00', active: true },
      wednesday: { start: '09:00', end: '18:00', active: true },
      thursday: { start: '09:00', end: '18:00', active: true },
      friday: { start: '09:00', end: '18:00', active: true },
      saturday: { start: '09:00', end: '14:00', active: true },
      sunday: { start: '09:00', end: '14:00', active: false }
    }
  },
  
  // Performance Metrics
  averageResponseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Average response time in hours'
  },
  conversionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Additional Configuration
  autoAssignLeads: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  notificationSettings: {
    type: DataTypes.JSONB,
    defaultValue: {
      newLead: true,
      leadAssigned: true,
      leadOverdue: true,
      dailySummary: true
    }
  }
}, {
  tableName: 'territories',
  indexes: [
    {
      fields: ['code']
    },
    {
      fields: ['territoryHeadId']
    },
    {
      fields: ['isActive', 'priority']
    },
    {
      fields: ['states']
    },
    {
      fields: ['cities']
    }
  ]
});

// Instance methods
Territory.prototype.isWithinCapacity = function() {
  if (!this.maxLeads) return true;
  return this.currentLeadCount < this.maxLeads;
};

Territory.prototype.coversCityState = function(city, state) {
  const normalizedCity = city.toLowerCase().trim();
  const normalizedState = state.toLowerCase().trim();
  
  const stateMatch = this.states.some(s => s.toLowerCase().trim() === normalizedState);
  const cityMatch = this.cities.some(c => c.toLowerCase().trim() === normalizedCity);
  
  return stateMatch && cityMatch;
};

Territory.prototype.coversPincode = function(pincode) {
  if (!this.pincodes || this.pincodes.length === 0) return false;
  return this.pincodes.includes(pincode);
};

Territory.prototype.isBusinessHours = function(date = new Date()) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const dayConfig = this.businessHours[dayName];
  
  if (!dayConfig || !dayConfig.active) return false;
  
  const currentTime = date.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= dayConfig.start && currentTime <= dayConfig.end;
};

module.exports = Territory;