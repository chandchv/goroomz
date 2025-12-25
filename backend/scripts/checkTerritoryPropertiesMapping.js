const { Territory, Property, Lead } = require('../models');

async function checkTerritoryPropertiesMapping() {
  try {
    console.log('🔍 Checking Territory-Properties Mapping...\n');

    // Get all territories
    const territories = await Territory.findAll({
      attributes: ['id', 'name', 'cities', 'states']
    });

    console.log(`Found ${territories.length} territories:`);
    territories.forEach(territory => {
      console.log(`  - ${territory.name}: Cities: [${territory.cities?.join(', ') || 'none'}], States: [${territory.states?.join(', ') || 'none'}]`);
    });

    // Get all properties
    const properties = await Property.findAll({
      attributes: ['id', 'name', 'location', 'approvalStatus'],
      where: {
        approvalStatus: 'approved',
        isActive: true
      }
    });

    console.log(`\nFound ${properties.length} approved active properties:`);
    
    // Group properties by city
    const propertiesByCity = {};
    properties.forEach(property => {
      const city = property.location?.city;
      if (city) {
        if (!propertiesByCity[city]) {
          propertiesByCity[city] = [];
        }
        propertiesByCity[city].push(property);
      }
    });

    console.log('\nProperties by city:');
    Object.keys(propertiesByCity).forEach(city => {
      console.log(`  - ${city}: ${propertiesByCity[city].length} properties`);
    });

    // Check current leads system
    const leads = await Lead.findAll({
      attributes: ['id', 'businessName', 'status', 'territoryId'],
      where: {
        status: 'approved'
      }
    });

    console.log(`\nFound ${leads.length} approved leads (what territory endpoint currently returns)`);

    // Check mapping between territories and properties
    console.log('\n📊 Territory-Property Mapping Analysis:');
    for (const territory of territories) {
      const territoryProperties = properties.filter(property => {
        const propertyCity = property.location?.city?.toLowerCase();
        const propertyState = property.location?.state?.toLowerCase();
        
        const cityMatch = territory.cities?.some(city => 
          city.toLowerCase() === propertyCity
        );
        
        const stateMatch = territory.states?.some(state => 
          state.toLowerCase() === propertyState
        );
        
        return cityMatch || stateMatch;
      });

      console.log(`\n  Territory: ${territory.name}`);
      console.log(`    Cities: [${territory.cities?.join(', ') || 'none'}]`);
      console.log(`    States: [${territory.states?.join(', ') || 'none'}]`);
      console.log(`    Matching Properties: ${territoryProperties.length}`);
      
      if (territoryProperties.length > 0) {
        territoryProperties.slice(0, 3).forEach(prop => {
          console.log(`      - ${prop.name} (${prop.location?.city}, ${prop.location?.state})`);
        });
        if (territoryProperties.length > 3) {
          console.log(`      ... and ${territoryProperties.length - 3} more`);
        }
      }
    }

    console.log('\n💡 Recommendations:');
    console.log('1. The territory properties endpoint should return actual Property records, not Lead records');
    console.log('2. Properties should be matched to territories based on location.city and location.state');
    console.log('3. Consider adding a territoryId field to properties for direct mapping');

  } catch (error) {
    console.error('❌ Error checking territory-properties mapping:', error);
  }
}

checkTerritoryPropertiesMapping();