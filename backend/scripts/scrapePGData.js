const axios = require('axios');
const cheerio = require('cheerio');
const { sequelize } = require('../config/database');
const { Room, User } = require('../models');

// Areas to scrape from the website - Complete list from payingguestinbengaluru.com
const AREAS_TO_SCRAPE = [
  'adugodi',
  'AECSlayout',
  'airportroad',
  'arekere',
  'Ashoknagar-PG-near-Garuda-Mall',
  'bannerghatta',
  'dairycircle',
  'bannerghatta-near-jayadeva',
  'banaswadi',
  'banashankari',
  'BASAVANGUDI',
  'bellandur',
  'bilekahalli',
  'bioconhuskurgate',
  'bommanahalli',
  'bommasandra',
  'btmlayout',
  'btmlayout1',
  'btmlayout2',
  'cvramannagar',
  'Chandapura',
  'Channasandra',
  'Christ-University-Central-Campus',
  'Christ-University-Yeshwanthpur-Campus',
  'christ-college-bannerghatta-road',
  'Commercial-Street',
  'dasarahalli',
  'devarabisanahalli',
  'Dickenson-Road',
  'doddanekundi',
  'domlur',
  'ejipura',
  'electroniccity',
  'electronic-city-phase-1-pg-in-bangalore',
  'konappana-agrahara-bangalore',
  'electronic-city-phase-2-pg-in-bangalore',
  'Ganganagar',
  'garepalya-bangalore',
  'global-village',
  'HAL-2nd-3rd-stage-pg-in-bangalore',
  'ulsoor',
  'hebbal',
  'hennur-cross-bangalore',
  'hessaraghatta',
  'hosaroad',
  'Hoodi',
  'hsrlayout',
  'HBRlayout',
  'hulimavu',
  'itpl',
  'itplmainroad',
  'indiranagar',
  'jpnagar',
  'jayanagar',
  'jeevanbhimanagar',
  'krpuram',
  'Kadubeesanahalli',
  'kadugodi',
  'kaikondrahalli-paying-guest-near-wipro-sarjapur-road',
  'kalyannagar',
  'Kamanahali , Paying Guest in Kamanahalli, PG in Kamanahalli For Ladies and Gents',
  'Kasturinagar-pg-in-bangalore',
  'kengeri-bidadi-pg-in-bangalore',
  'kodihalli',
  'koramangala',
  'koramangala-sony-world-signal',
  'koramangala1stblock',
  'koramangala2ndblock',
  'koramangala3rdblock',
  'koramangala4thblock',
  'koramangala5thblock',
  'koramangala6thblock',
  'koramangala7thblock',
  'koramangala8thblock',
  'kudlugate',
  'kumaraswamylayout-pg in kumara swamy layout for ladies and gents',
  'kundalahalli',
  'kundalahalli-gate-pg-in-bangalore',
  'beml',
  'sai-nagar-Kundalahalli-gate-pg-in-bangalore',
  'MG-Road',
  'MS-Ramaiah-College-and-Hospital-Bangalore',
  'madivala',
  'malleswaram',
  'manyata-embassy-business-park-nagawara',
  'marathahalli',
  'marathahalli-bridge-pg-in-bangalore',
  'munnekolala',
  'Mahadevapura',
  'maruthinagar',
  'mathikere',
  'murugeshpalya-pg-near-old-airport-road-bangalore',
  'Nagavarapalya',
  'Nallurahalli',
  'New BEL Road, Paying Guest In New Bhel Road, Bangalore',
  'newthippasandra',
  'rtnagar',
  'Ramagondanahalli',
  'Rammurthynagar',
  'Rajajinagar',
  'RajaRajeshwarinagar',
  'rga-tech-park',
  'richmond-town',
  'RMZ-infinity-pg-in-old-madras-road-bangalore',
  'Roopenaagrahara',
  'RV-College-Mysore-Road-Bangalore',
  'sgpalya',
  'sahakaranagar',
  'SANJAYNAGAR',
  'sarjapur-road-near-wipro-bangalore',
  'siddapura',
  'Silkboard',
  'singasandra-pg-in-bangalore',
  'shanthinagar',
  'tavarekere',
  'thanisandra-main-raod',
  'thubarahalli-pg-in-bangalore',
  'veeranapalya',
  'uttarahalli',
  'Viveknagar',
  'whitefield',
  'Wilson-Garden-PG-in-Bangalore',
  'Yelahanka'
];

// Base URL for the website
const BASE_URL = 'https://www.payingguestinbengaluru.com';

class PGDataScraper {
  constructor() {
    this.scrapedData = [];
  }

  async scrapeArea(areaName) {
    try {
      console.log(`🔍 Scraping PG data for area: ${areaName}`);
      
      const url = `${BASE_URL}/${areaName}.html`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const pgListings = [];

      // Look for PG listings in the page
      $('table').each((index, table) => {
        const $table = $(table);
        const rows = $table.find('tr');
        
        if (rows.length > 1) {
          // Extract PG information from table rows
          rows.each((rowIndex, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 2) {
              const pgData = this.extractPGDataFromRow($, cells, areaName);
              if (pgData) {
                pgListings.push(pgData);
              }
            }
          });
        }
      });

      // Also look for PG information in other formats
      $('div, section').each((index, element) => {
        const $element = $(element);
        const text = $element.text();
        
        // Look for PG names and details in text content
        if (text.includes('PG') || text.includes('Paying Guest') || text.includes('LUXURY PG')) {
          const pgData = this.extractPGDataFromText($, $element, areaName);
          if (pgData) {
            pgListings.push(pgData);
          }
        }
      });

      console.log(`✅ Found ${pgListings.length} PG listings in ${areaName}`);
      return pgListings;

    } catch (error) {
      console.error(`❌ Error scraping ${areaName}:`, error.message);
      return [];
    }
  }

  extractPGDataFromRow($, cells, areaName) {
    try {
      const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
      
      // Look for PG name patterns
      let pgName = '';
      let address = '';
      let contact = '';
      let amenities = [];
      
      // Extract PG name (usually in first cell or contains "PG", "LUXURY", etc.)
      for (const text of cellTexts) {
        if (text.includes('PG') || text.includes('LUXURY') || text.includes('EXECUTIVE')) {
          pgName = text.replace(/\|.*$/, '').trim(); // Remove pipe and everything after
          // Clean up the name - remove extra whitespace and limit length
          pgName = pgName.replace(/\s+/g, ' ').substring(0, 100);
          break;
        }
      }
      
      // Extract address (usually contains "Address:", "Landmark:", etc.)
      for (const text of cellTexts) {
        if (text.includes('Address:') || text.includes('Landmark:')) {
          address = text.replace(/^(Address:|Landmark:)\s*/, '').trim();
          // Clean up address
          address = address.replace(/\s+/g, ' ').substring(0, 200);
          break;
        }
      }
      
      // Extract contact (usually contains phone numbers)
      for (const text of cellTexts) {
        const phoneMatch = text.match(/(\d{10})/);
        if (phoneMatch) {
          contact = phoneMatch[1];
          break;
        }
      }
      
      // Extract amenities from text
      const allText = cellTexts.join(' ');
      amenities = this.extractAmenities(allText);
      
      // Validate and clean data
      if (pgName && pgName.length > 3 && address && address.length > 10) {
        return {
          name: pgName,
          address: address,
          contact: contact,
          area: areaName,
          amenities: amenities,
          source: 'payingguestinbengaluru.com'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting PG data from row:', error);
      return null;
    }
  }

  extractPGDataFromText($, element, areaName) {
    try {
      const text = element.text();
      
      // Look for PG name patterns
      const nameMatch = text.match(/([A-Z\s]+(?:PG|LUXURY|EXECUTIVE)[A-Z\s]*)/);
      if (!nameMatch) return null;
      
      let pgName = nameMatch[1].trim();
      // Clean up the name - remove extra whitespace and limit length
      pgName = pgName.replace(/\s+/g, ' ').substring(0, 100);
      
      // Extract address
      const addressMatch = text.match(/Address:\s*([^|]+)/);
      let address = addressMatch ? addressMatch[1].trim() : '';
      // Clean up address
      address = address.replace(/\s+/g, ' ').substring(0, 200);
      
      // Extract contact
      const contactMatch = text.match(/(\d{10})/);
      const contact = contactMatch ? contactMatch[1] : '';
      
      // Extract amenities
      const amenities = this.extractAmenities(text);
      
      // Validate data
      if (pgName && pgName.length > 3 && address && address.length > 10) {
        return {
          name: pgName,
          address: address,
          contact: contact,
          area: areaName,
          amenities: amenities,
          source: 'payingguestinbengaluru.com'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting PG data from text:', error);
      return null;
    }
  }

  extractAmenities(text) {
    const amenities = [];
    const amenityKeywords = {
      'wifi': ['wifi', 'wi-fi', 'internet', 'high speed', 'hi-speed'],
      'ac': ['ac', 'air conditioning', 'air conditioner'],
      'tv': ['tv', 'led tv', 'television'],
      'parking': ['parking', '2 wheeler', '4 wheeler', 'vehicle'],
      'meals': ['food', 'meals', 'north indian', 'south indian', 'homely food'],
      'laundry': ['washing machine', 'laundry'],
      'security': ['security', 'cctv', '24 hrs security', '24x7'],
      'gym': ['gym', 'fitness'],
      'cctv': ['cctv', 'camera', 'cameras'],
      'kitchen': ['kitchen', 'cooking'],
      'refrigerator': ['fridge', 'refrigerator'],
      'microwave': ['microwave', 'oven'],
      'iron': ['iron', 'ironing'],
      'heater': ['heater', 'geyser'],
      'balcony': ['balcony', 'terrace']
    };

    const lowerText = text.toLowerCase();
    
    Object.entries(amenityKeywords).forEach(([amenity, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        amenities.push(amenity);
      }
    });

    // Ensure we have at least basic amenities
    if (amenities.length === 0) {
      amenities.push('wifi', 'meals', 'security');
    }

    return amenities;
  }

  async scrapeAllAreas() {
    console.log('🚀 Starting PG data scraping from payingguestinbengaluru.com');
    
    for (const area of AREAS_TO_SCRAPE) {
      const areaData = await this.scrapeArea(area);
      this.scrapedData.push(...areaData);
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`📊 Total scraped PGs: ${this.scrapedData.length}`);
    return this.scrapedData;
  }

  async saveToDatabase() {
    try {
      console.log('💾 Saving scraped PG data to database...');
      
      // Find or create a default owner for scraped PGs
      let defaultOwner = await User.findOne({ where: { email: 'scraped@goroomz.com' } });
      
      if (!defaultOwner) {
        defaultOwner = await User.create({
          name: 'Scraped PG Data',
          email: 'scraped@goroomz.com',
          phone: '0000000000',
          role: 'owner',
          password: 'scraped123' // Default password
        });
        console.log('✅ Created default owner for scraped PGs');
      }

      let savedCount = 0;
      let skippedCount = 0;

      for (const pgData of this.scrapedData) {
        try {
          // Check if PG already exists
          const existingPG = await Room.findOne({
            where: {
              title: pgData.name,
              location: pgData.address
            }
          });

          if (existingPG) {
            console.log(`⏭️ Skipping existing PG: ${pgData.name}`);
            skippedCount++;
            continue;
          }

          // Create new PG entry with proper validation
          const newPG = await Room.create({
            title: pgData.name,
            description: `Premium PG accommodation in ${pgData.area}. ${pgData.amenities.length > 0 ? 'Amenities include: ' + pgData.amenities.join(', ') + '.' : ''} Contact: ${pgData.contact}`,
            category: 'PG',
            roomType: 'Shared Room',
            pricingType: 'monthly',
            price: 8000, // Default price since not available
            maxGuests: 2,
            location: {
              address: pgData.address,
              city: 'Bangalore',
              state: 'Karnataka',
              area: pgData.area
            },
            amenities: pgData.amenities.length > 0 ? pgData.amenities : ['wifi', 'meals', 'security'],
            images: [{
              url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
              isPrimary: true
            }],
            ownerId: defaultOwner.id,
            isActive: true,
            featured: false,
            rating: {
              average: 4.2,
              count: Math.floor(Math.random() * 50) + 10
            },
            rules: [
              'No smoking inside the premises',
              'Visitors allowed only during day time',
              'Maintain cleanliness',
              'Follow house rules'
            ],
            pgOptions: {
              sharingPrices: {
                single: 12000,
                double: 8000,
                triple: 6000,
                quad: 5000
              }
            }
          });

          console.log(`✅ Saved PG: ${pgData.name} in ${pgData.area}`);
          savedCount++;

        } catch (error) {
          console.error(`❌ Error saving PG ${pgData.name}:`, error.message);
        }
      }

      console.log(`📈 Summary: ${savedCount} PGs saved, ${skippedCount} skipped`);
      return { savedCount, skippedCount };

    } catch (error) {
      console.error('❌ Error saving to database:', error);
      throw error;
    }
  }
}

// Main execution function
async function scrapeAndSavePGData() {
  const scraper = new PGDataScraper();
  
  try {
    // Scrape data from all areas
    await scraper.scrapeAllAreas();
    
    // Save to database
    const result = await scraper.saveToDatabase();
    
    console.log('🎉 PG data scraping and saving completed!');
    console.log(`📊 Results: ${result.savedCount} new PGs added, ${result.skippedCount} duplicates skipped`);
    
  } catch (error) {
    console.error('💥 Scraping failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the scraper
if (require.main === module) {
  scrapeAndSavePGData();
}

module.exports = { PGDataScraper, scrapeAndSavePGData };
