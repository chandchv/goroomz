const { sequelize } = require('../models');

(async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT data_type, udt_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'delivery_method'
    `);
    
    console.log('Current notifications.delivery_method column state:');
    console.log(JSON.stringify(results, null, 2));
    
    // Also check if the enum type exists
    const [enumTypes] = await sequelize.query(`
      SELECT typname, typtype
      FROM pg_type
      WHERE typname = 'enum_notifications_delivery_method'
    `);
    
    console.log('\nEnum type check:');
    console.log(JSON.stringify(enumTypes, null, 2));
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
})();

