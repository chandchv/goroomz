const { ImprovedPGScraper } = require('./improvedPGScraper.js');

async function testStructuredScraping() {
  const scraper = new ImprovedPGScraper();
  
  try {
    console.log('🧪 Testing structured table scraping...');
    
    // Test with a specific area that has the structured format
    const testArea = 'koramangala';
    const results = await scraper.scrapeArea(testArea);
    
    console.log(`\n📊 Results for ${testArea}:`);
    console.log(`Found ${results.length} PGs`);
    
    // Show sample results
    results.slice(0, 3).forEach((pg, index) => {
      console.log(`\n${index + 1}. ${pg.name}`);
      console.log(`   Address: ${pg.address}`);
      console.log(`   Contact: ${pg.contact || 'N/A'}`);
      console.log(`   Amenities: ${pg.amenities.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testStructuredScraping();
}

module.exports = { testStructuredScraping };
