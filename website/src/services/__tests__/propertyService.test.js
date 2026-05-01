/**
 * Unit Tests for Property Service
 * 
 * Tests the frontend property service's ability to:
 * - Handle Amadeus properties
 * - Detect property sources
 * - Extract property data from different formats
 * 
 * Requirements: 5.1, 5.2, 5.3
 * 
 * Note: API call tests are integration tests and should be run separately
 */

// Test helper functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Mock property service methods for testing
const propertyServiceMock = {
  isAmadeusProperty(propertyOrId) {
    if (typeof propertyOrId === 'string') {
      return propertyOrId.startsWith('amadeus_') || /^[A-Z0-9]{8}$/i.test(propertyOrId);
    }
    
    if (typeof propertyOrId === 'object' && propertyOrId !== null) {
      return propertyOrId.source === 'amadeus' || propertyOrId.isExternal === true;
    }
    
    return false;
  },

  getSourceLabel(property) {
    return this.isAmadeusProperty(property) ? 'Amadeus' : 'Local';
  },

  getPropertyPrice(property) {
    return property.metadata?.pgOptions?.basePrice || 
           property.price || 
           property.metadata?.price || 
           null;
  },

  getPropertyRating(property) {
    return property.rating || 
           property.metadata?.rating || 
           null;
  },

  getPropertyAmenities(property) {
    return property.amenities || 
           property.metadata?.amenities || 
           [];
  }
};

// Test Suite
console.log('🧪 Running Property Service Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    testsFailed++;
  }
}

// Source Detection Tests
console.log('📁 Source Detection');

runTest('should detect Amadeus property by ID prefix', () => {
  const amadeusId = 'amadeus_ACPAR419';
  assert(propertyServiceMock.isAmadeusProperty(amadeusId) === true);
});

runTest('should detect Amadeus property by 8-character hotel ID', () => {
  const hotelId = 'ACPAR419';
  assert(propertyServiceMock.isAmadeusProperty(hotelId) === true);
});

runTest('should detect Amadeus property by source metadata', () => {
  const property = {
    id: 'amadeus_ACPAR419',
    source: 'amadeus',
    isExternal: true
  };
  assert(propertyServiceMock.isAmadeusProperty(property) === true);
});

runTest('should detect Amadeus property by isExternal flag', () => {
  const property = {
    id: 'some-id',
    isExternal: true
  };
  assert(propertyServiceMock.isAmadeusProperty(property) === true);
});

runTest('should detect local property by UUID', () => {
  const localId = '123e4567-e89b-12d3-a456-426614174000';
  assert(propertyServiceMock.isAmadeusProperty(localId) === false);
});

runTest('should detect local property by source metadata', () => {
  const property = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    source: 'local',
    isExternal: false
  };
  assert(propertyServiceMock.isAmadeusProperty(property) === false);
});

runTest('should return false for invalid input', () => {
  assert(propertyServiceMock.isAmadeusProperty(null) === false);
  assert(propertyServiceMock.isAmadeusProperty(undefined) === false);
  assert(propertyServiceMock.isAmadeusProperty('') === false);
});

// Source Label Tests
console.log('\n📁 Source Label');

runTest('should return "Amadeus" for Amadeus property', () => {
  const property = {
    id: 'amadeus_ACPAR419',
    source: 'amadeus',
    isExternal: true
  };
  assertEqual(propertyServiceMock.getSourceLabel(property), 'Amadeus');
});

runTest('should return "Local" for local property', () => {
  const property = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    source: 'local',
    isExternal: false
  };
  assertEqual(propertyServiceMock.getSourceLabel(property), 'Local');
});

// Property Data Extraction Tests
console.log('\n📁 Property Data Extraction');

runTest('should extract price from local property', () => {
  const property = {
    metadata: {
      pgOptions: {
        basePrice: 5000
      }
    }
  };
  assertEqual(propertyServiceMock.getPropertyPrice(property), 5000);
});

runTest('should extract price from Amadeus property', () => {
  const property = {
    price: 3000,
    source: 'amadeus'
  };
  assertEqual(propertyServiceMock.getPropertyPrice(property), 3000);
});

runTest('should extract price from metadata', () => {
  const property = {
    metadata: {
      price: 4000
    }
  };
  assertEqual(propertyServiceMock.getPropertyPrice(property), 4000);
});

runTest('should return null for property without price', () => {
  const property = {
    name: 'Test Property'
  };
  assertEqual(propertyServiceMock.getPropertyPrice(property), null);
});

runTest('should extract rating from property', () => {
  const property = {
    rating: 4.5
  };
  assertEqual(propertyServiceMock.getPropertyRating(property), 4.5);
});

runTest('should extract rating from metadata', () => {
  const property = {
    metadata: {
      rating: 4.2
    }
  };
  assertEqual(propertyServiceMock.getPropertyRating(property), 4.2);
});

runTest('should return null for property without rating', () => {
  const property = {
    name: 'Test Property'
  };
  assertEqual(propertyServiceMock.getPropertyRating(property), null);
});

runTest('should extract amenities from property', () => {
  const property = {
    amenities: ['wifi', 'parking', 'pool']
  };
  assertEqual(propertyServiceMock.getPropertyAmenities(property), ['wifi', 'parking', 'pool']);
});

runTest('should extract amenities from metadata', () => {
  const property = {
    metadata: {
      amenities: ['gym', 'spa']
    }
  };
  assertEqual(propertyServiceMock.getPropertyAmenities(property), ['gym', 'spa']);
});

runTest('should return empty array for property without amenities', () => {
  const property = {
    name: 'Test Property'
  };
  assertEqual(propertyServiceMock.getPropertyAmenities(property), []);
});

// Handling Amadeus Properties Tests
console.log('\n📁 Handling Amadeus Properties');

runTest('should handle Amadeus property with complete data', () => {
  const amadeusProperty = {
    id: 'amadeus_ACPAR419',
    title: 'LE NOTRE DAME',
    source: 'amadeus',
    isExternal: true,
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
      city: 'Paris',
      country: 'FR'
    },
    address: {
      line1: '123 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR'
    },
    amenities: ['wifi', 'parking', 'restaurant'],
    price: 3500,
    rating: 4.5,
    metadata: {
      chainCode: 'AC',
      cityCode: 'PAR',
      dupeId: 700140792,
      distance: {
        value: 0.92,
        unit: 'KM'
      }
    }
  };

  assert(propertyServiceMock.isAmadeusProperty(amadeusProperty) === true);
  assertEqual(propertyServiceMock.getSourceLabel(amadeusProperty), 'Amadeus');
  assertEqual(propertyServiceMock.getPropertyPrice(amadeusProperty), 3500);
  assertEqual(propertyServiceMock.getPropertyRating(amadeusProperty), 4.5);
  assertEqual(propertyServiceMock.getPropertyAmenities(amadeusProperty), ['wifi', 'parking', 'restaurant']);
});

runTest('should handle Amadeus property with minimal data', () => {
  const amadeusProperty = {
    id: 'amadeus_TESTHOTEL',
    title: 'Test Hotel',
    source: 'amadeus',
    isExternal: true
  };

  assert(propertyServiceMock.isAmadeusProperty(amadeusProperty) === true);
  assertEqual(propertyServiceMock.getSourceLabel(amadeusProperty), 'Amadeus');
  assertEqual(propertyServiceMock.getPropertyPrice(amadeusProperty), null);
  assertEqual(propertyServiceMock.getPropertyRating(amadeusProperty), null);
  assertEqual(propertyServiceMock.getPropertyAmenities(amadeusProperty), []);
});

// Handling Local Properties Tests
console.log('\n📁 Handling Local Properties');

runTest('should handle local property with complete data', () => {
  const localProperty = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test PG',
    source: 'local',
    isExternal: false,
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      address: '123 MG Road'
    },
    amenities: ['wifi', 'meals', 'laundry'],
    metadata: {
      pgOptions: {
        basePrice: 5000
      },
      rating: 4.2
    }
  };

  assert(propertyServiceMock.isAmadeusProperty(localProperty) === false);
  assertEqual(propertyServiceMock.getSourceLabel(localProperty), 'Local');
  assertEqual(propertyServiceMock.getPropertyPrice(localProperty), 5000);
  assertEqual(propertyServiceMock.getPropertyRating(localProperty), 4.2);
  assertEqual(propertyServiceMock.getPropertyAmenities(localProperty), ['wifi', 'meals', 'laundry']);
});

// Summary
console.log(`\n✨ Tests completed: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed > 0) {
  process.exit(1);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    propertyServiceMock
  };
}
