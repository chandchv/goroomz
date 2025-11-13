console.log('🧪 Testing basic functionality...');

const axios = require('axios');
const cheerio = require('cheerio');

async function simpleTest() {
  try {
    console.log('📡 Making request to test URL...');
    
    const response = await axios.get('https://www.payingguestinbengaluru.com/koramangala.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log(`✅ Response received: ${response.status}`);
    console.log(`📄 Content length: ${response.data.length} characters`);
    
    const $ = cheerio.load(response.data);
    const tableCount = $('table').length;
    const h3Count = $('h3').length;
    
    console.log(`📊 Found ${tableCount} tables and ${h3Count} h3 elements`);
    
    // Test structured parsing
    const tables = $('table');
    let structuredFound = 0;
    
    for (let i = 0; i < Math.min(tables.length - 1, 4); i += 2) {
      const titleTable = $(tables[i]);
      const detailsTable = $(tables[i + 1]);
      
      const title = titleTable.find('h3').text().trim();
      const detailsCells = detailsTable.find('td');
      
      if (title && title.length > 5 && detailsCells.length >= 2) {
        structuredFound++;
        console.log(`\n✅ Structured PG ${structuredFound}:`);
        console.log(`   Title: ${title.substring(0, 60)}...`);
        console.log(`   Cells: ${detailsCells.length}`);
      }
    }
    
    console.log(`\n📈 Found ${structuredFound} structured PGs in first 4 table pairs`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleTest();
