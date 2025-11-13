const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Room, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all rooms for admin management (no pagination limits)
router.get('/rooms', protect, authorize('admin'), async (req, res) => {
  try {
    const { Room, User } = require('../models');
    
    const rooms = await Room.findAll({
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Error fetching all rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
});

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// CSV Import endpoint
router.post('/import-csv', protect, authorize('admin'), upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No CSV file provided'
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: 0,
      total: 0,
      errorDetails: []
    };

    const rooms = [];
    const errors = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Debug: Log the first row to see what fields are available
            if (results.total === 0) {
              console.log('First CSV row fields:', Object.keys(row));
              console.log('First CSV row data:', row);
            }
            
            // Validate required fields - handle different CSV formats
            if (!row.Title || !row.Price) {
              errors.push(`Row ${results.total + 1}: Missing required fields (Title, Price). Available fields: ${Object.keys(row).join(', ')}`);
              results.errors++;
              results.total++;
              return;
            }

            // Parse amenities
            let amenities = [];
            if (row.Amenities) {
              // Handle both comma and semicolon separated amenities
              const amenityString = row.Amenities.replace(/;/g, ',').replace(/\s+/g, ' ').trim();
              amenities = amenityString.split(',').map(a => a.trim().toLowerCase()).filter(a => a.length > 0);
            }

            // Parse location - handle different column names
            const location = {
              address: row.Location_Address || row.Address || '',
              city: row.Location_City || row.City || 'Bangalore',
              state: row.Location_State || row.State || 'Karnataka',
              area: row.Location_Area || row.Area || ''
            };

            // Parse contact
            const contact = row.Contact ? row.Contact.replace(/\D/g, '').substring(0, 10) : '';

            // Determine category from title or default to PG
            const category = row.Category || (row.Title.toLowerCase().includes('pg') ? 'PG' : 'PG');
            
            // Create room object
            const roomData = {
              title: row.Title.substring(0, 100),
              description: row.Description || `Premium ${category} accommodation in ${location.area}`,
              category: category,
              roomType: category === 'PG' ? 'Shared Room' : 'Standard Room',
              pricingType: category === 'PG' ? 'monthly' : 'daily',
              price: parseFloat(row.Price) || 8000,
              maxGuests: parseInt(row.Max_Guests || row.MaxGuests) || 2,
              location: location,
              amenities: amenities.length > 0 ? amenities : ['wifi', 'meals', 'security'],
              contact: contact,
              images: [{
                url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
                isPrimary: true
              }],
              ownerId: req.user.id,
              isActive: true,
              featured: false,
              rating: {
                average: parseFloat(row.Rating_Average) || 4.2,
                count: parseInt(row.Rating_Count) || Math.floor(Math.random() * 50) + 10
              },
              rules: row.Rules ? row.Rules.split(';').map(rule => rule.trim()).filter(rule => rule.length > 0) : [
                'No smoking inside the premises',
                'Visitors allowed only during day time',
                'Maintain cleanliness',
                'Follow house rules'
              ]
            };

            // Add PG-specific options
            if (category === 'PG') {
              roomData.pgOptions = {
                sharingPrices: {
                  single: parseFloat(row.PG_Options_Single) || 12000,
                  double: parseFloat(row.PG_Options_Double) || 8000,
                  triple: parseFloat(row.PG_Options_Triple) || 6000,
                  quad: parseFloat(row.PG_Options_Quad) || 5000
                }
              };
            }

            rooms.push(roomData);
            results.total++;

          } catch (error) {
            errors.push(`Row ${results.total + 1}: ${error.message}`);
            results.errors++;
            results.total++;
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Find or create default owner for imported rooms
    let defaultOwner = await User.findOne({ where: { email: 'imported@goroomz.com' } });
    if (!defaultOwner) {
      defaultOwner = await User.create({
        name: 'Imported PG Data',
        email: 'imported@goroomz.com',
        phone: '0000000000',
        role: 'owner',
        password: 'imported123'
      });
    }

    // Import rooms to database
    for (const roomData of rooms) {
      try {
        // Check if room already exists
        const existingRoom = await Room.findOne({
          where: {
            title: roomData.title,
            location: roomData.location.address
          }
        });

        if (existingRoom) {
          results.skipped++;
          continue;
        }

        // Create new room
        await Room.create({
          ...roomData,
          ownerId: defaultOwner.id
        });

        results.imported++;

      } catch (error) {
        errors.push(`Failed to import "${roomData.title}": ${error.message}`);
        results.errors++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `CSV import completed. ${results.imported} rooms imported, ${results.skipped} skipped, ${results.errors} errors.`,
      data: {
        ...results,
        errorDetails: errors.slice(0, 10) // Limit error details to first 10
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'CSV import failed',
      error: error.message
    });
  }
});

module.exports = router;
