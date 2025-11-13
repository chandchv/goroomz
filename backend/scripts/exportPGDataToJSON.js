const fs = require('fs');
const { sequelize } = require('../config/database');
const { Room } = require('../models');

async function exportPGDataToJSON() {
  try {
    console.log('📊 Exporting PG data to JSON...');
    
    // Get all PG rooms from database
    const pgRooms = await Room.findAll({
      where: {
        category: 'PG'
      },
      order: [['created_at', 'DESC']]
    });

    console.log(`Found ${pgRooms.length} PG records in database`);

    if (pgRooms.length === 0) {
      console.log('❌ No PG data found in database');
      return;
    }

    // Transform data for JSON export
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: pgRooms.length,
      source: 'GoRoomz Database',
      pgs: pgRooms.map(room => ({
        id: room.id,
        title: room.title,
        description: room.description,
        price: room.price,
        location: {
          address: room.location?.address || '',
          city: room.location?.city || '',
          state: room.location?.state || '',
          area: room.location?.area || ''
        },
        amenities: room.amenities || [],
        contact: room.contact || '',
        maxGuests: room.maxGuests || 2,
        rating: {
          average: room.rating?.average || 0,
          count: room.rating?.count || 0
        },
        rules: room.rules || [],
        pgOptions: {
          single: room.pgOptions?.sharingPrices?.single || 0,
          double: room.pgOptions?.sharingPrices?.double || 0,
          triple: room.pgOptions?.sharingPrices?.triple || 0,
          quad: room.pgOptions?.sharingPrices?.quad || 0
        },
        pricingType: room.pricingType || 'monthly',
        isActive: room.isActive,
        featured: room.featured,
        createdAt: room.created_at,
        source: room.source || 'manual'
      }))
    };

    // Write to JSON file
    const filename = `pg_data_export_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = `./${filename}`;
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log(`✅ JSON file created: ${filepath}`);
    console.log(`📈 Exported ${pgRooms.length} PG records`);
    
    // Show summary statistics
    console.log('\n📊 Export Summary:');
    console.log(`Total PGs: ${pgRooms.length}`);
    
    const areas = [...new Set(pgRooms.map(room => room.location?.area).filter(Boolean))];
    console.log(`Areas covered: ${areas.length} - ${areas.join(', ')}`);
    
    const avgPrice = pgRooms.reduce((sum, room) => sum + (room.price || 0), 0) / pgRooms.length;
    console.log(`Average price: ₹${avgPrice.toFixed(2)}`);
    
    const amenitiesCount = {};
    pgRooms.forEach(room => {
      (room.amenities || []).forEach(amenity => {
        amenitiesCount[amenity] = (amenitiesCount[amenity] || 0) + 1;
      });
    });
    
    console.log('\n🏠 Top Amenities:');
    Object.entries(amenitiesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([amenity, count]) => {
        console.log(`  ${amenity}: ${count} PGs`);
      });

    // Show sample data
    console.log('\n📋 Sample of exported data:');
    console.log('First 3 records:');
    pgRooms.slice(0, 3).forEach((room, index) => {
      console.log(`\n${index + 1}. ${room.title}`);
      console.log(`   Location: ${room.location?.address || 'N/A'}`);
      console.log(`   Price: ₹${room.price || 'N/A'}`);
      console.log(`   Amenities: ${(room.amenities || []).join(', ') || 'N/A'}`);
      console.log(`   Contact: ${room.contact || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error exporting PG data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the export
if (require.main === module) {
  exportPGDataToJSON();
}

module.exports = { exportPGDataToJSON };
