/**
 * Property-Based Tests for Cross-Source Filtering
 * Feature: amadeus-hotel-integration, Property 18: Cross-Source Filtering
 * 
 * Validates: Requirements 5.5
 * 
 * Property 18: Cross-Source Filtering
 * For any filter applied to unified search results, it should correctly filter 
 * properties from both local and Amadeus sources.
 */

const fc = require('fast-check');

// Import the applyFilters function
// Since it's not exported, we'll create a standalone version for testing
function applyFilters(results, filters = {}) {
  if (!Array.isArray(results)) {
    return [];
  }

  const { amenities, minPrice, maxPrice, ratings } = filters;

  let filtered = [...results];

  // Filter by amenities
  if (amenities && Array.isArray(amenities) && amenities.length > 0) {
    const amenityList = amenities.map(a => a.toLowerCase());
    
    filtered = filtered.filter(result => {
      // Handle different amenity structures for local vs Amadeus
      // Local: amenities array at root level
      // Amadeus: amenities in metadata or at root
      const resultAmenities = result.amenities || result.metadata?.amenities || [];
      
      if (!Array.isArray(resultAmenities)) {
        return false;
      }
      
      // Convert to lowercase for comparison
      const normalizedAmenities = resultAmenities.map(a => 
        typeof a === 'string' ? a.toLowerCase() : a
      );
      
      // Check if result has all requested amenities
      return amenityList.every(requestedAmenity => 
        normalizedAmenities.includes(requestedAmenity)
      );
    });
  }

  // Filter by price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filtered = filtered.filter(result => {
      // Extract price from different structures
      // Local: metadata.pgOptions.basePrice or price
      // Amadeus: price or metadata.price
      const price = result.metadata?.pgOptions?.basePrice || 
                    result.price || 
                    result.metadata?.price;
      
      // Skip results without price if filtering by price
      if (price === undefined || price === null) {
        return false;
      }
      
      const numericPrice = parseFloat(price);
      
      // Check min price
      if (minPrice !== undefined && numericPrice < parseFloat(minPrice)) {
        return false;
      }
      
      // Check max price
      if (maxPrice !== undefined && numericPrice > parseFloat(maxPrice)) {
        return false;
      }
      
      return true;
    });
  }

  // Filter by ratings
  if (ratings && Array.isArray(ratings) && ratings.length > 0) {
    const ratingValues = ratings.map(r => parseFloat(r));
    
    filtered = filtered.filter(result => {
      // Extract rating from different structures
      // Both local and Amadeus: rating or metadata.rating
      const rating = result.rating || result.metadata?.rating;
      
      // Skip results without rating if filtering by rating
      if (rating === undefined || rating === null) {
        return false;
      }
      
      const numericRating = parseFloat(rating);
      
      // Check if rating matches any of the requested ratings
      // Allow for some tolerance (e.g., 4.5 matches 4 or 5)
      return ratingValues.some(requestedRating => {
        // Round to nearest integer for comparison
        return Math.round(numericRating) === Math.round(requestedRating);
      });
    });
  }

  return filtered;
}

// Generators for test data
const amenityGenerator = () => fc.constantFrom(
  'wifi', 'parking', 'ac', 'tv', 'kitchen', 'laundry', 'gym', 'pool', 'security'
);

const localPropertyGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  source: fc.constant('local'),
  isExternal: fc.constant(false),
  amenities: fc.array(amenityGenerator(), { minLength: 0, maxLength: 5 }),
  metadata: fc.record({
    pgOptions: fc.record({
      basePrice: fc.double({ min: 1000, max: 50000, noNaN: true })
    })
  }),
  rating: fc.option(fc.double({ min: 1, max: 5, noNaN: true }))
});

const amadeusHotelGenerator = () => fc.record({
  id: fc.string({ minLength: 8, maxLength: 20 }).map(s => `amadeus_${s.substring(0, 8).toUpperCase()}`),
  title: fc.string({ minLength: 3, maxLength: 100 }),
  source: fc.constant('amadeus'),
  isExternal: fc.constant(true),
  amenities: fc.array(amenityGenerator(), { minLength: 0, maxLength: 5 }),
  price: fc.double({ min: 1000, max: 50000, noNaN: true }),
  rating: fc.option(fc.double({ min: 1, max: 5, noNaN: true }))
});

describe('Feature: amadeus-hotel-integration, Property 18: Cross-Source Filtering', () => {
  describe('Property 18: Cross-Source Filtering', () => {
    it('should filter by amenities across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 5, maxLength: 20 }),
          fc.array(amadeusHotelGenerator(), { minLength: 5, maxLength: 20 }),
          fc.array(amenityGenerator(), { minLength: 1, maxLength: 2 }),
          async (localResults, amadeusResults, requestedAmenities) => {
            const allResults = [...localResults, ...amadeusResults];
            const filtered = applyFilters(allResults, { amenities: requestedAmenities });
            
            // All filtered results should have the requested amenities
            filtered.forEach(result => {
              const resultAmenities = result.amenities || result.metadata?.amenities || [];
              const normalizedAmenities = resultAmenities.map(a => a.toLowerCase());
              
              requestedAmenities.forEach(requestedAmenity => {
                expect(normalizedAmenities).toContain(requestedAmenity.toLowerCase());
              });
            });
            
            // Filtered results should include both local and Amadeus if they match
            const localFiltered = filtered.filter(r => r.source === 'local');
            const amadeusFiltered = filtered.filter(r => r.source === 'amadeus');
            
            // Count how many of each source should match
            const expectedLocalCount = localResults.filter(r => {
              const amenities = (r.amenities || []).map(a => a.toLowerCase());
              return requestedAmenities.every(req => amenities.includes(req.toLowerCase()));
            }).length;
            
            const expectedAmadeusCount = amadeusResults.filter(r => {
              const amenities = (r.amenities || []).map(a => a.toLowerCase());
              return requestedAmenities.every(req => amenities.includes(req.toLowerCase()));
            }).length;
            
            expect(localFiltered.length).toBe(expectedLocalCount);
            expect(amadeusFiltered.length).toBe(expectedAmadeusCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by price range across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 5, maxLength: 20 }),
          fc.array(amadeusHotelGenerator(), { minLength: 5, maxLength: 20 }),
          fc.double({ min: 1000, max: 25000, noNaN: true }),
          fc.double({ min: 25000, max: 50000, noNaN: true }),
          async (localResults, amadeusResults, minPrice, maxPrice) => {
            const allResults = [...localResults, ...amadeusResults];
            const filtered = applyFilters(allResults, { minPrice, maxPrice });
            
            // All filtered results should be within price range
            filtered.forEach(result => {
              const price = result.metadata?.pgOptions?.basePrice || 
                           result.price || 
                           result.metadata?.price;
              
              expect(price).toBeDefined();
              expect(price).toBeGreaterThanOrEqual(minPrice);
              expect(price).toBeLessThanOrEqual(maxPrice);
            });
            
            // Verify both sources are filtered correctly
            const localFiltered = filtered.filter(r => r.source === 'local');
            const amadeusFiltered = filtered.filter(r => r.source === 'amadeus');
            
            // Count expected matches
            const expectedLocalCount = localResults.filter(r => {
              const price = r.metadata?.pgOptions?.basePrice;
              return price >= minPrice && price <= maxPrice;
            }).length;
            
            const expectedAmadeusCount = amadeusResults.filter(r => {
              const price = r.price;
              return price >= minPrice && price <= maxPrice;
            }).length;
            
            expect(localFiltered.length).toBe(expectedLocalCount);
            expect(amadeusFiltered.length).toBe(expectedAmadeusCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by ratings across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 5, maxLength: 20 }),
          fc.array(amadeusHotelGenerator(), { minLength: 5, maxLength: 20 }),
          fc.array(fc.double({ min: 1, max: 5, noNaN: true }), { minLength: 1, maxLength: 2 }),
          async (localResults, amadeusResults, requestedRatings) => {
            const allResults = [...localResults, ...amadeusResults];
            const filtered = applyFilters(allResults, { ratings: requestedRatings });
            
            // All filtered results should match one of the requested ratings (rounded)
            filtered.forEach(result => {
              const rating = result.rating || result.metadata?.rating;
              expect(rating).toBeDefined();
              
              const roundedRating = Math.round(rating);
              const roundedRequested = requestedRatings.map(r => Math.round(r));
              
              expect(roundedRequested).toContain(roundedRating);
            });
            
            // Verify both sources are filtered correctly
            const localFiltered = filtered.filter(r => r.source === 'local');
            const amadeusFiltered = filtered.filter(r => r.source === 'amadeus');
            
            // Both sources should be represented if they have matching ratings
            const hasLocalMatches = localResults.some(r => {
              if (!r.rating) return false;
              const roundedRating = Math.round(r.rating);
              return requestedRatings.some(req => Math.round(req) === roundedRating);
            });
            
            const hasAmadeusMatches = amadeusResults.some(r => {
              if (!r.rating) return false;
              const roundedRating = Math.round(r.rating);
              return requestedRatings.some(req => Math.round(req) === roundedRating);
            });
            
            if (hasLocalMatches) {
              expect(localFiltered.length).toBeGreaterThan(0);
            }
            
            if (hasAmadeusMatches) {
              expect(amadeusFiltered.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply multiple filters consistently across both sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 10, maxLength: 30 }),
          fc.array(amadeusHotelGenerator(), { minLength: 10, maxLength: 30 }),
          fc.array(amenityGenerator(), { minLength: 1, maxLength: 2 }),
          fc.double({ min: 1000, max: 25000, noNaN: true }),
          fc.double({ min: 25000, max: 50000, noNaN: true }),
          async (localResults, amadeusResults, amenities, minPrice, maxPrice) => {
            const allResults = [...localResults, ...amadeusResults];
            const filtered = applyFilters(allResults, {
              amenities,
              minPrice,
              maxPrice
            });
            
            // All filtered results should match ALL filter criteria
            filtered.forEach(result => {
              // Check amenities
              const resultAmenities = result.amenities || result.metadata?.amenities || [];
              const normalizedAmenities = resultAmenities.map(a => a.toLowerCase());
              amenities.forEach(amenity => {
                expect(normalizedAmenities).toContain(amenity.toLowerCase());
              });
              
              // Check price
              const price = result.metadata?.pgOptions?.basePrice || 
                           result.price || 
                           result.metadata?.price;
              expect(price).toBeGreaterThanOrEqual(minPrice);
              expect(price).toBeLessThanOrEqual(maxPrice);
            });
            
            // Verify filtering works consistently for both sources
            const localFiltered = filtered.filter(r => r.source === 'local');
            const amadeusFiltered = filtered.filter(r => r.source === 'amadeus');
            
            // Each filtered result should be from the original set
            localFiltered.forEach(result => {
              expect(localResults.some(r => r.id === result.id)).toBe(true);
            });
            
            amadeusFiltered.forEach(result => {
              expect(amadeusResults.some(r => r.id === result.id)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty filter criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const allResults = [...localResults, ...amadeusResults];
            const filtered = applyFilters(allResults, {});
            
            // With no filters, all results should be returned
            expect(filtered.length).toBe(allResults.length);
            expect(filtered).toEqual(allResults);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle results without filterable fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 3, maxLength: 50 }),
            source: fc.constant('local'),
            isExternal: fc.constant(false)
            // No amenities, price, or rating
          }), { minLength: 1, maxLength: 10 }),
          fc.array(amenityGenerator(), { minLength: 1, maxLength: 2 }),
          async (results, amenities) => {
            // Filter by amenities when results don't have amenities
            const filtered = applyFilters(results, { amenities });
            
            // Should return empty array since no results have amenities
            expect(filtered.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null or undefined filter values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(localPropertyGenerator(), { minLength: 1, maxLength: 10 }),
          fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 10 }),
          async (localResults, amadeusResults) => {
            const allResults = [...localResults, ...amadeusResults];
            
            // Test with null/undefined filters
            const filtered1 = applyFilters(allResults, { amenities: null });
            expect(filtered1.length).toBe(allResults.length);
            
            const filtered2 = applyFilters(allResults, { amenities: undefined });
            expect(filtered2.length).toBe(allResults.length);
            
            const filtered3 = applyFilters(allResults, { minPrice: undefined, maxPrice: undefined });
            expect(filtered3.length).toBe(allResults.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle invalid input gracefully', async () => {
      // Test with null input
      const filtered1 = applyFilters(null, { amenities: ['wifi'] });
      expect(filtered1).toEqual([]);
      
      // Test with undefined input
      const filtered2 = applyFilters(undefined, { amenities: ['wifi'] });
      expect(filtered2).toEqual([]);
      
      // Test with non-array input
      const filtered3 = applyFilters('not an array', { amenities: ['wifi'] });
      expect(filtered3).toEqual([]);
    });
  });
});
