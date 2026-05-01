/**
 * Unit Tests for Amadeus Transformer
 * 
 * Tests specific examples and edge cases for data transformation.
 */

const AmadeusTransformer = require('../../services/amadeus/AmadeusTransformer');

describe('AmadeusTransformer - Hotel Transformation', () => {
  let transformer;

  beforeEach(() => {
    transformer = new AmadeusTransformer();
  });

  describe('transformHotel - Complete Data', () => {
    it('should transform hotel with complete data', () => {
      const amadeusHotel = {
        hotelId: 'ACPAR419',
        name: 'LE NOTRE DAME',
        chainCode: 'AC',
        iataCode: 'PAR',
        dupeId: 700140792,
        geoCode: {
          latitude: 48.85341,
          longitude: 2.34880
        },
        address: {
          lines: ['1 Rue de la Cite'],
          cityName: 'Paris',
          stateCode: 'FR',
          postalCode: '75004',
          countryCode: 'FR'
        },
        distance: {
          value: 0.92,
          unit: 'KM'
        },
        amenities: ['WIFI', 'PARKING', 'RESTAURANT', 'BAR']
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.id).toBe('amadeus_ACPAR419');
      expect(result.title).toBe('LE NOTRE DAME');
      expect(result.source).toBe('amadeus');
      expect(result.isExternal).toBe(true);
      expect(result.bookingType).toBe('external');
      
      expect(result.location).toEqual({
        latitude: 48.85341,
        longitude: 2.34880
      });
      
      expect(result.address.street).toBe('1 Rue de la Cite');
      expect(result.address.city).toBe('Paris');
      expect(result.address.state).toBe('FR');
      expect(result.address.postalCode).toBe('75004');
      expect(result.address.countryCode).toBe('FR');
      expect(result.address.country).toBe('France');
      
      expect(result.amenities).toEqual(['wifi', 'parking', 'restaurant', 'bar']);
      
      expect(result.metadata.amadeusHotelId).toBe('ACPAR419');
      expect(result.metadata.chainCode).toBe('AC');
      expect(result.metadata.cityCode).toBe('PAR');
      expect(result.metadata.dupeId).toBe(700140792);
      expect(result.metadata.distance).toEqual({ value: 0.92, unit: 'KM' });
    });
  });

  describe('transformHotel - Minimal Required Fields', () => {
    it('should transform hotel with only required fields', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT01',
        name: 'Test Hotel'
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.id).toBe('amadeus_TESTHT01');
      expect(result.title).toBe('Test Hotel');
      expect(result.source).toBe('amadeus');
      expect(result.isExternal).toBe(true);
      expect(result.bookingType).toBe('external');
      
      expect(result.location).toBeNull();
      expect(result.address).toBeDefined();
      expect(result.address.street).toBe('');
      expect(result.address.city).toBe('');
      expect(result.address.countryCode).toBe('');
      
      expect(result.amenities).toEqual([]);
      expect(result.images).toEqual([]);
      
      expect(result.metadata.amadeusHotelId).toBe('TESTHT01');
      expect(result.metadata.chainCode).toBeNull();
      expect(result.metadata.cityCode).toBeNull();
      expect(result.metadata.dupeId).toBeNull();
      expect(result.metadata.distance).toBeNull();
    });
  });

  describe('transformHotel - Various Amenity Combinations', () => {
    it('should map all known amenities correctly', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT02',
        name: 'Full Amenity Hotel',
        amenities: [
          'WIFI', 'PARKING', 'RESTAURANT', 'POOL', 'GYM', 'SPA', 
          'BAR', 'ROOM_SERVICE', 'LAUNDRY', 'AIR_CONDITIONING'
        ]
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.amenities).toContain('wifi');
      expect(result.amenities).toContain('parking');
      expect(result.amenities).toContain('restaurant');
      expect(result.amenities).toContain('pool');
      expect(result.amenities).toContain('gym');
      expect(result.amenities).toContain('spa');
      expect(result.amenities).toContain('bar');
      expect(result.amenities).toContain('room_service');
      expect(result.amenities).toContain('laundry');
      expect(result.amenities).toContain('ac');
    });

    it('should filter out unmapped amenities', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT03',
        name: 'Mixed Amenity Hotel',
        amenities: ['WIFI', 'UNKNOWN_AMENITY', 'PARKING', 'ANOTHER_UNKNOWN']
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.amenities).toEqual(['wifi', 'parking']);
      expect(result.amenities).not.toContain('UNKNOWN_AMENITY');
      expect(result.amenities).not.toContain('ANOTHER_UNKNOWN');
    });

    it('should handle empty amenities array', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT04',
        name: 'No Amenity Hotel',
        amenities: []
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.amenities).toEqual([]);
    });

    it('should handle missing amenities field', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT05',
        name: 'Hotel Without Amenities'
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.amenities).toEqual([]);
    });
  });

  describe('transformHotel - Different Address Formats', () => {
    it('should handle address with multiple lines', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT06',
        name: 'Multi-line Address Hotel',
        address: {
          lines: ['123 Main Street', 'Suite 456', 'Building B'],
          cityName: 'New York',
          countryCode: 'US'
        }
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.address.street).toBe('123 Main Street, Suite 456, Building B');
    });

    it('should handle address with single line', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT07',
        name: 'Single-line Address Hotel',
        address: {
          lines: ['456 Oak Avenue'],
          cityName: 'London',
          countryCode: 'GB'
        }
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.address.street).toBe('456 Oak Avenue');
    });

    it('should handle address without lines', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT08',
        name: 'No Street Address Hotel',
        address: {
          cityName: 'Tokyo',
          countryCode: 'JP'
        }
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.address.street).toBe('');
      expect(result.address.city).toBe('Tokyo');
      expect(result.address.countryCode).toBe('JP');
    });

    it('should handle partial address with only country code', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT09',
        name: 'Minimal Address Hotel',
        address: {
          countryCode: 'DE'
        }
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.address.street).toBe('');
      expect(result.address.city).toBe('');
      expect(result.address.state).toBe('');
      expect(result.address.postalCode).toBe('');
      expect(result.address.countryCode).toBe('DE');
      expect(result.address.country).toBe('Germany');
    });

    it('should handle missing address entirely', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT10',
        name: 'No Address Hotel'
      };

      const result = transformer.transformHotel(amadeusHotel);

      expect(result.address).toBeDefined();
      expect(result.address.street).toBe('');
      expect(result.address.city).toBe('');
      expect(result.address.countryCode).toBe('');
    });
  });

  describe('transformHotel - Error Handling', () => {
    it('should throw error for missing hotelId', () => {
      const amadeusHotel = {
        name: 'Hotel Without ID'
      };

      expect(() => transformer.transformHotel(amadeusHotel)).toThrow('missing required fields');
    });

    it('should throw error for missing name', () => {
      const amadeusHotel = {
        hotelId: 'TESTHT11'
      };

      expect(() => transformer.transformHotel(amadeusHotel)).toThrow('missing required fields');
    });

    it('should throw error for null input', () => {
      expect(() => transformer.transformHotel(null)).toThrow('Invalid Amadeus hotel object');
    });

    it('should throw error for undefined input', () => {
      expect(() => transformer.transformHotel(undefined)).toThrow('Invalid Amadeus hotel object');
    });
  });

  describe('transformHotels - Array Transformation', () => {
    it('should transform array of valid hotels', () => {
      const amadeusHotels = [
        { hotelId: 'HOTEL001', name: 'Hotel One' },
        { hotelId: 'HOTEL002', name: 'Hotel Two' },
        { hotelId: 'HOTEL003', name: 'Hotel Three' }
      ];

      const result = transformer.transformHotels(amadeusHotels);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('amadeus_HOTEL001');
      expect(result[1].id).toBe('amadeus_HOTEL002');
      expect(result[2].id).toBe('amadeus_HOTEL003');
    });

    it('should filter out invalid hotels and continue', () => {
      const amadeusHotels = [
        { hotelId: 'HOTEL001', name: 'Hotel One' },
        { name: 'Invalid Hotel' }, // Missing hotelId
        { hotelId: 'HOTEL003', name: 'Hotel Three' }
      ];

      // Mock console.error to suppress error output
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = transformer.transformHotels(amadeusHotels);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('amadeus_HOTEL001');
      expect(result[1].id).toBe('amadeus_HOTEL003');
      expect(console.error).toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should handle empty array', () => {
      const result = transformer.transformHotels([]);

      expect(result).toEqual([]);
    });

    it('should throw error for non-array input', () => {
      expect(() => transformer.transformHotels('not an array')).toThrow('expected array');
      expect(() => transformer.transformHotels(null)).toThrow('expected array');
      expect(() => transformer.transformHotels(undefined)).toThrow('expected array');
    });
  });

  describe('mapAmenities', () => {
    it('should map known amenities', () => {
      const amenities = ['WIFI', 'PARKING', 'POOL'];
      const result = transformer.mapAmenities(amenities);

      expect(result).toEqual(['wifi', 'parking', 'pool']);
    });

    it('should filter out unknown amenities', () => {
      const amenities = ['WIFI', 'UNKNOWN', 'PARKING'];
      const result = transformer.mapAmenities(amenities);

      expect(result).toEqual(['wifi', 'parking']);
    });

    it('should handle empty array', () => {
      const result = transformer.mapAmenities([]);

      expect(result).toEqual([]);
    });

    it('should handle non-array input', () => {
      const result = transformer.mapAmenities('not an array');

      expect(result).toEqual([]);
    });
  });

  describe('formatAddress', () => {
    it('should format complete address', () => {
      const amadeusAddress = {
        lines: ['123 Main St', 'Apt 4B'],
        cityName: 'New York',
        stateCode: 'NY',
        postalCode: '10001',
        countryCode: 'US'
      };
      const geoCode = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = transformer.formatAddress(amadeusAddress, geoCode);

      expect(result.street).toBe('123 Main St, Apt 4B');
      expect(result.city).toBe('New York');
      expect(result.state).toBe('NY');
      expect(result.postalCode).toBe('10001');
      expect(result.countryCode).toBe('US');
      expect(result.country).toBe('United States');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
    });

    it('should handle empty address and geoCode', () => {
      const result = transformer.formatAddress({}, {});

      expect(result.street).toBe('');
      expect(result.city).toBe('');
      expect(result.state).toBe('');
      expect(result.postalCode).toBe('');
      expect(result.countryCode).toBe('');
      expect(result.country).toBe('');
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('extractImages', () => {
    it('should extract images from media array', () => {
      const amadeusHotel = {
        hotelId: 'TEST001',
        name: 'Test Hotel',
        media: [
          { uri: 'https://example.com/image1.jpg' },
          { uri: 'https://example.com/image2.jpg' }
        ]
      };

      const result = transformer.extractImages(amadeusHotel);

      expect(result).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ]);
    });

    it('should filter out media items without uri', () => {
      const amadeusHotel = {
        hotelId: 'TEST002',
        name: 'Test Hotel',
        media: [
          { uri: 'https://example.com/image1.jpg' },
          { type: 'video' }, // No uri
          { uri: 'https://example.com/image2.jpg' }
        ]
      };

      const result = transformer.extractImages(amadeusHotel);

      expect(result).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ]);
    });

    it('should return empty array when no media', () => {
      const amadeusHotel = {
        hotelId: 'TEST003',
        name: 'Test Hotel'
      };

      const result = transformer.extractImages(amadeusHotel);

      expect(result).toEqual([]);
    });
  });

  describe('getCountryName', () => {
    it('should return country name for known codes', () => {
      expect(transformer.getCountryName('US')).toBe('United States');
      expect(transformer.getCountryName('GB')).toBe('United Kingdom');
      expect(transformer.getCountryName('FR')).toBe('France');
      expect(transformer.getCountryName('DE')).toBe('Germany');
      expect(transformer.getCountryName('IN')).toBe('India');
    });

    it('should return country code for unknown codes', () => {
      expect(transformer.getCountryName('XX')).toBe('XX');
      expect(transformer.getCountryName('ZZ')).toBe('ZZ');
    });

    it('should handle empty or undefined input', () => {
      expect(transformer.getCountryName('')).toBe('');
      expect(transformer.getCountryName(undefined)).toBe('');
    });
  });
});
