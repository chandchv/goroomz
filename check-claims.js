const { sequelize } = require('./models');

async function check() {
  try {
    // Check if property_claims table exists
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'property_claims'
    `);
    console.log('property_claims table exists:', tables.length > 0);

    if (tables.length > 0) {
      const [cols] = await sequelize.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'property_claims' ORDER BY ordinal_position
      `);
      console.log('Columns:', cols.map(c => c.column_name).join(', '));
    }

    // Check if notificationService exists
    try {
      const ns = require('./services/notificationService');
      console.log('notificationService loaded:', typeof ns);
      console.log('Has sendPropertyClaimSubmittedNotification:', typeof ns.sendPropertyClaimSubmittedNotification);
    } catch (e) {
      console.log('notificationService error:', e.message);
    }

    // Check optionalAuth middleware
    try {
      const { optionalAuth } = require('./middleware/auth');
      console.log('optionalAuth exists:', typeof optionalAuth);
    } catch (e) {
      console.log('optionalAuth error:', e.message);
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
check();
