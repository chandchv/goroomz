const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Enquiry = sequelize.define('Enquiry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'property_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  preferredDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'preferred_date'
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'visited', 'converted', 'closed'),
    defaultValue: 'new'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'responded_at'
  },
  respondedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'responded_by'
  }
}, {
  tableName: 'enquiries',
  underscored: true,
  timestamps: true
});

module.exports = Enquiry;
