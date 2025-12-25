/**
 * Cleanup Sample Data
 * 
 * Removes all sample users and properties created by the seeding scripts
 */

const { User, Room } = require('../models');

async function cleanupSampleData() {
  try {
    console.log('🧹 Cleaning up sample data...\n');

    // Delete sample properties
    const propertiesDeleted = await Room.destroy({
      where: {
        ownerId: {
          [require('sequelize').Op.in]: require('sequelize').literal(
            `(SELECT id FROM users WHERE email LIKE '%@example.com' OR email LIKE '%@goroomz.com')`
          )
        }
      }
    });

    console.log(`✅ Deleted ${propertiesDeleted} sample properties`);

    // Delete sample users (internal users and property owners)
    const usersDeleted = await User.destroy({
      where: {
        email: {
          [require('sequelize').Op.or]: [
            { [require('sequelize').Op.like]: '%@example.com' },
            { [require('sequelize').Op.like]: '%@goroomz.com' }
          ]
        }
      }
    });

    console.log(`✅ Deleted ${usersDeleted} sample users`);

    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up sample data:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the cleanup
cleanupSampleData();
