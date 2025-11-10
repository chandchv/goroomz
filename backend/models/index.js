const { sequelize } = require('../config/database');
const User = require('./User');
const Room = require('./Room');
const RoomType = require('./RoomType');
const Booking = require('./Booking');
const Category = require('./Category');

// Define associations
User.hasMany(Room, {
  foreignKey: 'ownerId',
  as: 'ownedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

// Category owner associations
User.hasMany(Room, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwnedRooms'
});

Room.belongsTo(User, {
  foreignKey: 'categoryOwnerId',
  as: 'categoryOwner'
});

// Admin approval associations
Room.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approvedByUser'
});

User.hasMany(Booking, {
  foreignKey: 'userId',
  as: 'bookings'
});

Booking.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Booking, {
  foreignKey: 'ownerId',
  as: 'receivedBookings'
});

Booking.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

Room.hasMany(Booking, {
  foreignKey: 'roomId',
  as: 'bookings'
});

Booking.belongsTo(Room, {
  foreignKey: 'roomId',
  as: 'room'
});

// Room Type associations
Room.hasMany(RoomType, {
  foreignKey: 'propertyId',
  as: 'roomTypes',
  onDelete: 'CASCADE'
});

RoomType.belongsTo(Room, {
  foreignKey: 'propertyId',
  as: 'property'
});

// Sync database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Room,
  RoomType,
  Booking,
  Category,
  syncDatabase
};
