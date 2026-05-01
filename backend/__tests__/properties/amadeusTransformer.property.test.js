/**
 * Property-Based Tests for Amadeus Transformer
 * 
 * Tests universal properties that should hold for all data transformation scenarios.
 */

const fc = require('fast-check');
const AmadeusTransformer = require('../../services/amadeus/AmadeusTransformer');

// Generator for valid Amadeus hotel objects
function amadeusHotelGenerator() {
  return fc.record({
    hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
    name: fc.string({ minLength: 3, maxLength: 100 }),
    chainCode: fc.option(fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join(''))),
    iataCode: fc.option(fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 3, maxLength: 3 }).map(arr => arr.join(''))),
    dupeId: fc.option(fc.integer({ min: 100000000, max: 999999999 })),
    geoCode: fc.option(fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    })),
    address: fc.option(fc.record({
      lines: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 })),
      cityName: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
      stateCode: fc.option(fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join(''))),
      postalCode: fc.option(fc.string({ minLength: 3, maxLength: 10 })),
      countryCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join(''))
    })),
    distance: fc.option(fc.record({
      value: fc.double({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('KM', 'MILE')
    })),
    amenities: fc.option(fc.array(
      fc.constantFrom('WIFI', 'PARKING', 'RESTAURANT', 'POOL', 'GYM', 'SPA', 'BAR', 'ROOM_SERVICE'),
      { minLength: 0, maxLength: 8 }
    ))
  });
}

// Generator for partial Amadeus hotels (with missing optional fields)
function partialAmadeusHotelGenerator() {
  return fc.record({
    hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
    name: fc.string({ minLength: 3, maxLength: 100 }),
    // All other fields are optional and may be missing
    chainCode: fc.option(fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join('')), { nil: null }),
    iataCode: fc.option(fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 3, maxLength: 3 }).map(arr => arr.join('')), { nil: null }),
    dupeId: fc.option(fc.integer({ min: 100000000, max: 999999999 }), { nil: null }),
    geoCode: fc.option(fc.record({
      latitude: fc.double({ min: -90, max: 90, noNaN: true }),
      longitude: fc.double({ min: -180, max: 180, noNaN: true })
    }), { nil: null }),
    address: fc.option(fc.record({
      countryCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join(''))
    }), { nil: null }),
    distance: fc.option(fc.record({
      value: fc.double({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('KM', 'MILE')
    }), { nil: null })
  });
}

describe('Feature: amadeus-hotel-integration, Property 6: Hotel Data Transformation', () => {
  /**
   * Property 6: Hotel Data Transformation
   * For any valid Amadeus hotel response, the transformed output should conform 
   * to the GoRoomz property schema with all required fields present.
   * 
   * Validates: Requirements 2.3, 10.1
   */
  it('should transform any valid Amadeus hotel to GoRoomz schema', async () => {
    await fc.assert(
      fc.asyncProperty(
        amadeusHotelGenerator(),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify required fields exist
          expect(transformed).toHaveProperty('id');
          expect(transformed).toHaveProperty('title');
          expect(transformed).toHaveProperty('source', 'amadeus');
          expect(transformed).toHaveProperty('isExternal', true);
          expect(transformed).toHaveProperty('bookingType', 'external');
          expect(transformed).toHaveProperty('metadata');
          expect(transformed.metadata).toHaveProperty('amadeusHotelId');
          
          // Verify ID format
          expect(transformed.id).toMatch(/^amadeus_[A-Z0-9]{8}$/);
          expect(transformed.id).toBe(`amadeus_${amadeusHotel.hotelId}`);
          
          // Verify title is preserved
          expect(transformed.title).toBe(amadeusHotel.name);
          
          // Verify metadata contains original hotel ID
          expect(transformed.metadata.amadeusHotelId).toBe(amadeusHotel.hotelId);
          
          // Verify address object exists
          expect(transformed).toHaveProperty('address');
          expect(typeof transformed.address).toBe('object');
          
          // Verify amenities is an array
          expect(Array.isArray(transformed.amenities)).toBe(true);
          
          // Verify images is an array
          expect(Array.isArray(transformed.images)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 7: Distance Information Preservation', () => {
  /**
   * Property 7: Distance Information Preservation
   * For any Amadeus search result that includes distance information, 
   * the transformed result should preserve that distance data in the standardized format.
   * 
   * Validates: Requirements 2.4, 3.4
   */
  it('should preserve distance information when present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
          name: fc.string({ minLength: 3, maxLength: 100 }),
          distance: fc.record({
            value: fc.double({ min: 0, max: 100, noNaN: true }),
            unit: fc.constantFrom('KM', 'MILE')
          })
        }),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify distance is preserved in metadata
          expect(transformed.metadata).toHaveProperty('distance');
          expect(transformed.metadata.distance).toEqual(amadeusHotel.distance);
          expect(transformed.metadata.distance.value).toBe(amadeusHotel.distance.value);
          expect(transformed.metadata.distance.unit).toBe(amadeusHotel.distance.unit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle missing distance information gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
          name: fc.string({ minLength: 3, maxLength: 100 })
          // No distance field
        }),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify distance is null when not provided
          expect(transformed.metadata.distance).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 22: Missing Field Handling', () => {
  /**
   * Property 22: Missing Field Handling
   * For any Amadeus hotel object with missing optional fields, 
   * the transformation should complete successfully with appropriate default values.
   * 
   * Validates: Requirements 10.2
   */
  it('should handle Amadeus hotels with missing optional fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        partialAmadeusHotelGenerator(),
        async (partialHotel) => {
          const transformer = new AmadeusTransformer();
          
          // Should not throw
          const transformed = transformer.transformHotel(partialHotel);
          
          // Required fields should still exist
          expect(transformed).toHaveProperty('id');
          expect(transformed).toHaveProperty('title');
          expect(transformed).toHaveProperty('source', 'amadeus');
          expect(transformed).toHaveProperty('isExternal', true);
          expect(transformed).toHaveProperty('bookingType', 'external');
          
          // Optional fields should have defaults if missing
          expect(transformed).toHaveProperty('address');
          expect(typeof transformed.address).toBe('object');
          expect(transformed.address).toHaveProperty('countryCode');
          
          // Location should be null if geoCode is missing
          if (!partialHotel.geoCode) {
            expect(transformed.location).toBeNull();
          }
          
          // Metadata fields should be null if not provided
          if (!partialHotel.chainCode) {
            expect(transformed.metadata.chainCode).toBeNull();
          }
          if (!partialHotel.iataCode) {
            expect(transformed.metadata.cityCode).toBeNull();
          }
          if (!partialHotel.dupeId) {
            expect(transformed.metadata.dupeId).toBeNull();
          }
          if (!partialHotel.distance) {
            expect(transformed.metadata.distance).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 23: Identifier Preservation', () => {
  /**
   * Property 23: Identifier Preservation
   * For any transformed Amadeus hotel, the original Amadeus hotel ID 
   * should be preserved and accessible for future API calls.
   * 
   * Validates: Requirements 10.3
   */
  it('should preserve original Amadeus hotel ID in metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        amadeusHotelGenerator(),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify original hotel ID is preserved in metadata
          expect(transformed.metadata).toHaveProperty('amadeusHotelId');
          expect(transformed.metadata.amadeusHotelId).toBe(amadeusHotel.hotelId);
          
          // Verify it's accessible and can be extracted
          const extractedId = transformed.metadata.amadeusHotelId;
          expect(extractedId).toBe(amadeusHotel.hotelId);
          expect(typeof extractedId).toBe('string');
          expect(extractedId.length).toBe(8);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 24: Address Format Conversion', () => {
  /**
   * Property 24: Address Format Conversion
   * For any Amadeus address object, the transformation should correctly convert it 
   * to the GoRoomz address format with all available fields mapped.
   * 
   * Validates: Requirements 10.4
   */
  it('should correctly convert Amadeus address to GoRoomz format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
          name: fc.string({ minLength: 3, maxLength: 100 }),
          address: fc.record({
            lines: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
            cityName: fc.string({ minLength: 2, maxLength: 50 }),
            stateCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join('')),
            postalCode: fc.string({ minLength: 3, maxLength: 10 }),
            countryCode: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 2, maxLength: 2 }).map(arr => arr.join(''))
          }),
          geoCode: fc.record({
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true })
          })
        }),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify address fields are mapped correctly
          expect(transformed.address).toHaveProperty('street');
          expect(transformed.address).toHaveProperty('city');
          expect(transformed.address).toHaveProperty('state');
          expect(transformed.address).toHaveProperty('postalCode');
          expect(transformed.address).toHaveProperty('countryCode');
          expect(transformed.address).toHaveProperty('country');
          expect(transformed.address).toHaveProperty('latitude');
          expect(transformed.address).toHaveProperty('longitude');
          
          // Verify specific mappings
          expect(transformed.address.street).toBe(amadeusHotel.address.lines.join(', '));
          expect(transformed.address.city).toBe(amadeusHotel.address.cityName);
          expect(transformed.address.state).toBe(amadeusHotel.address.stateCode);
          expect(transformed.address.postalCode).toBe(amadeusHotel.address.postalCode);
          expect(transformed.address.countryCode).toBe(amadeusHotel.address.countryCode);
          expect(transformed.address.latitude).toBe(amadeusHotel.geoCode.latitude);
          expect(transformed.address.longitude).toBe(amadeusHotel.geoCode.longitude);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 25: Amenity Mapping', () => {
  /**
   * Property 25: Amenity Mapping
   * For any set of Amadeus amenity codes, the transformation should map them 
   * to corresponding GoRoomz amenity codes using the defined mapping table.
   * 
   * Validates: Requirements 10.5
   */
  it('should correctly map Amadeus amenities to GoRoomz codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
          name: fc.string({ minLength: 3, maxLength: 100 }),
          amenities: fc.array(
            fc.constantFrom('WIFI', 'PARKING', 'RESTAURANT', 'POOL', 'GYM', 'SPA', 'BAR', 'ROOM_SERVICE'),
            { minLength: 1, maxLength: 8 }
          )
        }),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify amenities are mapped
          expect(Array.isArray(transformed.amenities)).toBe(true);
          expect(transformed.amenities.length).toBeGreaterThan(0);
          
          // Verify each amenity is mapped correctly
          const expectedMappings = {
            'WIFI': 'wifi',
            'PARKING': 'parking',
            'RESTAURANT': 'restaurant',
            'POOL': 'pool',
            'GYM': 'gym',
            'SPA': 'spa',
            'BAR': 'bar',
            'ROOM_SERVICE': 'room_service'
          };
          
          amadeusHotel.amenities.forEach(amadeusAmenity => {
            const expectedGoRoomzAmenity = expectedMappings[amadeusAmenity];
            if (expectedGoRoomzAmenity) {
              expect(transformed.amenities).toContain(expectedGoRoomzAmenity);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle unmapped amenities gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hotelId: fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), { minLength: 8, maxLength: 8 }).map(arr => arr.join('')),
          name: fc.string({ minLength: 3, maxLength: 100 }),
          amenities: fc.array(
            fc.string({ minLength: 5, maxLength: 20 }), // Random unmapped amenities
            { minLength: 1, maxLength: 5 }
          )
        }),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Should not throw, amenities array should be empty or contain only mapped items
          expect(Array.isArray(transformed.amenities)).toBe(true);
          // All items in transformed amenities should be valid GoRoomz codes
          transformed.amenities.forEach(amenity => {
            expect(typeof amenity).toBe('string');
            expect(amenity.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: amadeus-hotel-integration, Property 16: Source Indication', () => {
  /**
   * Property 16: Source Indication
   * For any property in the unified search results, it should have a clear source indicator 
   * ('local' or 'amadeus') in its metadata.
   * 
   * Validates: Requirements 5.3, 10.6
   */
  it('should clearly indicate source as amadeus for all transformed hotels', async () => {
    await fc.assert(
      fc.asyncProperty(
        amadeusHotelGenerator(),
        async (amadeusHotel) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotel(amadeusHotel);
          
          // Verify source indicators
          expect(transformed).toHaveProperty('source', 'amadeus');
          expect(transformed).toHaveProperty('isExternal', true);
          expect(transformed).toHaveProperty('bookingType', 'external');
          
          // Verify source is a string
          expect(typeof transformed.source).toBe('string');
          expect(transformed.source).toBe('amadeus');
          
          // Verify isExternal is boolean
          expect(typeof transformed.isExternal).toBe('boolean');
          expect(transformed.isExternal).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('AmadeusTransformer - Array Transformation', () => {
  it('should transform array of hotels preserving all valid items', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(amadeusHotelGenerator(), { minLength: 1, maxLength: 20 }),
        async (amadeusHotels) => {
          const transformer = new AmadeusTransformer();
          const transformed = transformer.transformHotels(amadeusHotels);
          
          // Verify all hotels are transformed
          expect(Array.isArray(transformed)).toBe(true);
          expect(transformed.length).toBe(amadeusHotels.length);
          
          // Verify each transformed hotel has required fields
          transformed.forEach((hotel, index) => {
            expect(hotel).toHaveProperty('id');
            expect(hotel).toHaveProperty('source', 'amadeus');
            expect(hotel.id).toBe(`amadeus_${amadeusHotels[index].hotelId}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
