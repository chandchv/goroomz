/**
 * Territory Generator for Property-Based Testing
 * Feature: role-segregation-optimization
 * 
 * Generates valid territory objects with proper geographic boundaries
 * and relationships to regional managers.
 */

const fc = require('fast-check');

/**
 * Indian cities by state for realistic territory generation
 */
const INDIAN_CITIES_BY_STATE = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
  'Karnataka': ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Delhi': ['New Delhi', 'Delhi'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur']
};

/**
 * State generator
 */
const stateArbitrary = () =>
  fc.constantFrom(...Object.keys(INDIAN_CITIES_BY_STATE));

/**
 * Cities for state generator
 */
const citiesForStateArbitrary = (state) => {
  const cities = INDIAN_CITIES_BY_STATE[state] || ['City1', 'City2'];
  return fc.array(
    fc.constantFrom(...cities),
    { minLength: 1, maxLength: cities.length }
  ).map(arr => [...new Set(arr)]); // Remove duplicates
};

/**
 * Geographic boundary generator
 * Generates a simple polygon boundary (GeoJSON format)
 */
const boundaryArbitrary = () =>
  fc.record({
    type: fc.constant('Polygon'),
    coordinates: fc.array(
      fc.array(
        fc.tuple(
          fc.float({ min: 68.0, max: 97.0, noNaN: true }), // Longitude (India range)
          fc.float({ min: 8.0, max: 35.0, noNaN: true })   // Latitude (India range)
        ),
        { minLength: 4, maxLength: 4 } // Polygon must close (4 points minimum)
      ),
      { minLength: 1, maxLength: 1 }
    )
  });

/**
 * Territory name generator
 */
const territoryNameArbitrary = () =>
  fc.tuple(
    fc.constantFrom('North', 'South', 'East', 'West', 'Central', 'Metro'),
    fc.constantFrom('Zone', 'Region', 'District', 'Area', 'Territory')
  ).map(([prefix, suffix]) => `${prefix} ${suffix}`);

/**
 * Basic territory generator
 */
const basicTerritoryArbitrary = () =>
  stateArbitrary().chain(state =>
    citiesForStateArbitrary(state).chain(cities =>
      fc.record({
        name: territoryNameArbitrary(),
        description: fc.option(
          fc.string({ minLength: 20, maxLength: 300 }),
          { nil: null }
        ),
        boundaries: boundaryArbitrary(),
        cities: fc.constant(cities),
        states: fc.constant([state]),
        isActive: fc.boolean()
      })
    )
  );

/**
 * Territory with regional manager generator
 */
const territoryWithManagerArbitrary = (regionalManagerId) =>
  basicTerritoryArbitrary().map(territory => ({
    ...territory,
    regionalManagerId
  }));

/**
 * Multi-state territory generator
 * Generates territories spanning multiple states
 */
const multiStateTerritoryArbitrary = () =>
  fc.array(
    stateArbitrary(),
    { minLength: 2, maxLength: 4 }
  ).chain(states => {
    const uniqueStates = [...new Set(states)];
    const allCities = uniqueStates.flatMap(state => 
      INDIAN_CITIES_BY_STATE[state] || []
    );
    
    return fc.array(
      fc.constantFrom(...allCities),
      { minLength: 2, maxLength: Math.min(10, allCities.length) }
    ).map(cities => ({
      name: territoryNameArbitrary(),
      description: fc.option(
        fc.string({ minLength: 20, maxLength: 300 }),
        { nil: null }
      ),
      boundaries: boundaryArbitrary(),
      cities: [...new Set(cities)],
      states: uniqueStates,
      isActive: fc.boolean()
    }));
  }).chain(gen => gen);

/**
 * Multiple territories generator
 * Generates non-overlapping territories
 */
const multipleTerritoriesArbitrary = (count) => {
  const states = Object.keys(INDIAN_CITIES_BY_STATE);
  
  return fc.array(
    fc.integer({ min: 0, max: states.length - 1 }),
    { minLength: count, maxLength: count }
  ).chain(stateIndices => {
    // Ensure unique states for non-overlapping territories
    const uniqueIndices = [...new Set(stateIndices)];
    const selectedStates = uniqueIndices.map(i => states[i]);
    
    return fc.tuple(
      ...selectedStates.map(state =>
        citiesForStateArbitrary(state).chain(cities =>
          fc.record({
            name: territoryNameArbitrary(),
            description: fc.option(
              fc.string({ minLength: 20, maxLength: 300 }),
              { nil: null }
            ),
            boundaries: boundaryArbitrary(),
            cities: fc.constant(cities),
            states: fc.constant([state]),
            isActive: fc.boolean()
          })
        )
      )
    );
  });
};

/**
 * Territories with managers generator
 * Generates territories each with their own regional manager
 */
const territoriesWithManagersArbitrary = (regionalManagerIds) =>
  fc.tuple(
    ...regionalManagerIds.map(managerId =>
      territoryWithManagerArbitrary(managerId)
    )
  );

/**
 * Overlapping territories generator (for testing conflict detection)
 * Generates territories that share cities
 */
const overlappingTerritoriesArbitrary = () =>
  stateArbitrary().chain(state =>
    citiesForStateArbitrary(state).chain(cities => {
      // Create two territories that share at least one city
      const sharedCity = cities[0];
      
      return fc.tuple(
        fc.record({
          name: territoryNameArbitrary(),
          description: fc.option(fc.string({ minLength: 20, maxLength: 300 }), { nil: null }),
          boundaries: boundaryArbitrary(),
          cities: fc.constant([sharedCity, ...cities.slice(1, Math.ceil(cities.length / 2))]),
          states: fc.constant([state]),
          isActive: fc.boolean()
        }),
        fc.record({
          name: territoryNameArbitrary(),
          description: fc.option(fc.string({ minLength: 20, maxLength: 300 }), { nil: null }),
          boundaries: boundaryArbitrary(),
          cities: fc.constant([sharedCity, ...cities.slice(Math.ceil(cities.length / 2))]),
          states: fc.constant([state]),
          isActive: fc.boolean()
        })
      );
    })
  );

/**
 * Territory coverage generator
 * Generates a set of territories that cover all specified cities
 */
const territoryCoverageArbitrary = (cities) => {
  // Group cities into territories
  const territoriesCount = Math.ceil(cities.length / 3);
  
  return fc.array(
    fc.integer({ min: 0, max: cities.length - 1 }),
    { minLength: territoriesCount, maxLength: territoriesCount }
  ).map(indices => {
    const territories = [];
    const citiesPerTerritory = Math.ceil(cities.length / territoriesCount);
    
    for (let i = 0; i < territoriesCount; i++) {
      const startIdx = i * citiesPerTerritory;
      const endIdx = Math.min(startIdx + citiesPerTerritory, cities.length);
      const territoryCities = cities.slice(startIdx, endIdx);
      
      if (territoryCities.length > 0) {
        territories.push({
          name: `Territory ${i + 1}`,
          description: `Covers ${territoryCities.join(', ')}`,
          boundaries: null, // Simplified for coverage testing
          cities: territoryCities,
          states: ['Test State'],
          isActive: true
        });
      }
    }
    
    return territories;
  });
};

/**
 * Agent territory assignment generator
 * Generates data for assigning agents to territories
 */
const agentTerritoryAssignmentArbitrary = (agentId, territoryId) =>
  fc.record({
    agentId: fc.constant(agentId),
    territoryId: fc.constant(territoryId),
    assignedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    isActive: fc.boolean()
  });

module.exports = {
  // Basic generators
  stateArbitrary,
  citiesForStateArbitrary,
  boundaryArbitrary,
  territoryNameArbitrary,
  
  // Territory generators
  basicTerritoryArbitrary,
  territoryWithManagerArbitrary,
  multiStateTerritoryArbitrary,
  multipleTerritoriesArbitrary,
  territoriesWithManagersArbitrary,
  overlappingTerritoriesArbitrary,
  territoryCoverageArbitrary,
  
  // Assignment generators
  agentTerritoryAssignmentArbitrary,
  
  // Constants
  INDIAN_CITIES_BY_STATE
};
