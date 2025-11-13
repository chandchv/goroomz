const axios = require('axios');
const cheerio = require('cheerio');
const { sequelize } = require('../config/database');
const { Room } = require('../models');

class ImageScraperAndUploader {
  constructor() {
    this.baseUrl = 'https://www.payingguestinbengaluru.com';
    this.processedCount = 0;
    this.updatedCount = 0;
    this.errorCount = 0;
  }

  async scrapeAndUpdateImages() {
    try {
      console.log('🚀 Starting image scraping and database update...');
      
      // Get all PG rooms from database
      const pgRooms = await Room.findAll({
        where: {
          category: 'PG'
        },
        order: [['created_at', 'DESC']]
      });

      console.log(`📊 Found ${pgRooms.length} PG records in database`);

      if (pgRooms.length === 0) {
        console.log('❌ No PG data found in database');
        return;
      }

      // Process each room
      for (const room of pgRooms) {
        try {
          console.log(`\n🔍 Processing: ${room.title}`);
          
          // Check if room already has images
          if (room.images && room.images.length > 0) {
            console.log(`   ✅ Already has ${room.images.length} images, skipping...`);
            continue;
          }

          // Try to find and extract images
          const images = await this.extractImagesForRoom(room);
          
          if (images && images.length > 0) {
            // Update room with new images
            await room.update({ images: images });
            console.log(`   📸 Added ${images.length} images to ${room.title}`);
            this.updatedCount++;
          } else {
            console.log(`   ⚠️ No images found for ${room.title}`);
          }

          this.processedCount++;
          
          // Add delay to avoid overwhelming the server
          await this.delay(1000);
          
        } catch (error) {
          console.error(`   ❌ Error processing ${room.title}:`, error.message);
          this.errorCount++;
        }
      }

      console.log('\n📊 Scraping Summary:');
      console.log(`   Processed: ${this.processedCount} rooms`);
      console.log(`   Updated: ${this.updatedCount} rooms`);
      console.log(`   Errors: ${this.errorCount} rooms`);

    } catch (error) {
      console.error('💥 Scraping failed:', error);
    } finally {
      await sequelize.close();
    }
  }

  async extractImagesForRoom(room) {
    try {
      // Try different URL patterns based on room data
      const possibleUrls = this.generatePossibleUrls(room);
      
      for (const url of possibleUrls) {
        try {
          console.log(`   🔍 Trying: ${url}`);
          const images = await this.extractImagesFromUrl(url);
          
          if (images && images.length > 0) {
            console.log(`   📸 Found ${images.length} images at ${url}`);
            return images;
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
      console.log(`   ⚠️ Error extracting images for ${room.title}: ${error.message}`);
      return [{
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        isPrimary: true
      }];
    }
  }

  generatePossibleUrls(room) {
    const urls = [];
    
    // Clean room title for URL
    const cleanTitle = room.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const area = room.location?.area || 'bangalore';
    const cleanArea = area.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Generate possible URL patterns
    urls.push(`${this.baseUrl}/${cleanTitle}-${cleanArea}.html`);
    urls.push(`${this.baseUrl}/${cleanTitle}-PG-in-${cleanArea}.html`);
    urls.push(`${this.baseUrl}/${cleanTitle}-Ladies-PG-in-${cleanArea}.html`);
    urls.push(`${this.baseUrl}/${cleanTitle}-Gents-PG-in-${cleanArea}.html`);
    
    // Try area-specific pages
    urls.push(`${this.baseUrl}/${cleanArea}.html`);
    
    return urls;
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

      // Also look for images in specific containers
      $('.pg-images img, .property-images img, .gallery img, table img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
          
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

      return images.slice(0, 5); // Limit to 5 images max

    } catch (error) {
      throw new Error(`Failed to extract images from ${url}: ${error.message}`);
    }
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution function
async function runImageScrapingAndUpload() {
  const scraper = new ImageScraperAndUploader();
  
  try {
    await scraper.scrapeAndUpdateImages();
  } catch (error) {
    console.error('💥 Image scraping and upload failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImageScrapingAndUpload();
}

module.exports = { ImageScraperAndUploader, runImageScrapingAndUpload };
