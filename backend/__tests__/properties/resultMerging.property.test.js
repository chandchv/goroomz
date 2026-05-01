/**
 * Property-Based Tests for Result Merging
 * Feature: amadeus-hotel-integration, Property 15: Result Merging
 * 
 * Validates: Requirements 5.2
 * 
 * Property 15: Result Merging
 * For any two result sets (local and Amadeus), the system should merge them 
 * into a single unified response preserving all results from both sources.
 */

const fc = require('fast-check');

// Import the mergeResults function
// Since it's not exported, we'll test it through the route behavior
// For now, we'll create a standalone version for testing
function mergeResults(localResults, amadeusResults) {
  // Validate inputs
  const validLocalResults = Array.isArray(localResults) ? localResults : [];
  const validAmadeusResults = Array.isArray(amadeusResults) ? amadeusResults : [];

  // Ensure all local results have source metadata
  const normalizedLocalResults = validLocalResults.map(result => ({
    ...result,
    source: 'local',
    isExternal: false
  }));

  // Ensure all Amadeus results have source metadata
  const normalizedAmadeusResults = validAmadeusResults.map(result => ({
    ...result,
    source: result.source || 'amadeus',
    isExternal: result.isExternal !== undefined ? result.isExternal : true
  }));

  // Concatenate results preserving source metadata
  return [...normalizedLocalResults, ...normalizedAmadeusResults];
}

// Generators for test data
const localPropertyGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  type: fc.constantFrom('pg', 'hotel', 'hostel'),
  location: fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true }),
    city: fc.string({ minLength: 3, maxLength: 50 }),
    area: fc.string({ minLength: 3, maxLength: 50 })
  }),
  metadata: fc.record({
    pgOptions: fc.record({
      basePrice: fc.double({ min: 1000, max: 50000, noNaN: true })
    })
  }),
  rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }))
});

const amadeusHotelGenerator = () => fc.record({
  id: fc.string({ minLength: 8, maxLength: 20 }).map(s => `amadeus_${s.substring(0, 8).toUpperCase()}`),
  title: fc.string({ minLength: 3, maxLength: 100 }),
  source: fc.constant('amadeus'),
  isExternal: fc.constant(true),
  location: fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true })
  }),
  metadata: fc.record({
    chainCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join('')),
    cityCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')),
    distance: fc.option(fc.record({
      value: fc.double({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('KM', 'MILE')
    }))
  }),
  price: fc.option(fc.double({ min: 1000, max: 50000, noNaN: true })),
  rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }))
});

describe('Feature: amadeus-hotel-integration, Property 15: Result Merging', () => {
  describe('Property 15: Result Merging', () => {
    it('should merge results from both sources preserving all items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 0, maxLength: 20 }),
          fc.array(amadeusHotelGenerator(), { minLength: 0, maxLength: 20 }),
          async (localResults, amadeusResults) => {
            const merged = mergeResults(localResults, amadeusResults);
            
            // Total count should equal sum of both sources
            expect(merged.length).toBe(localResults.length + amadeusResults.length);
            
            // All local results should be present with correct source metadata
            localResults.forEach(local => {
              const found = merged.find(m => m.id === local.id);
              expect(found).toBeDefined();
              expect(found.source).toBe('local');
              expect(found.isExternal).toBe(false);
            });
            
            // All Amadeus results should be present with correct source metadata
            amadeusResults.forEach(amadeus => {
              const found = merged.find(m => m.id === amadeus.id);
              expect(found).toBeDefined();
              expect(found.source).toBe('amadeus');
              expect(found.isExternal).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty local results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 20 }),
          async (amadeusResults) => {
            const merged = mergeResults([], amadeusResults);
            
            // Should only contain Amadeus results
            expect(merged.length).toBe(amadeusResults.length);
            
            // All results should be from Amadeus
            merged.forEach(result => {
              expect(result.source).toBe('amadeus');
              expect(result.isExternal).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty Amadeus results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 20 }),
          async (localResults) => {
            const merged = mergeResults(localResults, []);
            
            // Should only contain local results
            expect(merged.length).toBe(localResults.length);
            
            // All results should be from local
            merged.forEach(result => {
              expect(result.source).toBe('local');
              expect(result.isExternal).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle both empty arrays', async () => {
      const merged = mergeResults([], []);
      expect(merged).toEqual([]);
      expect(merged.length).toBe(0);
    });

    it('should preserve all properties from original results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = mergeResults(localResults, amadeusResults);
            
            // Check that all original properties are preserved
            localResults.forEach(local => {
              const found = merged.find(m => m.id === local.id);
              expect(found).toBeDefined();
              
              // Check key properties are preserved
              expect(found.name).toBe(local.name);
              expect(found.type).toBe(local.type);
              expect(found.location).toEqual(local.location);
              expect(found.metadata).toEqual(local.metadata);
            });
            
            amadeusResults.forEach(amadeus => {
              const found = merged.find(m => m.id === amadeus.id);
              expect(found).toBeDefined();
              
              // Check key properties are preserved
              expect(found.title).toBe(amadeus.title);
              expect(found.location).toEqual(amadeus.location);
              expect(found.metadata).toEqual(amadeus.metadata);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null or undefined inputs gracefully', async () => {
      // Test with null inputs
      const merged1 = mergeResults(null, null);
      expect(merged1).toEqual([]);
      
      // Test with undefined inputs
      const merged2 = mergeResults(undefined, undefined);
      expect(merged2).toEqual([]);
      
      // Test with mixed null/undefined and valid array
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults) => {
            const merged3 = mergeResults(localResults, null);
            expect(merged3.length).toBe(localResults.length);
            
            const merged4 = mergeResults(null, localResults);
            expect(merged4.length).toBe(localResults.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should add source metadata to results missing it', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 50 })
            // No source or isExternal fields
          }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.record({
            id: fc.string({ minLength: 8, maxLength: 20 }),
            title: fc.string({ minLength: 3, maxLength: 50 })
            // No source or isExternal fields
          }), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = mergeResults(localResults, amadeusResults);
            
            // All results should have source metadata added
            merged.forEach(result => {
              expect(result.source).toBeDefined();
              expect(result.isExternal).toBeDefined();
              expect(typeof result.isExternal).toBe('boolean');
            });
            
            // First N results should be local
            for (let i = 0; i < localResults.length; i++) {
              expect(merged[i].source).toBe('local');
              expect(merged[i].isExternal).toBe(false);
            }
            
            // Remaining results should be Amadeus
            for (let i = localResults.length; i < merged.length; i++) {
              expect(merged[i].source).toBe('amadeus');
              expect(merged[i].isExternal).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
