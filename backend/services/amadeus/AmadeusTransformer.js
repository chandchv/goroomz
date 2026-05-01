/**
 * AmadeusTransformer
 * 
 * Transforms Amadeus API responses to GoRoomz property schema.
 * Handles data mapping, amenity conversion, address formatting, and missing field defaults.
 */

class AmadeusTransformer {
  constructor() {
    // Amenity mapping from Amadeus codes to GoRoomz codes
    this.amenityMap = {
      // Common amenities
      'WIFI': 'wifi',
      'PARKING': 'parking',
      'RESTAURANT': 'restaurant',
      'POOL': 'pool',
      'GYM': 'gym',
      'SPA': 'spa',
      'BAR': 'bar',
      'ROOM_SERVICE': 'room_service',
      'LAUNDRY': 'laundry',
      'AIR_CONDITIONING': 'ac',
      'PETS_ALLOWED': 'pet_friendly',
      'AIRPORT_SHUTTLE': 'airport_shuttle',
      'BUSINESS_CENTER': 'business_center',
      'MEETING_ROOMS': 'meeting_rooms',
      'CONCIERGE': 'concierge',
      'ELEVATOR': 'elevator',
      'DISABLED_FACILITIES': 'accessible',
      'SAFE': 'safe',
      'MINIBAR': 'minibar',
      'TELEVISION': 'tv',
      'COFFEE_TEA_MAKER': 'coffee_maker'
    };
  }

  /**
   * Transform a single Amadeus hotel to GoRoomz property format
   * @param {Object} amadeusHotel - Raw Amadeus hotel object
   * @returns {Object} GoRoomz property object
   */
  transformHotel(amadeusHotel) {
    if (!amadeusHotel || !amadeusHotel.hotelId || !amadeusHotel.name) {
      throw new Error('Invalid Amadeus hotel object: missing required fields (hotelId, name)');
    }

    // Extract and format address
    const address = this.formatAddress(
      amadeusHotel.address || {},
      amadeusHotel.geoCode || {}
    );

    // Map amenities if present
    const amenities = amadeusHotel.amenities 
      ? this.mapAmenities(amadeusHotel.amenities)
      : [];

    // Extract images if available
    const images = this.extractImages(amadeusHotel);

    // Build transformed property object
    const transformed = {
      // Core identification
      id: `amadeus_${amadeusHotel.hotelId}`,
      title: amadeusHotel.name,
      
      // Source indicators
      source: 'amadeus',
      isExternal: true,
      bookingType: 'external',
      
      // Location data
      location: amadeusHotel.geoCode ? {
        latitude: amadeusHotel.geoCode.latitude,
        longitude: amadeusHotel.geoCode.longitude
      } : null,
      
      // Address
      address: address,
      
      // Amenities
      amenities: amenities,
      
      // Images
      images: images,
      
      // Metadata - preserve Amadeus-specific data
      metadata: {
        amadeusHotelId: amadeusHotel.hotelId,
        chainCode: amadeusHotel.chainCode || null,
        cityCode: amadeusHotel.iataCode || null,
        dupeId: amadeusHotel.dupeId || null,
        distance: amadeusHotel.distance || null,
        lastUpdated: new Date().toISOString()
      }
    };

    return transformed;
  }

  /**
   * Transform array of Amadeus hotels
   * @param {Array} amadeusHotels - Array of Amadeus hotel objects
   * @returns {Array} Array of GoRoomz property objects
   */
  transformHotels(amadeusHotels) {
    if (!Array.isArray(amadeusHotels)) {
      throw new Error('Invalid input: expected array of hotels');
    }

    return amadeusHotels.map(hotel => {
      try {
        return this.transformHotel(hotel);
      } catch (error) {
        console.error(`Failed to transform hotel ${hotel?.hotelId}:`, error.message);
        return null;
      }
    }).filter(hotel => hotel !== null);
  }

  /**
   * Map Amadeus amenities to GoRoomz amenity codes
   * @param {string[]} amadeusAmenities - Amadeus amenity codes
   * @returns {string[]} GoRoomz amenity codes
   */
  mapAmenities(amadeusAmenities) {
    if (!Array.isArray(amadeusAmenities)) {
      return [];
    }

    return amadeusAmenities
      .map(amenity => {
        // Ensure amenity is a string and exists in the map
        if (typeof amenity === 'string' && this.amenityMap.hasOwnProperty(amenity)) {
          return this.amenityMap[amenity];
        }
        return null;
      })
      .filter(amenity => amenity !== null);
  }

  /**
   * Format Amadeus address to GoRoomz address format
   * @param {Object} amadeusAddress - Amadeus address object
   * @param {Object} geoCode - Geographic coordinates
   * @returns {Object} GoRoomz address object
   */
  formatAddress(amadeusAddress, geoCode) {
    return {
      street: amadeusAddress.lines?.join(', ') || '',
      city: amadeusAddress.cityName || '',
      state: amadeusAddress.stateCode || '',
      postalCode: amadeusAddress.postalCode || '',
      countryCode: amadeusAddress.countryCode || '',
      country: this.getCountryName(amadeusAddress.countryCode),
      latitude: geoCode.latitude !== undefined && geoCode.latitude !== null ? geoCode.latitude : null,
      longitude: geoCode.longitude !== undefined && geoCode.longitude !== null ? geoCode.longitude : null
    };
  }

  /**
   * Extract and format hotel images (if available)
   * @param {Object} amadeusHotel - Amadeus hotel object
   * @returns {string[]} Array of image URLs
   */
  extractImages(amadeusHotel) {
    // Amadeus Hotel List API doesn't include images in basic response
    // This would be populated from Hotel Search API or other sources
    if (amadeusHotel.media && Array.isArray(amadeusHotel.media)) {
      return amadeusHotel.media
        .filter(item => item.uri)
        .map(item => item.uri);
    }
    
    return [];
  }

  /**
   * Get country name from country code
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @returns {string} Country name
   */
  getCountryName(countryCode) {
    // Basic country code mapping (can be expanded)
    const countryMap = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'ES': 'Spain',
      'IT': 'Italy',
      'IN': 'India',
      'CN': 'China',
      'JP': 'Japan',
      'AU': 'Australia',
      'CA': 'Canada',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'NL': 'Netherlands',
      'CH': 'Switzerland',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'BE': 'Belgium',
      'AT': 'Austria',
      'PT': 'Portugal',
      'GR': 'Greece',
      'TR': 'Turkey',
      'AE': 'United Arab Emirates',
      'SG': 'Singapore',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'KR': 'South Korea',
      'NZ': 'New Zealand',
      'ZA': 'South Africa',
      'EG': 'Egypt',
      'MA': 'Morocco',
      'KE': 'Kenya',
      'NG': 'Nigeria',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'RU': 'Russia',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'IE': 'Ireland',
      'IL': 'Israel',
      'SA': 'Saudi Arabia',
      'QA': 'Qatar',
      'KW': 'Kuwait',
      'OM': 'Oman',
      'BH': 'Bahrain',
      'JO': 'Jordan',
      'LB': 'Lebanon',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'BG': 'Bulgaria',
      'RS': 'Serbia',
      'UA': 'Ukraine',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'IS': 'Iceland',
      'LU': 'Luxembourg',
      'MT': 'Malta',
      'CY': 'Cyprus'
    };

    return countryMap[countryCode] || countryCode || '';
  }
}

module.exports = AmadeusTransformer;
