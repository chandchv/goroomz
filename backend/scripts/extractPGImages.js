const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class PGImageExtractor {
  constructor() {
    this.baseUrl = 'https://www.payingguestinbengaluru.com';
    this.extractedImages = [];
  }

  async extractImagesFromPage(url) {
    try {
      console.log(`🔍 Extracting images from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // Extract all images from the page
      $('img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
          
          images.push({
            url: fullUrl,
            alt: alt,
            index: index,
            isPrimary: index === 0
          });
        }
      });

      // Look for images in specific containers (like the Sri Ram Sai page structure)
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
              index: images.length,
              isPrimary: images.length === 0
            });
          }
        }
      });

      console.log(`📸 Found ${images.length} images`);
      return images;

    } catch (error) {
      console.error(`❌ Error extracting images from ${url}:`, error.message);
      return [];
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

  async saveImagesToFile(images, filename = 'extracted_pg_images.json') {
    try {
      const filepath = path.join(__dirname, filename);
      await fs.promises.writeFile(filepath, JSON.stringify(images, null, 2));
      console.log(`💾 Saved ${images.length} images to ${filepath}`);
    } catch (error) {
      console.error('❌ Error saving images:', error.message);
    }
  }

  async extractFromSriRamSaiPage() {
    const url = 'https://www.payingguestinbengaluru.com/Sri-Ram-Sai-Ladies-PG-in-JP-Nagar-Bangalore.html';
    
    try {
      console.log('🏠 Extracting images from Sri Ram Sai Ladies PG page...');
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // Extract PG information
      const pgInfo = {
        name: 'Sri Ram Sai Ladies PG',
        location: 'JP Nagar, Bangalore',
        address: '# 33, 2nd Cross, Venkatadri Layout, Panduranaga Nagar, JP Nagar 5th Phase, Bangalore - 560076',
        contact: 'GOPAL REDDY - 8792118431, 8123448478',
        amenities: [
          'New Building with Full Ventilation',
          'LED TV in Each room',
          'Hi-Speed WI-FI Connectivity',
          'Spring Matress',
          'Attached Western Bathrooms',
          'North & South Indian Homely Food',
          'Kitchen with Oven, Fridge, Water Filter',
          'Self Cooking',
          '3 times food, Dining Hall',
          'Fridge, Washing Machine & Laundry',
          '24 Hrs Hot Water',
          'Lift, Powerbackup',
          'Parking & Security with CCTV Cameras',
          '1, 2, 3 Sharing'
        ]
      };

      // Extract all images
      $('img').each((index, element) => {
        const src = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        
        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('http') ? src : `${this.baseUrl}/${src}`;
          
          images.push({
            url: fullUrl,
            alt: alt,
            index: index,
            isPrimary: index === 0,
            description: alt || `PG Image ${index + 1}`
          });
        }
      });

      console.log(`📸 Found ${images.length} images for Sri Ram Sai PG`);
      
      // Save the complete PG data with images
      const pgData = {
        ...pgInfo,
        images: images,
        extractedAt: new Date().toISOString(),
        source: url
      };

      await this.saveImagesToFile(pgData, 'sri_ram_sai_pg_data.json');
      
      return pgData;

    } catch (error) {
      console.error('❌ Error extracting from Sri Ram Sai page:', error.message);
      return null;
    }
  }
}

// Main execution
async function runImageExtraction() {
  const extractor = new PGImageExtractor();
  
  try {
    console.log('🚀 Starting PG Image Extraction...');
    
    // Extract from Sri Ram Sai page
    const sriRamSaiData = await extractor.extractFromSriRamSaiPage();
    
    if (sriRamSaiData) {
      console.log('✅ Successfully extracted PG data with images:');
      console.log(`📊 PG Name: ${sriRamSaiData.name}`);
      console.log(`📍 Location: ${sriRamSaiData.location}`);
      console.log(`📞 Contact: ${sriRamSaiData.contact}`);
      console.log(`📸 Images: ${sriRamSaiData.images.length}`);
      console.log(`🏠 Amenities: ${sriRamSaiData.amenities.length}`);
      
      // Display first few images
      console.log('\n🖼️ Sample Images:');
      sriRamSaiData.images.slice(0, 3).forEach((img, index) => {
        console.log(`${index + 1}. ${img.url}`);
        console.log(`   Description: ${img.description}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Image extraction failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImageExtraction();
}

module.exports = { PGImageExtractor, runImageExtraction };
