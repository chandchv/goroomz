const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class ImageScraperToCSV {
  constructor() {
    this.baseUrl = 'https://www.payingguestinbengaluru.com';
    this.scrapedData = [];
    this.processedCount = 0;
  }

  async scrapeImagesFromWebsite() {
    try {
      console.log('🚀 Starting image scraping from payingguestinbengaluru.com...');
      
      // List of areas to scrape (you can modify this list)
      const areas = [
        'adugodi',
        'koramangala', 
        'marathahalli',
        'whitefield',
        'hsrlayout',
        'btmlayout',
        'indiranagar',
        'jayanagar',
        'electroniccity',
        'malleswaram'
      ];

      for (const area of areas) {
        try {
          console.log(`\n🔍 Scraping area: ${area}`);
          const areaData = await this.scrapeArea(area);
          this.scrapedData.push(...areaData);
          console.log(`✅ Found ${areaData.length} PGs in ${area}`);
          
          // Add delay to avoid overwhelming the server
          await this.delay(2000);
          
        } catch (error) {
          console.error(`❌ Error scraping ${area}:`, error.message);
        }
      }

      console.log(`\n📊 Total scraped: ${this.scrapedData.length} PGs`);
      
      // Export to CSV
      await this.exportToCSV();
      
    } catch (error) {
      console.error('💥 Scraping failed:', error);
    }
  }

  async scrapeArea(areaName) {
    try {
      const url = `${this.baseUrl}/${areaName}.html`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const pgListings = [];

      // Extract from tables
      $('table').each((index, table) => {
        const rows = $(table).find('tr');
        if (rows.length >= 2) {
          const cells = rows.eq(0).find('td');
          const title = cells.eq(0).html() || '';
          
          if (title && title.length > 10) {
            const pgData = this.parseTableRow($, cells, areaName);
            if (pgData) {
              pgListings.push(pgData);
            }
          }
        }
      });

      // Extract images for each PG
      for (let i = 0; i < pgListings.length; i++) {
        try {
          const pgData = pgListings[i];
          const images = await this.extractPGImages(pgData.name, areaName, pgData.detailPageUrl);
          if (images && images.length > 0) {
            pgData.images = images;
            console.log(`   📸 Found ${images.length} images for ${pgData.name}`);
          }
        } catch (error) {
          console.log(`   ⚠️ Could not extract images for ${pgListings[i].name}: ${error.message}`);
        }
      }

      return pgListings;

    } catch (error) {
      console.error(`❌ Error scraping ${areaName}:`, error.message);
      return [];
    }
  }

  parseTableRow($, cells, areaName) {
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
      const pgName = detailsText.split('\n')[0].trim().substring(0, 100);

      // Extract address
      let address = addressText.replace(/\n/g, ' ').trim().substring(0, 200);

      // Extract contact
      let contact = '';
      const phoneMatches = contactText.match(/\d{10}/g);
      if (phoneMatches && phoneMatches.length > 0) {
        contact = phoneMatches[0];
      }

      // Extract detail page URL
      let detailPageUrl = null;
      if (contactHtml) {
        const linkMatch = contactHtml.match(/href="([^"]*\.html)"/i);
        if (linkMatch) {
          detailPageUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : `${this.baseUrl}/${linkMatch[1]}`;
        }
      }

      // Extract amenities
      const amenities = this.extractAmenities(detailsText);

      if (pgName.length > 5 && address.length > 10) {
        return {
          name: pgName,
          address: address,
          contact: contact,
          area: areaName,
          amenities: amenities,
          detailPageUrl: detailPageUrl,
          source: 'payingguestinbengaluru.com'
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing table row:', error);
      return null;
    }
  }

  async extractPGImages(pgName, areaName, detailPageUrl = null) {
    try {
      let images = [];
      
      // If we have a specific detail page URL, use it first
      if (detailPageUrl) {
        images = await this.extractImagesFromUrl(detailPageUrl);
        if (images.length > 0) {
          return images.slice(0, 5);
        }
      }

      // Try different URL patterns
      const searchName = pgName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      
      const possibleUrls = [
        `${this.baseUrl}/${searchName}-${areaName}.html`,
        `${this.baseUrl}/${searchName}-PG-in-${areaName}.html`,
        `${this.baseUrl}/${searchName}-Ladies-PG-in-${areaName}.html`,
        `${this.baseUrl}/${searchName}-Gents-PG-in-${areaName}.html`
      ];

      for (const url of possibleUrls) {
        try {
          images = await this.extractImagesFromUrl(url);
          if (images.length > 0) {
            return images.slice(0, 5);
          }
        } catch (error) {
          // Continue to next URL
        }
      }

      // Return default image if none found
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
          const fullUrl = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
          images.push({
            url: fullUrl,
            alt: alt,
            isPrimary: index === 0
          });
        }
      });

      return images;
    } catch (error) {
      throw new Error(`Failed to extract images from ${url}: ${error.message}`);
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

  isValidImageUrl(url) {
    if (!url) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    
    return imageExtensions.some(ext => lowerUrl.includes(ext)) && 
           !lowerUrl.includes('logo') && 
           !lowerUrl.includes('icon') &&
           !lowerUrl.includes('banner') &&
           !lowerUrl.includes('avatar') &&
           !lowerUrl.includes('profile');
  }

  async exportToCSV() {
    try {
      console.log('\n📊 Exporting scraped data to CSV...');
      
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
      const filename = `pg_images_scraped_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
      const filepath = `./${filename}`;
      
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution function
async function runImageScrapingToCSV() {
  const scraper = new ImageScraperToCSV();
  
  try {
    await scraper.scrapeImagesFromWebsite();
  } catch (error) {
    console.error('💥 Image scraping to CSV failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImageScrapingToCSV();
}

module.exports = { ImageScraperToCSV, runImageScrapingToCSV };
