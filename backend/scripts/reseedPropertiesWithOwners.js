const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function reseedPropertiesWithOwners() {
  try {
    console.log('🚀 Starting comprehensive property reseeding with owner creation...');
    
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
    
    // Clear existing properties first
    console.log('🗑️  Clearing existing properties...');
    const deletedCount = await Property.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedCount} existing properties`);
    
    // Create property owners based on unique areas/locations
    console.log('👥 Creating property owners...');
    const uniqueAreas = [...new Set(jsonData.pgs.map(pg => pg.location?.area || 'unknown').filter(Boolean))];
    const ownerMap = new Map();
    
    for (let i = 0; i < uniqueAreas.length; i++) {
      const area = uniqueAreas[i];
      const ownerName = `${area.charAt(0).toUpperCase() + area.slice(1)} Property Owner`;
      const ownerEmail = `owner.${area.toLowerCase().replace(/\s+/g, '.')}@goroomz.com`;
      
      try {
        // Check if owner already exists
        let owner = await User.findOne({ where: { email: ownerEmail } });
        
        if (!owner) {
          // Create new owner
          const hashedPassword = await bcrypt.hash('password123', 10);
          owner = await User.create({
            name: ownerName,
            email: ownerEmail,
            password: hashedPassword,
            phone: `+91${9000000000 + i}`, // Generate unique phone numbers
            role: 'owner',
            isVerified: true,
            isActive: true
          });
          console.log(`✅ Created owner: ${ownerName}`);
        }
        
        ownerMap.set(area, owner.id);
      } catch (error) {
        console.error(`❌ Error creating owner for ${area}:`, error.message);
        // Use a default owner if creation fails
        const defaultOwner = await User.findOne({
          where: { role: ['owner', 'category_owner'] }
        });
        if (defaultOwner) {
          ownerMap.set(area, defaultOwner.id);
        }
      }
    }
    
    console.log(`👥 Created/found ${ownerMap.size} property owners`);
    
    // Transform and insert new properties
    console.log('📥 Inserting new properties...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const pgData of jsonData.pgs) {
      try {
        // Determine owner based on area
        const area = pgData.location?.area || 'unknown';
        const ownerId = ownerMap.get(area) || ownerMap.values().next().value;
        
        if (!ownerId) {
          throw new Error('No owner available for property');
        }
        
        // Map old structure to new Property model
        const propertyData = {
          id: pgData.id, // Keep original UUID
          name: (pgData.title || 'Unnamed Property').substring(0, 200), // Ensure max length
          description: pgData.description || '',
          type: 'pg', // All entries are PGs
          categoryId: defaultCategoryId,
          ownerId: ownerId,
          location: {
            address: pgData.location?.address || 'Address not provided',
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
          amenities: Array.isArray(pgData.amenities) ? pgData.amenities : [],
          images: [], // No images in the JSON data
          rules: Array.isArray(pgData.rules) ? pgData.rules : [],
          totalFloors: 1, // Default
          totalRooms: 0, // Will be calculated later when rooms are added
          checkInTime: '12:00:00',
          checkOutTime: '11:00:00',
          rating: {
            average: Math.min(5, Math.max(0, pgData.rating?.average || 0)),
            count: Math.max(0, pgData.rating?.count || 0)
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
            pgOptions: pgData.pgOptions || {},
            pricingType: pgData.pricingType || 'monthly',
            importedAt: new Date().toISOString(),
            originalCreatedAt: pgData.createdAt
          }
        };
        
        // Validate and clean data
        if (!propertyData.name || propertyData.name.length < 3) {
          propertyData.name = `PG Property ${pgData.id.substring(0, 8)}`;
        }
        
        // Ensure location has required fields
        if (!propertyData.location.address) {
          propertyData.location.address = 'Address not provided';
        }
        if (!propertyData.location.city) {
          propertyData.location.city = 'Bangalore';
        }
        if (!propertyData.location.state) {
          propertyData.location.state = 'Karnataka';
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
    const totalOwners = await User.count({ where: { role: ['owner', 'category_owner'] } });
    console.log(`🔍 Verification: ${totalProperties} properties and ${totalOwners} owners now in database`);
    
    // Show sample properties
    const sampleProperties = await Property.findAll({
      limit: 3,
      attributes: ['id', 'name', 'type', 'location', 'isActive', 'ownerId']
    });
    
    console.log('\n📋 Sample imported properties:');
    for (const prop of sampleProperties) {
      const owner = await User.findByPk(prop.ownerId, { attributes: ['name', 'email'] });
      console.log(`  - ${prop.name} (${prop.location.city}) - Owner: ${owner?.name}`);
    }
    
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
  reseedPropertiesWithOwners()
    .then(() => {
      console.log('✨ Comprehensive reseeding process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💀 Reseeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { reseedPropertiesWithOwners };