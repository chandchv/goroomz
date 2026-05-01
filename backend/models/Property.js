const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('pg', 'hostel', 'hotel', 'apartment'),
    allowNull: false
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'category_id'
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'owner_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  contactInfo: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'contact_info',
    defaultValue: {}
  },
  amenities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  rules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  totalFloors: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_floors'
  },
  totalRooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_rooms'
  },
  checkInTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'check_out_time'
  },
  rating: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    field: 'approval_status'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'properties',
  timestamps: true,
  indexes: [
    {
      fields: ['owner_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['approval_status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['slug'],
      unique: true
    }
  ]
});

// Helper function to generate slug from name
Property.generateSlug = function(name, city, area) {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  // Add location for uniqueness
  if (city) {
    slug += `-${city.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }
  if (area) {
    slug += `-${area.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }
  
  return slug;
};

// Hook to auto-generate slug before create/update
Property.beforeValidate((property) => {
  if (property.name && !property.slug) {
    const city = property.location?.city || '';
    const area = property.location?.area || '';
    property.slug = Property.generateSlug(property.name, city, area);
  }
});

module.exports = Property;