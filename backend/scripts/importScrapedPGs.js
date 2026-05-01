/**
 * Script to import scraped PG data from CSV and convert to Property model format
 * Assigns admin as default owner for unclaimed properties
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

// CSV file path
const CSV_FILE = path.join(__dirname, '..', 'pg_data_export_2025-10-24_1761301511948.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'scraped_properties_import.json');

/**
 * Parse amenities string to array
 */
function parseAmenities(amenitiesStr) {
  if (!amenitiesStr) return [];
  return amenitiesStr
    .split(';')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);
}

/**
 * Parse rules string to array
 */
function parseRules(rulesStr) {
  if (!rulesStr) return [];
  return rulesStr
    .split(';')
    .map(r => r.trim())
    .filter(r => r.length > 0);
}

/**
 * Extract phone number from contact or description
 */
function extractPhone(contact, description) {
  const phoneRegex = /(\d{10})/g;
  
  if (contact) {
    const match = contact.match(phoneRegex);
    if (match) return match[0];
  }
  
  if (description) {
    const match = description.match(/Contact:\s*(\d{10})/);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Extract contact name from address or description
 */
function extractContactName(address, title) {
  const contactMatch = address?.match(/Contact:\s*([A-Z\s]+)/i);
  if (contactMatch) return contactMatch[1].trim();
  
  // Try to extract from title
  const nameMatch = title?.match(/^([A-Z\s]+)\s+(NEW|PG|LUXURY)/i);
  if (nameMatch) return nameMatch[1].trim();
  
  return null;
}

/**
 * Determine gender preference from title
 */
function determineGenderPreference(title) {
  const titleLower = title?.toLowerCase() || '';
  
  if (titleLower.includes('ladies') || titleLower.includes('women') || titleLower.includes('girls')) {
    return 'female';
  }
  if (titleLower.includes('men') || titleLower.includes('gents') || titleLower.includes('boys')) {
    return 'male';
  }
  return 'any';
}

/**
 * Clean and format title
 */
function cleanTitle(title) {
  if (!title) return 'Unnamed PG';
  
  // Remove common prefixes and clean up
  return title
    .replace(/^More details\s*/i, '')
    .replace(/^PG in [A-Za-z\s]+\s*/i, '')
    .replace(/^Bangalore\s*/i, '')
    .replace(/\s*-\s*Fully Furnished.*$/i, '')
    .replace(/\s*-\s*LED TV.*$/i, '')
    .replace(/\s*-\s*HIGH Speed.*$/i, '')
    .trim()
    .substring(0, 200);
}

/**
 * Transform CSV row to Property model format
 */
function transformToProperty(row, adminId) {
  const phone = extractPhone(row.Contact, row.Description);
  const contactName = extractContactName(row.Location_Address, row.Title);
  const genderPreference = determineGenderPreference(row.Title);
  
  return {
    id: row.ID || uuidv4(),
    name: cleanTitle(row.Title),
    description: row.Description || '',
    type: 'pg',
    ownerId: adminId, // Will be replaced with actual admin ID during import
    
    // Location as JSONB
    location: {
      address: row.Location_Address?.replace(/Contact:.*$/i, '').trim() || '',
      city: row.Location_City || 'Bangalore',
      state: row.Location_State || 'Karnataka',
      area: row.Location_Area || '',
      country: 'India',
      pincode: extractPincode(row.Location_Address)
    },
    
    // Contact info as JSONB
    contactInfo: {
      phone: phone,
      name: contactName,
      email: null, // Not available in scraped data
      whatsapp: phone // Assume same as phone
    },
    
    // Amenities array
    amenities: parseAmenities(row.Amenities),
    
    // Rules array
    rules: parseRules(row.Rules),
    
    // Rating as JSONB
    rating: {
      average: parseFloat(row.Rating_Average) || 4.0,
      count: parseInt(row.Rating_Count) || 0
    },
    
    // PG-specific metadata
    metadata: {
      source: row.Source || 'scraped',
      scrapedAt: row.Created_At || new Date().toISOString(),
      originalId: row.ID,
      genderPreference: genderPreference,
      pgOptions: {
        sharingPrices: {
          single: parseFloat(row.PG_Options_Single) || null,
          double: parseFloat(row.PG_Options_Double) || null,
          triple: parseFloat(row.PG_Options_Triple) || null,
          quad: parseFloat(row.PG_Options_Quad) || null
        },
        basePrice: parseFloat(row.Price) || 8000
      },
      maxGuests: parseInt(row.Max_Guests) || 4,
      isClaimed: false,
      claimStatus: null, // 'pending', 'approved', 'rejected'
      claimedBy: null,
      claimedAt: null,
      verifiedAt: null,
      verifiedBy: null
    },
    
    // Default values
    isActive: true,
    isFeatured: false,
    approvalStatus: 'approved', // Auto-approve scraped data for display
    images: [],
    totalFloors: null,
    totalRooms: null,
    checkInTime: null,
    checkOutTime: null
  };
}

/**
 * Extract pincode from address
 */
function extractPincode(address) {
  if (!address) return null;
  const match = address.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

/**
 * Main import function
 */
async function importCSV() {
  const properties = [];
  const errors = [];
  
  // Placeholder admin ID - will be replaced during actual database import
  const ADMIN_PLACEHOLDER = 'ADMIN_USER_ID';
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const property = transformToProperty(row, ADMIN_PLACEHOLDER);
          properties.push(property);
        } catch (error) {
          errors.push({
            row: row.ID,
            error: error.message
          });
        }
      })
      .on('end', () => {
        console.log(`✅ Processed ${properties.length} properties`);
        if (errors.length > 0) {
          console.log(`⚠️  ${errors.length} errors encountered`);
          errors.forEach(e => console.log(`  - Row ${e.row}: ${e.error}`));
        }
        
        // Write to JSON file
        const output = {
          metadata: {
            totalRecords: properties.length,
            importedAt: new Date().toISOString(),
            sourceFile: CSV_FILE,
            errors: errors
          },
          properties: properties
        };
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`📁 Output written to: ${OUTPUT_FILE}`);
        
        resolve(output);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Run if called directly
if (require.main === module) {
  importCSV()
    .then((result) => {
      console.log('\n📊 Import Summary:');
      console.log(`   Total properties: ${result.properties.length}`);
      console.log(`   Errors: ${result.metadata.errors.length}`);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importCSV, transformToProperty };
