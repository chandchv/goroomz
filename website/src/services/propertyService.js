import apiService from './api';

/**
 * @typedef {Object} PropertySource
 * @property {'local'|'amadeus'} source - Source of the property
 * @property {boolean} isExternal - Whether the property is from an external source
 */

/**
 * @typedef {Object} AmadeusMetadata
 * @property {string} [chainCode] - Hotel chain code
 * @property {string} [cityCode] - IATA city code
 * @property {number} [dupeId] - Amadeus duplicate ID
 * @property {Object} [distance] - Distance information
 * @property {number} distance.value - Distance value
 * @property {string} distance.unit - Distance unit (KM or MILE)
 */

/**
 * @typedef {Object} AmadeusProperty
 * @property {string} id - Property ID (prefixed with 'amadeus_')
 * @property {string} title - Property name
 * @property {'amadeus'} source - Always 'amadeus' for external properties
 * @property {boolean} isExternal - Always true for Amadeus properties
 * @property {Object} location - Location information
 * @property {number} location.latitude - Latitude
 * @property {number} location.longitude - Longitude
 * @property {string} [location.city] - City name
 * @property {string} [location.state] - State/region
 * @property {string} [location.country] - Country code
 * @property {Object} address - Address information
 * @property {string} [address.line1] - Address line 1
 * @property {string} [address.city] - City
 * @property {string} [address.state] - State
 * @property {string} [address.postalCode] - Postal code
 * @property {string} [address.countryCode] - Country code
 * @property {string[]} [amenities] - List of amenities
 * @property {number} [price] - Base price
 * @property {number} [rating] - Property rating
 * @property {AmadeusMetadata} metadata - Amadeus-specific metadata
 */

/**
 * @typedef {Object} LocalProperty
 * @property {string} id - Property UUID
 * @property {string} name - Property name
 * @property {'local'} source - Always 'local' for local properties
 * @property {boolean} isExternal - Always false for local properties
 * @property {Object} location - Location information
 * @property {string} [location.city] - City name
 * @property {string} [location.state] - State
 * @property {string} [location.address] - Full address
 * @property {string[]} [amenities] - List of amenities
 * @property {Object} [metadata] - Property metadata
 */

/**
 * @typedef {AmadeusProperty|LocalProperty} UnifiedProperty
 */

/**
 * @typedef {Object} UnifiedSearchResponse
 * @property {boolean} success - Whether the search was successful
 * @property {UnifiedProperty[]} data - Array of properties from both sources
 * @property {Object} meta - Search metadata
 * @property {number} meta.total - Total number of results
 * @property {number} meta.localCount - Number of local results
 * @property {number} meta.amadeusCount - Number of Amadeus results
 * @property {number} meta.page - Current page number
 * @property {number} meta.limit - Results per page
 * @property {number} meta.totalPages - Total number of pages
 * @property {Object} [warnings] - Partial failure warnings
 */

/**
 * Property Service - handles all property-related API calls
 */
class PropertyService {
  /**
   * Get all public properties with optional filters
   */
  async getProperties(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.city) params.append('city', filters.city);
    if (filters.area) params.append('area', filters.area);
    if (filters.type) params.append('type', filters.type);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.amenities) params.append('amenities', filters.amenities);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/properties?${queryString}` : '/properties';
    
    return apiService.get(endpoint, { includeAuth: false });
  }

  /**
   * Get featured properties for homepage
   */
  async getFeaturedProperties() {
    return apiService.get('/properties/featured', { includeAuth: false });
  }

  /**
   * Get available areas for filtering
   */
  async getAreas() {
    return apiService.get('/properties/areas', { includeAuth: false });
  }

  /**
   * Get single property details
   */
  async getProperty(id) {
    return apiService.get(`/properties/${id}`, { includeAuth: false });
  }

  /**
   * Submit a claim request for a property
   */
  async claimProperty(propertyId, claimData) {
    return apiService.post(`/properties/${propertyId}/claim`, claimData);
  }

  /**
   * Check claim status for a property
   */
  async getClaimStatus(propertyId, email) {
    return apiService.get(`/properties/${propertyId}/claim-status?email=${encodeURIComponent(email)}`, { includeAuth: false });
  }

  /**
   * Get all claims (admin only)
   */
  async getClaims(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/properties/admin/claims?${queryString}` : '/properties/admin/claims';
    
    return apiService.get(endpoint);
  }

  /**
   * Review a claim (admin only)
   */
  async reviewClaim(claimId, action, notes, rejectionReason) {
    return apiService.put(`/properties/admin/claims/${claimId}/review`, {
      action,
      notes,
      rejectionReason
    });
  }

  /**
   * Unified search across local and Amadeus properties
   * @param {Object} params - Search parameters
   * @param {'all'|'local'|'amadeus'} [params.source='all'] - Search source
   * @param {string} [params.cityCode] - IATA city code (3 characters)
   * @param {number} [params.latitude] - Latitude (-90 to 90)
   * @param {number} [params.longitude] - Longitude (-180 to 180)
   * @param {number} [params.radius] - Search radius
   * @param {'KM'|'MILE'} [params.radiusUnit='KM'] - Radius unit
   * @param {string[]} [params.amenities] - Array of amenity codes
   * @param {string[]} [params.ratings] - Array of rating values
   * @param {string[]} [params.chainCodes] - Array of hotel chain codes
   * @param {number} [params.minPrice] - Minimum price filter
   * @param {number} [params.maxPrice] - Maximum price filter
   * @param {string} [params.type] - Property type filter
   * @param {string} [params.gender] - Gender preference filter
   * @param {string} [params.search] - Search query
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Results per page
   * @param {'distance'|'price'|'rating'|'name'} [params.sortBy='name'] - Sort field
   * @param {'asc'|'desc'} [params.sortOrder='asc'] - Sort order
   * @returns {Promise<UnifiedSearchResponse>} Unified search results
   */
  async searchUnified(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Add all parameters to query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/search/hotels?${queryString}` : '/search/hotels';
    
    return apiService.get(endpoint, { includeAuth: false });
  }

  /**
   * Get hotel details by ID (supports both local UUID and Amadeus hotel ID)
   * @param {string} id - Property ID (local UUID or Amadeus hotel ID)
   * @returns {Promise<Object>} Property details with source metadata
   */
  async getHotelDetails(id) {
    return apiService.get(`/search/hotels/${id}`, { includeAuth: false });
  }

  /**
   * Detect if a property is from Amadeus based on its ID or metadata
   * @param {string|Object} propertyOrId - Property object or ID string
   * @returns {boolean} True if property is from Amadeus
   */
  isAmadeusProperty(propertyOrId) {
    if (typeof propertyOrId === 'string') {
      // Check ID format
      return propertyOrId.startsWith('amadeus_') || /^[A-Z0-9]{8}$/i.test(propertyOrId);
    }
    
    if (typeof propertyOrId === 'object' && propertyOrId !== null) {
      // Check source metadata
      return propertyOrId.source === 'amadeus' || propertyOrId.isExternal === true;
    }
    
    return false;
  }

  /**
   * Get the display source label for a property
   * @param {UnifiedProperty} property - Property object
   * @returns {string} Display label ('Local' or 'Amadeus')
   */
  getSourceLabel(property) {
    return this.isAmadeusProperty(property) ? 'Amadeus' : 'Local';
  }

  /**
   * Extract price from property (handles both local and Amadeus formats)
   * @param {UnifiedProperty} property - Property object
   * @returns {number|null} Price value or null if not available
   */
  getPropertyPrice(property) {
    // Try different price locations
    return property.metadata?.pgOptions?.basePrice || 
           property.price || 
           property.metadata?.price || 
           null;
  }

  /**
   * Extract rating from property (handles both local and Amadeus formats)
   * @param {UnifiedProperty} property - Property object
   * @returns {number|null} Rating value or null if not available
   */
  getPropertyRating(property) {
    return property.rating || 
           property.metadata?.rating || 
           null;
  }

  /**
   * Extract amenities from property (handles both local and Amadeus formats)
   * @param {UnifiedProperty} property - Property object
   * @returns {string[]} Array of amenity codes
   */
  getPropertyAmenities(property) {
    return property.amenities || 
           property.metadata?.amenities || 
           [];
  }
}

const propertyService = new PropertyService();
export default propertyService;
