/**
 * Property-Based Tests for Territory Overlap Prevention
 * Feature: internal-user-roles, Property 11: Territory overlap prevention
 * 
 * Property: For any two territories, if their geographic boundaries overlap, 
 * the system should prevent the assignment or alert the manager
 * 
 * Validates: Requirements 4.5
 */

const fc = require('fast-check');
const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: false
  }
});

// Define Territory model inline for testing
const Territory = sequelize.define('Territory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  boundaries: {
    type: DataTypes.JSON,
    allowNull: true
  },
  cities: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  states: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'territories'
});

/**
 * Helper function to check if two rectangular boundaries overlap
 * Boundaries are in format: { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
 */
function doRectangularBoundariesOverlap(boundary1, boundary2) {
  if (!boundary1 || !boundary2) return false;
  if (!boundary1.coordinates || !boundary2.coordinates) return false;
  if (boundary1.coordinates.length === 0 || boundary2.coordinates.length === 0) return false;

  // Extract coordinates for rectangular boundaries
  const coords1 = boundary1.coordinates[0];
  const coords2 = boundary2.coordinates[0];

  if (coords1.length < 4 || coords2.length < 4) return false;

  // Get bounding box for each territory (min/max lng/lat)
  const bbox1 = {
    minLng: Math.min(...coords1.map(c => c[0])),
    maxLng: Math.max(...coords1.map(c => c[0])),
    minLat: Math.min(...coords1.map(c => c[1])),
    maxLat: Math.max(...coords1.map(c => c[1]))
  };

  const bbox2 = {
    minLng: Math.min(...coords2.map(c => c[0])),
    maxLng: Math.max(...coords2.map(c => c[0])),
    minLat: Math.min(...coords2.map(c => c[1])),
    maxLat: Math.max(...coords2.map(c => c[1]))
  };

  // Check if bounding boxes overlap
  const overlapLng = bbox1.minLng <= bbox2.maxLng && bbox1.maxLng >= bbox2.minLng;
  const overlapLat = bbox1.minLat <= bbox2.maxLat && bbox1.maxLat >= bbox2.minLat;

  return overlapLng && overlapLat;
}

/**
 * Helper function to check if two territories have overlapping cities
 */
function doCitiesOverlap(cities1, cities2) {
  if (!cities1 || !cities2) return false;
  if (cities1.length === 0 || cities2.length === 0) return false;

  const set1 = new Set(cities1.map(c => c.toLowerCase()));
  const set2 = new Set(cities2.map(c => c.toLowerCase()));

  for (const city of set1) {
    if (set2.has(city)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper function to check if two territories have overlapping states
 */
function doStatesOverlap(states1, states2) {
  if (!states1 || !states2) return false;
  if (states1.length === 0 || states2.length === 0) return false;

  const set1 = new Set(states1.map(s => s.toLowerCase()));
  const set2 = new Set(states2.map(s => s.toLowerCase()));

  for (const state of set1) {
    if (set2.has(state)) {
      return true;
    }
  }

  return false;
}

/**
 * Function to validate territory assignment and check for overlaps
 * Returns { valid: boolean, reason: string }
 */
async function validateTerritoryAssignment(territoryData) {
  // Get all existing active territories
  const existingTerritories = await Territory.findAll({
    where: { isActive: true }
  });

  // Check for overlaps with existing territories
  for (const existing of existingTerritories) {
    // Check geographic boundary overlap
    if (territoryData.boundaries && existing.boundaries) {
      if (doRectangularBoundariesOverlap(territoryData.boundaries, existing.boundaries)) {
        return {
          valid: false,
          reason: `Geographic boundaries overlap with territory: ${existing.name}`
        };
      }
    }

    // Check city overlap
    if (territoryData.cities && existing.cities) {
      if (doCitiesOverlap(territoryData.cities, existing.cities)) {
        return {
          valid: false,
          reason: `Cities overlap with territory: ${existing.name}`
        };
      }
    }

    // Check state overlap (only if both territories define states)
    if (territoryData.states && existing.states) {
      if (doStatesOverlap(territoryData.states, existing.states)) {
        return {
          valid: false,
          reason: `States overlap with territory: ${existing.name}`
        };
      }
    }
  }

  return { valid: true, reason: null };
}

// Global counter that persists across all test runs and shrinking
let globalTerritoryCounter = 0;

describe('Property 11: Territory Overlap Prevention', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Territory.destroy({ where: {}, force: true });
  });

  /**
   * Generator for territory names
   * Using a global counter that persists across shrinking to ensure uniqueness
   */
  const territoryNameArbitrary = () =>
    fc.tuple(
      fc.constantFrom('North', 'South', 'East', 'West', 'Central'),
      fc.constantFrom('Region', 'Zone', 'Territory', 'District')
    ).map(([direction, type]) => {
      globalTerritoryCounter++;
      return `${direction} ${type} ${globalTerritoryCounter}`;
    });

  /**
   * Generator for city names
   */
  const cityArbitrary = () =>
    fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad');

  /**
   * Generator for state names
   */
  const stateArbitrary = () =>
    fc.constantFrom('Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat');

  /**
   * Generator for rectangular boundaries (GeoJSON Polygon)
   * Creates a simple rectangular boundary
   */
  const rectangularBoundaryArbitrary = () =>
    fc.record({
      minLng: fc.double({ min: 70, max: 85, noNaN: true }),
      minLat: fc.double({ min: 10, max: 25, noNaN: true }),
      width: fc.double({ min: 1, max: 5, noNaN: true }),
      height: fc.double({ min: 1, max: 5, noNaN: true })
    }).map(({ minLng, minLat, width, height }) => ({
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat],
        [minLng + width, minLat],
        [minLng + width, minLat + height],
        [minLng, minLat + height],
        [minLng, minLat] // Close the polygon
      ]]
    }));

  test('Property 11: Non-overlapping territories can coexist', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        fc.array(cityArbitrary(), { minLength: 1, maxLength: 3 }),
        fc.array(cityArbitrary(), { minLength: 1, maxLength: 3 }),
        async (territory1Name, territory2Name, cities1, cities2) => {
          try {
            // Ensure cities don't overlap
            const uniqueCities1 = Array.from(new Set(cities1));
            const uniqueCities2 = Array.from(new Set(cities2.filter(c => !uniqueCities1.includes(c))));

            if (uniqueCities2.length === 0) {
              // Skip if we can't create non-overlapping cities
              return true;
            }

            // Create first territory
            const territory1 = await Territory.create({
              name: territory1Name,
              cities: uniqueCities1,
              isActive: true
            });

            // Validate second territory (should be valid since cities don't overlap)
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              cities: uniqueCities2
            });

            // Property assertion: Non-overlapping territories should be valid
            expect(validation.valid).toBe(true);

            // Create second territory
            const territory2 = await Territory.create({
              name: territory2Name,
              cities: uniqueCities2,
              isActive: true
            });

            // Verify both territories exist
            const allTerritories = await Territory.findAll();
            expect(allTerritories.length).toBe(2);
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Overlapping cities are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        fc.array(cityArbitrary(), { minLength: 1, maxLength: 3 }),
        async (territory1Name, territory2Name, sharedCities) => {
          try {
            const uniqueCities = Array.from(new Set(sharedCities));

            // Create first territory with cities
            await Territory.create({
              name: territory1Name,
              cities: uniqueCities,
              isActive: true
            });

            // Try to validate second territory with overlapping cities
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              cities: uniqueCities // Same cities
            });

            // Property assertion: Overlapping cities should be detected
            expect(validation.valid).toBe(false);
            expect(validation.reason).toContain('Cities overlap');
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Overlapping states are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        fc.array(stateArbitrary(), { minLength: 1, maxLength: 3 }),
        async (territory1Name, territory2Name, sharedStates) => {
          try {
            const uniqueStates = Array.from(new Set(sharedStates));

            // Create first territory with states
            await Territory.create({
              name: territory1Name,
              states: uniqueStates,
              isActive: true
            });

            // Try to validate second territory with overlapping states
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              states: uniqueStates // Same states
            });

            // Property assertion: Overlapping states should be detected
            expect(validation.valid).toBe(false);
            expect(validation.reason).toContain('States overlap');
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Overlapping geographic boundaries are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        rectangularBoundaryArbitrary(),
        async (territory1Name, territory2Name, boundary) => {
          try {
            // Create first territory with boundary
            await Territory.create({
              name: territory1Name,
              boundaries: boundary,
              isActive: true
            });

            // Try to validate second territory with same boundary (complete overlap)
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              boundaries: boundary
            });

            // Property assertion: Overlapping boundaries should be detected
            expect(validation.valid).toBe(false);
            expect(validation.reason).toContain('Geographic boundaries overlap');
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Partially overlapping boundaries are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        fc.record({
          minLng: fc.double({ min: 70, max: 80, noNaN: true }),
          minLat: fc.double({ min: 10, max: 20, noNaN: true }),
          width: fc.double({ min: 2, max: 4, noNaN: true }),
          height: fc.double({ min: 2, max: 4, noNaN: true })
        }),
        async (territory1Name, territory2Name, baseRect) => {
          try {
            // Create first boundary
            const boundary1 = {
              type: 'Polygon',
              coordinates: [[
                [baseRect.minLng, baseRect.minLat],
                [baseRect.minLng + baseRect.width, baseRect.minLat],
                [baseRect.minLng + baseRect.width, baseRect.minLat + baseRect.height],
                [baseRect.minLng, baseRect.minLat + baseRect.height],
                [baseRect.minLng, baseRect.minLat]
              ]]
            };

            // Create second boundary that partially overlaps (shifted by half width/height)
            const boundary2 = {
              type: 'Polygon',
              coordinates: [[
                [baseRect.minLng + baseRect.width / 2, baseRect.minLat + baseRect.height / 2],
                [baseRect.minLng + baseRect.width * 1.5, baseRect.minLat + baseRect.height / 2],
                [baseRect.minLng + baseRect.width * 1.5, baseRect.minLat + baseRect.height * 1.5],
                [baseRect.minLng + baseRect.width / 2, baseRect.minLat + baseRect.height * 1.5],
                [baseRect.minLng + baseRect.width / 2, baseRect.minLat + baseRect.height / 2]
              ]]
            };

            // Create first territory
            await Territory.create({
              name: territory1Name,
              boundaries: boundary1,
              isActive: true
            });

            // Validate second territory with overlapping boundary
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              boundaries: boundary2
            });

            // Property assertion: Partial overlap should be detected
            expect(validation.valid).toBe(false);
            expect(validation.reason).toContain('Geographic boundaries overlap');
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 11: Inactive territories do not cause overlap conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        territoryNameArbitrary(),
        territoryNameArbitrary(),
        fc.array(cityArbitrary(), { minLength: 1, maxLength: 3 }),
        async (territory1Name, territory2Name, sharedCities) => {
          try {
            const uniqueCities = Array.from(new Set(sharedCities));

            // Create first territory with cities but mark as inactive
            await Territory.create({
              name: territory1Name,
              cities: uniqueCities,
              isActive: false // Inactive
            });

            // Validate second territory with same cities
            const validation = await validateTerritoryAssignment({
              name: territory2Name,
              cities: uniqueCities
            });

            // Property assertion: Inactive territories should not cause conflicts
            expect(validation.valid).toBe(true);
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 11: Multiple territories with different cities can coexist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cityArbitrary(), { minLength: 2, maxLength: 5 }),
        async (cities) => {
          try {
            // Ensure cities are unique
            const uniqueCities = Array.from(new Set(cities));

            if (uniqueCities.length < 2) {
              // Skip if we don't have enough unique cities
              return true;
            }

            // Create territories one by one, each with a different city
            for (let i = 0; i < uniqueCities.length; i++) {
              const territoryName = `Territory ${globalTerritoryCounter++}`;
              
              const validation = await validateTerritoryAssignment({
                name: territoryName,
                cities: [uniqueCities[i]]
              });

              // Property assertion: Each territory should be valid (no overlap)
              expect(validation.valid).toBe(true);

              await Territory.create({
                name: territoryName,
                cities: [uniqueCities[i]],
                isActive: true
              });
            }

            // Verify all territories were created
            const allTerritories = await Territory.findAll();
            expect(allTerritories.length).toBe(uniqueCities.length);
          } finally {
            // Clean up after each property test run
            await Territory.destroy({ where: {}, force: true });
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
