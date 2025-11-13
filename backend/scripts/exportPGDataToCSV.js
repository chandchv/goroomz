const fs = require('fs');
const { sequelize } = require('../config/database');
const { Room } = require('../models');

async function exportPGDataToCSV() {
  try {
    console.log('📊 Exporting PG data to CSV...');
    
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

    // Create CSV header
    const headers = [
      'ID',
      'Title', 
      'Description',
      'Price',
      'Location_Address',
      'Location_City',
      'Location_State',
      'Location_Area',
      'Amenities',
      'Contact',
      'Max_Guests',
      'Rating_Average',
      'Rating_Count',
      'Rules',
      'PG_Options_Single',
      'PG_Options_Double', 
      'PG_Options_Triple',
      'PG_Options_Quad',
      'Primary_Image_URL',
      'All_Image_URLs',
      'Image_Count',
      'Created_At',
      'Source'
    ];

    // Convert data to CSV format
    const csvRows = [headers.join(',')];

    pgRooms.forEach(room => {
      // Extract image data
      const images = room.images || [];
      const primaryImage = images.find(img => img.isPrimary) || images[0];
      const primaryImageUrl = primaryImage?.url || '';
      const allImageUrls = images.map(img => img.url).join('; ');
      const imageCount = images.length;

      const row = [
        `"${room.id}"`,
        `"${(room.title || '').replace(/"/g, '""')}"`,
        `"${(room.description || '').replace(/"/g, '""')}"`,
        room.price || 0,
        `"${(room.location?.address || '').replace(/"/g, '""')}"`,
        `"${room.location?.city || ''}"`,
        `"${room.location?.state || ''}"`,
        `"${room.location?.area || ''}"`,
        `"${(room.amenities || []).join('; ')}"`,
        `"${room.contact || ''}"`,
        room.maxGuests || 2,
        room.rating?.average || 0,
        room.rating?.count || 0,
        `"${(room.rules || []).join('; ')}"`,
        room.pgOptions?.sharingPrices?.single || 0,
        room.pgOptions?.sharingPrices?.double || 0,
        room.pgOptions?.sharingPrices?.triple || 0,
        room.pgOptions?.sharingPrices?.quad || 0,
        `"${primaryImageUrl}"`,
        `"${allImageUrls}"`,
        imageCount,
        `"${room.created_at}"`,
        `"${room.source || 'manual'}"`
      ];
      csvRows.push(row.join(','));
    });

    // Write to CSV file
    const csvContent = csvRows.join('\n');
    const filename = `pg_data_export_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
    const filepath = `./${filename}`;
    
    fs.writeFileSync(filepath, csvContent, 'utf8');
    
    console.log(`✅ CSV file created: ${filepath}`);
    console.log(`📈 Exported ${pgRooms.length} PG records`);
    
    // Show sample data
    console.log('\n📋 Sample of exported data:');
    console.log('First 3 records:');
    pgRooms.slice(0, 3).forEach((room, index) => {
      const images = room.images || [];
      const primaryImage = images.find(img => img.isPrimary) || images[0];
      
      console.log(`\n${index + 1}. ${room.title}`);
      console.log(`   Location: ${room.location?.address || 'N/A'}`);
      console.log(`   Price: ₹${room.price || 'N/A'}`);
      console.log(`   Amenities: ${(room.amenities || []).join(', ') || 'N/A'}`);
      console.log(`   Contact: ${room.contact || 'N/A'}`);
      console.log(`   Images: ${images.length} total`);
      if (primaryImage) {
        console.log(`   Primary Image: ${primaryImage.url}`);
      }
    });

  } catch (error) {
    console.error('❌ Error exporting PG data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the export
if (require.main === module) {
  exportPGDataToCSV();
}

module.exports = { exportPGDataToCSV };
