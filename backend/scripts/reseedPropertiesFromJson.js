const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

async function reseedPropertiesFromJson() {
  try {
    console.log('🚀 Starting property reseeding process...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Read the JSON file
    const jsonPath = path.join(__dirname, '..', 'pg_data_export_2025-10-24.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at: ${jsonPath}`);
    }
    
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📄 Loaded ${jsonData.pgs.length} properties from JSON file`);
    
    // Get default category (PG category)
    const [categories] = await sequelize.query(
      "SELECT id FROM categories WHERE name = 'PG' LIMIT 1"
    );
    
    if (categories.length === 0) {
      throw new Error('No PG category found in database. Please create categories first.');
    }
    
    const defaultCategoryId = categories[0].id;
    console.log(`📂 Using category ID: ${defaultCategoryId}`);
    
    // Get default owner (use the first available owner)
    const defaultOwner = await User.findOne({
      where: { role: ['owner', 'category_owner'] },
      attributes: ['id', 'name', 'email']
    });
    
    if (!defaultOwner) {
      throw new Error('No property owners found in database. Please create owners first.');
    }
    
    console.log(`👤 Using default owner: ${defaultOwner.name} (${defaultOwner.email})`);
    
    // Clear existing properties
    console.log('🗑️  Clearing existing properties...');
    const deletedCount = await Property.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedCount} existing properties`);
    
    // Transform and insert new properties
    console.log('📥 Inserting new properties...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const pgData of jsonData.pgs) {
      try {
        // Map old structure to new Property model
        const propertyData = {
          id: pgData.id, // Keep original UUID
          name: pgData.title || 'Unnamed Property',
          description: pgData.description || '',
          type: 'pg', // All entries are PGs
          categoryId: defaultCategoryId,
          ownerId: defaultOwner.id,
          location: {
            address: pgData.location?.address || '',
            city: pgData.location?.city || 'Bangalore',
            state: pgData.location?.state || 'Karnataka',
            country: 'India',
            area: pgData.location?.area || '',
            pincode: null,
            latitude: null,
            longitude: null
          },
          contactInfo: {
            phone: pgData.contact || '',
            email: null,
            website: null
          },
          amenities: pgData.amenities || [],
          images: [], // No images in the JSON data
          rules: pgData.rules || [],
          totalFloors: 1, // Default
          totalRooms: 0, // Will be calculated later
          checkInTime: '12:00:00',
          checkOutTime: '11:00:00',
          rating: {
            average: pgData.rating?.average || 0,
            count: pgData.rating?.count || 0
          },
          isActive: pgData.isActive !== false, // Default to true
          isFeatured: pgData.featured === true,
          approvalStatus: 'approved', // Assume all imported properties are approved
          approvedAt: new Date(pgData.createdAt || Date.now()),
          approvedBy: null,
          rejectionReason: null,
          metadata: {
            source: pgData.source || 'manual',
            originalPrice: pgData.price,
            maxGuests: pgData.maxGuests,
            pgOptions: pgData.pgOptions,
            pricingType: pgData.pricingType || 'monthly',
            importedAt: new Date().toISOString(),
            originalCreatedAt: pgData.createdAt
          }
        };
        
        // Validate required fields
        if (!propertyData.name || propertyData.name.length < 3) {
          console.warn(`⚠️  Skipping property with invalid name: ${pgData.id}`);
          errorCount++;
          continue;
        }
        
        if (!propertyData.location.address || !propertyData.location.city || !propertyData.location.state) {
          console.warn(`⚠️  Fixing incomplete location for property: ${pgData.id}`);
          propertyData.location.address = propertyData.location.address || 'Address not provided';
          propertyData.location.city = propertyData.location.city || 'Bangalore';
          propertyData.location.state = propertyData.location.state || 'Karnataka';
        }
        
        // Create the property
        await Property.create(propertyData);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`📊 Progress: ${successCount}/${jsonData.pgs.length} properties imported`);
        }
        
      } catch (error) {
        console.error(`❌ Error importing property ${pgData.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Property reseeding completed!');
    console.log(`✅ Successfully imported: ${successCount} properties`);
    console.log(`❌ Failed to import: ${errorCount} properties`);
    console.log(`📊 Total processed: ${successCount + errorCount} properties`);
    
    // Verify the import
    const totalProperties = await Property.count();
    console.log(`🔍 Verification: ${totalProperties} properties now in database`);
    
  } catch (error) {
    console.error('💥 Fatal error during reseeding:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script if called directly
if (require.main === module) {
  reseedPropertiesFromJson()
    .then(() => {
      console.log('✨ Reseeding process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💀 Reseeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { reseedPropertiesFromJson };