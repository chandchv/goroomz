const axios = require('axios');
const cheerio = require('cheerio');

async function testImprovedScraping() {
  try {
    console.log('🧪 Testing improved scraping with structured tables...');
    
    const url = 'https://www.payingguestinbengaluru.com/koramangala.html';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    console.log(`\n📊 Found ${$('table').length} tables on the page`);
    
    // Test the structured table parsing
    const tables = $('table');
    let structuredCount = 0;
    
    for (let i = 0; i < tables.length - 1; i += 2) {
      const titleTable = $(tables[i]);
      const detailsTable = $(tables[i + 1]);
      
      const titleText = titleTable.find('h3').text().trim() || titleTable.find('td').text().trim();
      const detailsCells = detailsTable.find('td');
      
      if (titleText && titleText.length > 5 && detailsCells.length >= 2) {
        structuredCount++;
        console.log(`\n✅ Structured PG ${structuredCount}:`);
        console.log(`   Title: ${titleText.substring(0, 80)}...`);
        
        // Show first cell (details/amenities)
        const detailsText = $(detailsCells[0]).text().trim();
        console.log(`   Details: ${detailsText.substring(0, 100)}...`);
        
        // Show second cell (address)
        const addressText = $(detailsCells[1]).text().trim();
        console.log(`   Address: ${addressText.substring(0, 100)}...`);
        
        // Show third cell (contact) if exists
        if (detailsCells.length > 2) {
          const contactText = $(detailsCells[2]).text().trim();
          console.log(`   Contact: ${contactText.substring(0, 80)}...`);
        }
      }
    }
    
    console.log(`\n📈 Found ${structuredCount} structured PG listings`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testImprovedScraping();
}

module.exports = { testImprovedScraping };
