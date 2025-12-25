/**
 * Import Properties from JSON Export
 * 
 * Imports PG properties from the pg_data_export_2025-10-24.json file
 * into the database as Room records with associated property owners.
 */

const { User, Room } = require('../models');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Read the JSON file
const jsonFilePath = path.join(__dirname, '../pg_data_export_2025-10-24.json');

async function importProperties() {
  try {
    console.log('📥 Starting property import from JSON...\n');

    // Read and parse JSON file
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);

    console.log(`📊 Found ${data.totalRecords} properties in export file`);
    console.log(`📅 Export date: ${data.exportDate}\n`);

    let propertiesCreated = 0;
    let propertiesSkipped = 0;
    let ownersCreated = 0;

    // Create a default property owner for imported properties
    const defaultOwnerEmail = 'imported.properties@goroomz.com';
    let defaultOwner = await User.findOne({ where: { email: defaultOwnerEmail } });

    if (!defaultOwner) {
      defaultOwner = await User.create({
        name: 'Imported Properties Owner',
        email: defaultOwnerEmail,
        password: await bcrypt.hash('ImportedOwner123!', 10),
        phone: '+919999999999',
        role: 'owner',
        isActive: true,
        isVerified: true,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India'
      });
      console.log(`✅ Created default owner: ${defaultOwner.name} (${defaultOwner.email})\n`);
      ownersCreated++;
    } else {
      console.log(`✓ Using existing default owner: ${defaultOwner.email}\n`);
    }

    // Import each property
    for (const pg of data.pgs) {
      try {
        // Check if property already exists by title
        const existingProperty = await Room.findOne({
          where: { title: pg.title }
        });

        if (existingProperty) {
          console.log(`⏭️  Skipped: ${pg.title.substring(0, 60)}... (already exists)`);
          propertiesSkipped++;
          continue;
        }

        // Map PG data to Room model structure
        const roomData = {
          title: pg.title || 'Untitled Property',
          description: pg.description || '',
          price: parseFloat(pg.price) || 0,
          location: {
            address: pg.location?.address || '',
            city: pg.location?.city || 'Unknown',
            state: pg.location?.state || 'Unknown',
            country: 'India',
            area: pg.location?.area || '',
            pincode: pg.location?.pincode || '',
            latitude: pg.location?.latitude || null,
            longitude: pg.location?.longitude || null
          },
          roomType: pg.roomType || 'Private Room',
          category: pg.category || 'PG',
          maxGuests: pg.maxGuests || 2,
          amenities: pg.amenities || [],
          images: pg.images || [],
          rules: pg.rules || [],
          contact: pg.contact || '',
          isAvailable: true,
          isVerified: true,
          status: 'active',
          ownerId: defaultOwner.id,
          totalBeds: pg.pgOptions?.single ? 1 : (pg.pgOptions?.double ? 2 : 1),
          availableBeds: 1,
          pricingType: pg.pricingType || 'monthly',
          pgOptions: pg.pgOptions || null,
          rating: pg.rating || null
        };

        await Room.create(roomData);
        
        const cityDisplay = (pg.location?.city || 'Unknown').padEnd(15);
        const priceDisplay = `₹${pg.price || 0}`.padEnd(10);
        console.log(`✅ ${propertiesCreated + 1}. ${cityDisplay} | ${priceDisplay} | ${pg.title.substring(0, 50)}...`);
        propertiesCreated++;

      } catch (error) {
        console.error(`❌ Error importing property: ${pg.title?.substring(0, 40)}...`);
        console.error(`   Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✨ Import complete!`);
    console.log(`   Properties created: ${propertiesCreated}`);
    console.log(`   Properties skipped: ${propertiesSkipped} (already exist)`);
    console.log(`   Owners created: ${ownersCreated}`);
    console.log(`   Total in file: ${data.totalRecords}`);
    console.log('='.repeat(80));
    console.log(`\n📧 Default owner email: ${defaultOwnerEmail}`);
    console.log(`🔑 Default owner password: ImportedOwner123!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing properties:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the import
importProperties();
