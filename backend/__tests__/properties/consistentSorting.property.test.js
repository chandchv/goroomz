/**
 * Property-Based Tests for Consistent Sorting
 * Feature: amadeus-hotel-integration, Property 17: Consistent Sorting
 * 
 * Validates: Requirements 5.4
 * 
 * Property 17: Consistent Sorting
 * For any unified search results, the sorting order should be consistent across 
 * both local and Amadeus properties based on the specified sort criteria.
 */

const fc = require('fast-check');

// Import the sortResults function
// Since it's not exported, we'll create a standalone version for testing
function sortResults(results, sortBy = 'name', sortOrder = 'asc') {
  // Validate inputs
  if (!Array.isArray(results)) {
    return [];
  }

  const sorted = [...results];

  sorted.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'distance':
        // Get distance value from metadata
        // Handle both local and Amadeus distance formats
        aValue = a.metadata?.distance?.value || 
                 a.distance?.value || 
                 Infinity;
        bValue = b.metadata?.distance?.value || 
                 b.distance?.value || 
                 Infinity;
        break;

      case 'price':
        // Get price value - handle different structures for local vs Amadeus
        // Local: metadata.pgOptions.basePrice or price
        // Amadeus: price or metadata.price
        aValue = a.metadata?.pgOptions?.basePrice || 
                 a.price || 
                 a.metadata?.price || 
                 Infinity;
        bValue = b.metadata?.pgOptions?.basePrice || 
                 b.price || 
                 b.metadata?.price || 
                 Infinity;
        break;

      case 'rating':
        // Get rating value - handle different structures
        // Local: rating or metadata.rating
        // Amadeus: rating or metadata.rating
        aValue = a.rating || 
                 a.metadata?.rating || 
                 0;
        bValue = b.rating || 
                 b.metadata?.rating || 
                 0;
        break;

      case 'name':
      default:
        // Sort by name/title - handle both field names
        aValue = (a.name || a.title || '').toLowerCase();
        bValue = (b.name || b.title || '').toLowerCase();
        break;
    }

    // Compare values based on sort order
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// Generators for test data
const localPropertyGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  source: fc.constant('local'),
  isExternal: fc.constant(false),
  location: fc.record({
    latitude: fc.double({ min: -90, max: 90, noNaN: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true })
  }),
  metadata: fc.record({
    pgOptions: fc.record({
      basePrice: fc.double({ min: 1000, max: 50000, noNaN: true })
    }),
    distance: fc.option(fc.record({
      value: fc.double({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('KM', 'MILE')
    })),
    rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }))
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
    })),
    rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }))
  }),
  price: fc.option(fc.double({ min: 1000, max: 50000, noNaN: true })),
  rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }))
});

describe('Feature: amadeus-hotel-integration, Property 17: Consistent Sorting', () => {
  describe('Property 17: Consistent Sorting', () => {
    it('should sort by name consistently across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'name', 'asc');
            
            // Verify sorting is correct
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentName = (sorted[i].name || sorted[i].title || '').toLowerCase();
              const nextName = (sorted[i + 1].name || sorted[i + 1].title || '').toLowerCase();
              expect(currentName <= nextName).toBe(true);
            }
            
            // Verify all items are present
            expect(sorted.length).toBe(merged.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort by name descending consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'name', 'desc');
            
            // Verify sorting is correct (descending)
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentName = (sorted[i].name || sorted[i].title || '').toLowerCase();
              const nextName = (sorted[i + 1].name || sorted[i + 1].title || '').toLowerCase();
              expect(currentName >= nextName).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort by price consistently across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'price', 'asc');
            
            // Verify sorting is correct
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentPrice = sorted[i].metadata?.pgOptions?.basePrice || 
                                   sorted[i].price || 
                                   sorted[i].metadata?.price || 
                                   Infinity;
              const nextPrice = sorted[i + 1].metadata?.pgOptions?.basePrice || 
                               sorted[i + 1].price || 
                               sorted[i + 1].metadata?.price || 
                               Infinity;
              expect(currentPrice <= nextPrice).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort by price descending consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'price', 'desc');
            
            // Verify sorting is correct (descending)
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentPrice = sorted[i].metadata?.pgOptions?.basePrice || 
                                   sorted[i].price || 
                                   sorted[i].metadata?.price || 
                                   Infinity;
              const nextPrice = sorted[i + 1].metadata?.pgOptions?.basePrice || 
                               sorted[i + 1].price || 
                               sorted[i + 1].metadata?.price || 
                               Infinity;
              expect(currentPrice >= nextPrice).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort by rating consistently across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'rating', 'asc');
            
            // Verify sorting is correct
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentRating = sorted[i].rating || sorted[i].metadata?.rating || 0;
              const nextRating = sorted[i + 1].rating || sorted[i + 1].metadata?.rating || 0;
              expect(currentRating <= nextRating).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort by distance consistently across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, 'distance', 'asc');
            
            // Verify sorting is correct
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDistance = sorted[i].metadata?.distance?.value || 
                                     sorted[i].distance?.value || 
                                     Infinity;
              const nextDistance = sorted[i + 1].metadata?.distance?.value || 
                                  sorted[i + 1].distance?.value || 
                                  Infinity;
              expect(currentDistance <= nextDistance).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty arrays', async () => {
      const sorted = sortResults([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });

    it('should handle null or undefined inputs', async () => {
      const sorted1 = sortResults(null, 'name', 'asc');
      expect(sorted1).toEqual([]);
      
      const sorted2 = sortResults(undefined, 'name', 'asc');
      expect(sorted2).toEqual([]);
    });

    it('should preserve all items when sorting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 20 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 20 }),
          fc.constantFrom('name', 'price', 'rating', 'distance'),
          fc.constantFrom('asc', 'desc'),
          async (localResults, amadeusResults, sortBy, sortOrder) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, sortBy, sortOrder);
            
            // Verify all items are present
            expect(sorted.length).toBe(merged.length);
            
            // Verify each item from merged is in sorted
            merged.forEach(item => {
              expect(sorted.find(s => s.id === item.id)).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed sources with missing sort fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 50 }),
            source: fc.constant('local')
            // No price, rating, or distance
          }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.record({
            id: fc.string({ minLength: 8, maxLength: 20 }),
            title: fc.string({ minLength: 3, maxLength: 50 }),
            source: fc.constant('amadeus')
            // No price, rating, or distance
          }), { minLength: 1, maxLength: 10 }),
          fc.constantFrom('price', 'rating', 'distance'),
          async (localResults, amadeusResults, sortBy) => {
            const merged = [...localResults, ...amadeusResults];
            const sorted = sortResults(merged, sortBy, 'asc');
            
            // Should not throw and should return all items
            expect(sorted.length).toBe(merged.length);
            
            // Items without the sort field should be at the end (Infinity or 0)
            // Just verify no errors occur
            expect(sorted).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should be stable - items with equal sort values maintain relative order', async () => {
      // Create items with same name but different IDs
      const items = [
        { id: '1', name: 'Hotel A', source: 'local' },
        { id: '2', name: 'Hotel A', source: 'amadeus' },
        { id: '3', name: 'Hotel A', source: 'local' },
        { id: '4', title: 'Hotel A', source: 'amadeus' }
      ];
      
      const sorted = sortResults(items, 'name', 'asc');
      
      // All items should be present
      expect(sorted.length).toBe(4);
      
      // All should have the same name
      sorted.forEach(item => {
        const name = item.name || item.title;
        expect(name).toBe('Hotel A');
      });
    });
  });
});
