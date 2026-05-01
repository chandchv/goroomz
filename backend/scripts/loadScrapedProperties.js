/**
 * Script to load scraped properties JSON into the database
 * Assigns admin user as default owner
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Property, User } = require('../models');

const JSON_FILE = path.join(__dirname, '..', 'scraped_properties_import.json');

async function loadProperties() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Read JSON file
    if (!fs.existsSync(JSON_FILE)) {
      console.error('❌ JSON file not found. Run importScrapedPGs.js first.');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📁 Loaded ${data.properties.length} properties from JSON`);

    // Find admin user
    const adminUser = await User.findOne({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`👤 Using admin user: ${adminUser.name} (${adminUser.id})`);

    // Import properties
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const prop of data.properties) {
      try {
        // Check if property already exists (by original ID in metadata)
        const existing = await Property.findOne({
          where: sequelize.literal(`metadata->>'originalId' = '${prop.metadata.originalId}'`)
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Replace placeholder with actual admin ID
        prop.ownerId = adminUser.id;

        // Create property
        await Property.create(prop);
        imported++;

        if (imported % 10 === 0) {
          console.log(`   Imported ${imported} properties...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error importing ${prop.name}: ${error.message}`);
      }
    }

    console.log('\n📊 Import Complete:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Load failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  loadProperties();
}

module.exports = { loadProperties };
