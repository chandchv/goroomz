const axios = require('axios');
const cheerio = require('cheerio');
const { sequelize } = require('../config/database');
const { Room, User } = require('../models');

// Focus on high-traffic areas first
const PRIORITY_AREAS = [
  'koramangala',
  'marathahalli', 
  'whitefield',
  'hsrlayout',
  'btmlayout',
  'indiranagar',
  'jayanagar',
  'electroniccity',
  'adugodi',
  'malleswaram'
];

const BASE_URL = 'https://www.payingguestinbengaluru.com';

class ImprovedPGScraper {
  constructor() {
    this.scrapedData = [];
    this.processedCount = 0;
    this.savedCount = 0;
    this.skippedCount = 0;
  }

  async scrapeArea(areaName) {
    try {
      console.log(`🔍 Scraping PG data for area: ${areaName}`);
      
      const url = `${BASE_URL}/${areaName}.html`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const pgListings = [];

      // Multiple extraction strategies
      const strategies = [
        () => this.extractFromTables($, areaName),
        () => this.extractFromDivs($, areaName),
        () => this.extractFromTextBlocks($, areaName),
        () => this.extractFromLists($, areaName)
      ];

      for (const strategy of strategies) {
        try {
          const results = strategy();
          pgListings.push(...results);
        } catch (error) {
          console.log(`⚠️ Strategy failed for ${areaName}:`, error.message);
        }
      }

      // Remove duplicates
      const uniqueListings = this.removeDuplicates(pgListings);
      
      // Extract images for each PG listing
      for (let i = 0; i < uniqueListings.length; i++) {
        try {
          const pgData = uniqueListings[i];
          const images = await this.extractPGImages(pgData.name, areaName, pgData.detailPageUrl);
          if (images && images.length > 0) {
            pgData.images = images;
            console.log(`📸 Found ${images.length} images for ${pgData.name}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not extract images for ${uniqueListings[i].name}: ${error.message}`);
        }
      }
      
      console.log(`✅ Found ${uniqueListings.length} unique PG listings in ${areaName}`);
      return uniqueListings;

    } catch (error) {
      console.error(`❌ Error scraping ${areaName}:`, error.message);
      return [];
    }
  }

  extractFromTables($, areaName) {
    const listings = [];
    const tables = $('table');
    
    // Process tables in pairs (title table + details table)
    for (let i = 0; i < tables.length - 1; i += 2) {
      const titleTable = $(tables[i]);
      const detailsTable = $(tables[i + 1]);
      
      // Extract title from first table
      const titleText = titleTable.find('h3').text().trim() || titleTable.find('td').text().trim();
      
      if (!titleText || titleText.length < 5) continue;
      
      // Extract details from second table
      const detailsCells = detailsTable.find('td');
      if (detailsCells.length >= 2) {
        const pgData = this.parseStructuredTable($, detailsCells, titleText, areaName);
        if (pgData) {
          listings.push(pgData);
        }
      }
    }

    // Also try the old method for tables that don't follow the pair pattern
    $('table').each((index, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          const pgData = this.parseTableRow($, cells, areaName);
          if (pgData) {
            listings.push(pgData);
          }
        }
      });
    });

    return listings;
  }

  extractFromDivs($, areaName) {
    const listings = [];
    
    $('div').each((index, div) => {
      const $div = $(div);
      const text = $div.text();
      
      if (text.includes('PG') || text.includes('LUXURY') || text.includes('EXECUTIVE')) {
        const pgData = this.parseTextBlock(text, areaName);
        if (pgData) {
          listings.push(pgData);
        }
      }
    });

    return listings;
  }

  extractFromTextBlocks($, areaName) {
    const listings = [];
    
    $('p, span, div').each((index, element) => {
      const $element = $(element);
      const text = $element.text();
      
      if (text.length > 100 && (text.includes('PG') || text.includes('LUXURY'))) {
        const pgData = this.parseTextBlock(text, areaName);
        if (pgData) {
          listings.push(pgData);
        }
      }
    });

    return listings;
  }

  extractFromLists($, areaName) {
    const listings = [];
    
    $('ul li, ol li').each((index, li) => {
      const $li = $(li);
      const text = $li.text();
      
      if (text.includes('PG') || text.includes('LUXURY')) {
        const pgData = this.parseTextBlock(text, areaName);
        if (pgData) {
          listings.push(pgData);
        }
      }
    });

    return listings;
  }

  parseTableRow($, cells, areaName) {
    try {
      const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
      const fullText = cellTexts.join(' ');
      
      return this.parseTextBlock(fullText, areaName);
    } catch (error) {
      return null;
    }
  }

  parseStructuredTable($, cells, title, areaName) {
    try {
      if (cells.length < 2) return null;

      // First cell: Details and amenities
      const detailsText = $(cells[0]).text().trim();
      
      // Second cell: Address and landmarks
      const addressText = $(cells[1]).text().trim();
      
      // Third cell (if exists): Contact details
      const contactText = cells.length > 2 ? $(cells[2]).text().trim() : '';
      const contactHtml = cells.length > 2 ? $(cells[2]).html() : '';

      // Clean up title
      const pgName = title.replace(/<[^>]*>/g, '').trim().substring(0, 100);

      // Extract address from address text
      let address = '';
      const addressMatch = addressText.match(/Address:\s*([^]+?)(?:\n|$)/i);
      if (addressMatch) {
        address = addressMatch[1].replace(/\n/g, ' ').trim();
      } else {
        // Fallback: use the whole address text
        address = addressText.replace(/\n/g, ' ').trim();
      }

      // Extract landmark
      let landmark = '';
      const landmarkMatch = addressText.match(/Landmark:\s*([^]+?)(?:\n|$)/i);
      if (landmarkMatch) {
        landmark = landmarkMatch[1].replace(/\n/g, ' ').trim();
      }

      // Combine address and landmark
      const fullAddress = `${address}${landmark ? ' Landmark: ' + landmark : ''}`;

      // Extract contact from contact text (ignore unwanted text)
      let contact = '';
      // Remove unwanted text patterns
      const cleanContactText = contactText
        .replace(/Please\s+mention\s+that\s+you\s+found\s+the\s+AD\s+in\s+payingguestinbengaluru\.com/gi, '')
        .replace(/PG\s+photo'?s?\s*&\s*More\s+details/gi, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();
      
      // Extract phone numbers (10 digits)
      const phoneMatches = cleanContactText.match(/\d{10}/g);
      if (phoneMatches && phoneMatches.length > 0) {
        contact = phoneMatches[0]; // Take the first phone number
      }

      // Extract detail page URL from contact HTML
      let detailPageUrl = null;
      if (contactHtml) {
        const linkMatch = contactHtml.match(/href="([^"]*\.html)"/i);
        if (linkMatch) {
          detailPageUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : `${BASE_URL}/${linkMatch[1]}`;
          console.log(`🔗 Found detail page link: ${detailPageUrl}`);
        }
      }

      // Extract amenities from details text
      const amenities = this.extractAmenities(detailsText);

      // Validate data
      if (pgName.length > 5 && fullAddress.length > 10) {
        return {
          name: pgName,
          address: fullAddress.substring(0, 200),
          contact: contact,
          area: areaName,
          amenities: amenities,
          detailPageUrl: detailPageUrl,
          source: 'payingguestinbengaluru.com'
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing structured table:', error);
      return null;
    }
  }

  parseTextBlock(text, areaName) {
    try {
      // Extract PG name - look for patterns like "SRI XYZ NEW LUXURY PG"
      const namePatterns = [
        /([A-Z][A-Z\s]+(?:NEW\s+)?(?:LUXURY|EXECUTIVE|DELUXE)\s+PG[^.]*)/i,
        /([A-Z][A-Z\s]+PG[^.]*)/i,
        /([A-Z][A-Z\s]+(?:FOR\s+(?:MEN|LADIES|WOMEN))[^.]*)/i
      ];

      let pgName = '';
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          pgName = match[1].trim();
          break;
        }
      }

      if (!pgName) return null;

      // Clean up name
      pgName = pgName.replace(/\s+/g, ' ').substring(0, 100);

      // Extract address
      const addressPatterns = [
        /Address:\s*([^|]+)/i,
        /Landmark:\s*([^|]+)/i,
        /#\s*\d+[^|]+/i
      ];

      let address = '';
      for (const pattern of addressPatterns) {
        const match = text.match(pattern);
        if (match) {
          address = match[1] || match[0];
          break;
        }
      }

      if (!address) return null;

      // Clean up address
      address = address.replace(/\s+/g, ' ').substring(0, 200);

      // Extract contact
      const phoneMatch = text.match(/(\d{10})/);
      const contact = phoneMatch ? phoneMatch[1] : '';

      // Extract amenities
      const amenities = this.extractAmenities(text);

      // Validate data
      if (pgName.length > 5 && address.length > 10) {
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

  removeDuplicates(listings) {
    const seen = new Set();
    return listings.filter(listing => {
      const key = `${listing.name}-${listing.address}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async scrapeAllAreas() {
    console.log('🚀 Starting improved PG data scraping from payingguestinbengaluru.com');
    console.log(`📋 Priority areas: ${PRIORITY_AREAS.join(', ')}`);
    
    for (const area of PRIORITY_AREAS) {
      const areaData = await this.scrapeArea(area);
      this.scrapedData.push(...areaData);
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`📊 Total scraped PGs: ${this.scrapedData.length}`);
    return this.scrapedData;
  }

  async saveToDatabase() {
    try {
      console.log('💾 Saving scraped PG data to database...');
      
      // Find or create default owner
      let defaultOwner = await User.findOne({ where: { email: 'scraped@goroomz.com' } });
      
      if (!defaultOwner) {
        defaultOwner = await User.create({
          name: 'Scraped PG Data',
          email: 'scraped@goroomz.com',
          phone: '0000000000',
          role: 'owner',
          password: 'scraped123'
        });
        console.log('✅ Created default owner for scraped PGs');
      }

      for (const pgData of this.scrapedData) {
        try {
          this.processedCount++;

          // Check if PG already exists
          const existingPG = await Room.findOne({
            where: {
              title: pgData.name,
              location: pgData.address
            }
          });

          if (existingPG) {
            console.log(`⏭️ Skipping existing PG: ${pgData.name}`);
            this.skippedCount++;
            continue;
          }

          // Create new PG entry
          const newPG = await Room.create({
            title: pgData.name,
            description: `Premium PG accommodation in ${pgData.area}. ${pgData.amenities.length > 0 ? 'Amenities include: ' + pgData.amenities.join(', ') + '.' : ''} Contact: ${pgData.contact}`,
            category: 'PG',
            roomType: 'Shared Room',
            pricingType: 'monthly',
            price: 8000,
            maxGuests: 2,
            location: {
              address: pgData.address,
              city: 'Bangalore',
              state: 'Karnataka',
              area: pgData.area
            },
            amenities: pgData.amenities.length > 0 ? pgData.amenities : ['wifi', 'meals', 'security'],
            images: pgData.images || [{
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
          this.savedCount++;

        } catch (error) {
          console.error(`❌ Error saving PG ${pgData.name}:`, error.message);
        }
      }

      console.log(`📈 Summary: ${this.savedCount} PGs saved, ${this.skippedCount} skipped, ${this.processedCount} processed`);
      return { savedCount: this.savedCount, skippedCount: this.skippedCount, processedCount: this.processedCount };

    } catch (error) {
      console.error('❌ Error saving to database:', error);
      throw error;
    }
  }

  async exportToCSV() {
    try {
      console.log('📊 Exporting scraped PG data to CSV with images...');
      
      if (this.scrapedData.length === 0) {
        console.log('❌ No scraped data to export');
        return;
      }

      // Create CSV header
      const headers = [
        'PG_Name',
        'Address', 
        'Area',
        'Contact',
        'Amenities',
        'Primary_Image_URL',
        'All_Image_URLs',
        'Image_Count',
        'Detail_Page_URL',
        'Source'
      ];

      // Convert data to CSV format
      const csvRows = [headers.join(',')];

      this.scrapedData.forEach(pg => {
        const images = pg.images || [];
        const primaryImage = images.find(img => img.isPrimary) || images[0];
        const primaryImageUrl = primaryImage?.url || '';
        const allImageUrls = images.map(img => img.url).join('; ');
        const imageCount = images.length;

        const row = [
          `"${(pg.name || '').replace(/"/g, '""')}"`,
          `"${(pg.address || '').replace(/"/g, '""')}"`,
          `"${pg.area || ''}"`,
          `"${pg.contact || ''}"`,
          `"${(pg.amenities || []).join('; ')}"`,
          `"${primaryImageUrl}"`,
          `"${allImageUrls}"`,
          imageCount,
          `"${pg.detailPageUrl || ''}"`,
          `"${pg.source || 'payingguestinbengaluru.com'}"`
        ];
        csvRows.push(row.join(','));
      });

      // Write to CSV file
      const csvContent = csvRows.join('\n');
      const filename = `pg_data_with_images_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
      const filepath = `./${filename}`;
      
      const fs = require('fs');
      fs.writeFileSync(filepath, csvContent, 'utf8');
      
      console.log(`✅ CSV file created: ${filepath}`);
      console.log(`📈 Exported ${this.scrapedData.length} PG records with images`);
      
      // Show sample data
      console.log('\n📋 Sample of exported data:');
      this.scrapedData.slice(0, 3).forEach((pg, index) => {
        const images = pg.images || [];
        const primaryImage = images.find(img => img.isPrimary) || images[0];
        
        console.log(`\n${index + 1}. ${pg.name}`);
        console.log(`   Address: ${pg.address || 'N/A'}`);
        console.log(`   Area: ${pg.area || 'N/A'}`);
        console.log(`   Contact: ${pg.contact || 'N/A'}`);
        console.log(`   Images: ${images.length} total`);
        if (primaryImage) {
          console.log(`   Primary Image: ${primaryImage.url}`);
        }
      });

    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
    }
  }

  // Extract images from individual PG pages
  async extractPGImages(pgName, areaName, detailPageUrl = null) {
    try {
      let images = [];
      
      // If we have a specific detail page URL, use it first
      if (detailPageUrl) {
        images = await this.extractImagesFromUrl(detailPageUrl);
        if (images.length > 0) {
          console.log(`📸 Found ${images.length} images from detail page for ${pgName}`);
          return images.slice(0, 5);
        }
      }

      // Create a search-friendly URL for the PG
      const searchName = pgName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      // Try different URL patterns
      const possibleUrls = [
        `${BASE_URL}/${searchName}-${areaName}.html`,
        `${BASE_URL}/${searchName}-PG-in-${areaName}.html`,
        `${BASE_URL}/${searchName}-Ladies-PG-in-${areaName}.html`,
        `${BASE_URL}/${searchName}-Gents-PG-in-${areaName}.html`
      ];

      for (const url of possibleUrls) {
        try {
          console.log(`🔍 Trying to fetch images from: ${url}`);
          images = await this.extractImagesFromUrl(url);
          
          if (images.length > 0) {
            console.log(`📸 Found ${images.length} images for ${pgName}`);
            return images.slice(0, 5); // Limit to 5 images max
          }
        } catch (error) {
          // Continue to next URL
        }
      }

      // If no images found, return default
      return [{
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        isPrimary: true
      }];

    } catch (error) {
      console.log(`⚠️ Error extracting images for ${pgName}: ${error.message}`);
      return [{
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        isPrimary: true
      }];
    }
  }

  // Extract images from a specific URL
  async extractImagesFromUrl(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // Extract images from various sources
      $('img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('http') ? src : `${BASE_URL}/${src}`;
          images.push({
            url: fullUrl,
            alt: alt,
            isPrimary: index === 0 // First image is primary
          });
        }
      });

      // Also look for images in specific containers
      $('.pg-images img, .property-images img, .gallery img, table img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('http') ? src : `${BASE_URL}/${src}`;
          
          // Avoid duplicates
          if (!images.some(img => img.url === fullUrl)) {
            images.push({
              url: fullUrl,
              alt: alt,
              isPrimary: images.length === 0
            });
          }
        }
      });

      return images;
    } catch (error) {
      console.log(`⚠️ Error extracting images from ${url}: ${error.message}`);
      return [];
    }
  }

  // Check if URL is a valid image
  isValidImageUrl(url) {
    if (!url) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    
    return imageExtensions.some(ext => lowerUrl.includes(ext)) && 
           !lowerUrl.includes('logo') && 
           !lowerUrl.includes('icon') &&
           !lowerUrl.includes('banner');
  }
}

// Main execution function
async function runImprovedScraping() {
  const scraper = new ImprovedPGScraper();
  
  try {
    // Scrape data from priority areas
    await scraper.scrapeAllAreas();
    
    // Export to CSV with images
    await scraper.exportToCSV();
    
    // Save to database
    const result = await scraper.saveToDatabase();
    
    console.log('🎉 Improved PG data scraping completed!');
    console.log(`📊 Results: ${result.savedCount} new PGs added, ${result.skippedCount} duplicates skipped`);
    
  } catch (error) {
    console.error('💥 Scraping failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the improved scraper
if (require.main === module) {
  runImprovedScraping();
}

module.exports = { ImprovedPGScraper, runImprovedScraping };
