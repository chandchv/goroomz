/**
 * Unified Search Routes
 * 
 * Provides unified search across local properties and Amadeus hotels.
 * Supports parallel execution, graceful degradation, and result merging.
 */

const express = require('express');
const router = express.Router();
const { query, param, validationResult } = require('express-validator');
const { Property } = require('../models');
const { Op } = require('sequelize');
const AmadeusService = require('../services/amadeus/AmadeusService');
const { getConfig } = require('../services/amadeus/config');

// Initialize Amadeus service
let amadeusService = null;
try {
  const config = getConfig();
  if (config.isEnabled()) {
    amadeusService = new AmadeusService(config);
    console.log('[UnifiedSearch] Amadeus integration enabled');
  } else {
    console.log('[UnifiedSearch] Amadeus integration disabled');
  }
} catch (error) {
  console.error('[UnifiedSearch] Failed to initialize Amadeus service:', error.message);
}

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * Search local properties
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Array of local properties
 */
async function searchLocalProperties(params) {
  const {
    cityCode,
    latitude,
    longitude,
    radius,
    amenities,
    ratings,
    minPrice,
    maxPrice,
    type,
    gender,
    search
  } = params;

  const where = {
    isActive: true,
    approvalStatus: 'approved'
  };

  // Type filter
  if (type) {
    where.type = type;
  }

  // City code filter (map to city name)
  if (cityCode) {
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push({
      'location.city': { [Op.iLike]: `%${cityCode}%` }
    });
  }

  // Geocode filter (if latitude and longitude provided)
  // Note: This is a simple implementation. For production, consider using PostGIS
  if (latitude !== undefined && longitude !== undefined && radius) {
    // For now, we'll skip complex geo queries and rely on city/area filters
    // In production, implement proper distance calculation
  }

  // Gender preference filter (for PGs)
  if (gender) {
    where[Op.and] = where[Op.and] || [];
    where[Op.and].push({
      [Op.or]: [
        { 'metadata.genderPreference': gender },
        { 'metadata.genderPreference': 'any' }
      ]
    });
  }

  // Price filter
  if (minPrice || maxPrice) {
    where[Op.and] = where[Op.and] || [];
    if (minPrice) {
      where[Op.and].push({
        'metadata.pgOptions.basePrice': { [Op.gte]: parseFloat(minPrice) }
      });
    }
    if (maxPrice) {
      where[Op.and].push({
        'metadata.pgOptions.basePrice': { [Op.lte]: parseFloat(maxPrice) }
      });
    }
  }

  // Amenities filter
  if (amenities && Array.isArray(amenities) && amenities.length > 0) {
    const amenityList = amenities.map(a => a.toLowerCase());
    where.amenities = { [Op.contains]: amenityList };
  }

  // Search filter
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
      { 'location.address': { [Op.iLike]: `%${search}%` } },
      { 'location.area': { [Op.iLike]: `%${search}%` } }
    ];
  }

  const properties = await Property.findAll({
    where,
    order: [
      ['isFeatured', 'DESC'],
      ['createdAt', 'DESC']
    ],
    attributes: {
      exclude: ['approvedBy', 'rejectionReason']
    }
  });

  // Add source metadata to local properties
  return properties.map(property => {
    const propertyData = property.toJSON();
    return {
      ...propertyData,
      source: 'local',
      isExternal: false
    };
  });
}

/**
 * Search Amadeus hotels
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Array of Amadeus hotels
 */
async function searchAmadeusHotels(params) {
  if (!amadeusService) {
    throw new Error('Amadeus service not available');
  }

  const { cityCode, latitude, longitude, radius, radiusUnit, amenities, ratings, chainCodes } = params;

  // Determine search type
  if (cityCode) {
    // Search by city code
    return await amadeusService.searchHotelsByCity({
      cityCode,
      radius,
      radiusUnit,
      amenities,
      ratings,
      chainCodes
    });
  } else if (latitude !== undefined && longitude !== undefined) {
    // Search by geocode
    return await amadeusService.searchHotelsByGeocode({
      latitude,
      longitude,
      radius,
      radiusUnit,
      amenities,
      ratings,
      chainCodes
    });
  } else {
    throw new Error('Either cityCode or latitude/longitude must be provided');
  }
}

/**
 * Merge results from local and Amadeus sources
 * Preserves source metadata and ensures all results have consistent structure
 * 
 * @param {Array} localResults - Local property results
 * @param {Array} amadeusResults - Amadeus hotel results
 * @returns {Array} Merged results with source metadata preserved
 */
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

/**
 * Sort merged results consistently across both sources
 * Supports multiple sort criteria: distance, price, rating, name
 * 
 * @param {Array} results - Merged results to sort
 * @param {string} sortBy - Sort criteria ('distance', 'price', 'rating', 'name')
 * @param {string} sortOrder - Sort order ('asc', 'desc')
 * @returns {Array} Sorted results
 */
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

/**
 * Apply filters to unified search results
 * Supports filtering by amenities, price range, and ratings across both sources
 * 
 * @param {Array} results - Results to filter
 * @param {Object} filters - Filter criteria
 * @param {string[]} filters.amenities - Array of amenity codes to filter by
 * @param {number} filters.minPrice - Minimum price filter
 * @param {number} filters.maxPrice - Maximum price filter
 * @param {string[]} filters.ratings - Array of rating values to filter by
 * @returns {Array} Filtered results
 */
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

/**
 * Apply pagination to results
 * @param {Array} results - Results to paginate
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {Object} Paginated results with metadata
 */
function paginateResults(results, page = 1, limit = 20) {
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedData = results.slice(offset, offset + limit);

  return {
    data: paginatedData,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages
    }
  };
}

/**
 * GET /api/search/hotels
 * Unified hotel search across local and Amadeus sources
 */
router.get('/hotels', [
  query('source').optional().isIn(['all', 'local', 'amadeus']).withMessage('Source must be all, local, or amadeus'),
  query('cityCode').optional().isString().isLength({ min: 3, max: 3 }).withMessage('City code must be 3 characters'),
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius').optional().isFloat({ min: 0 }).withMessage('Radius must be positive'),
  query('radiusUnit').optional().isIn(['KM', 'MILE', 'km', 'mile']).withMessage('Radius unit must be KM or MILE'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['distance', 'price', 'rating', 'name']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  validate
], async (req, res) => {
  try {
    const {
      source = 'all',
      cityCode,
      latitude,
      longitude,
      radius,
      radiusUnit = 'KM',
      amenities,
      ratings,
      chainCodes,
      minPrice,
      maxPrice,
      type,
      gender,
      search,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Validate that either cityCode, coordinates, or search query are provided
    const hasLocation = cityCode || (latitude !== undefined && longitude !== undefined);
    const hasSearch = search && search.trim().length > 0;
    
    if (!hasLocation && !hasSearch) {
      return res.status(400).json({
        success: false,
        message: 'Either cityCode, latitude/longitude, or search query must be provided'
      });
    }

    // Parse array parameters
    const parsedAmenities = amenities ? (Array.isArray(amenities) ? amenities : amenities.split(',')) : undefined;
    const parsedRatings = ratings ? (Array.isArray(ratings) ? ratings : ratings.split(',')) : undefined;
    const parsedChainCodes = chainCodes ? (Array.isArray(chainCodes) ? chainCodes : chainCodes.split(',')) : undefined;

    // Build search parameters
    const searchParams = {
      cityCode,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      radiusUnit: radiusUnit.toUpperCase(),
      amenities: parsedAmenities,
      ratings: parsedRatings,
      chainCodes: parsedChainCodes,
      minPrice,
      maxPrice,
      type,
      gender,
      search
    };

    let localResults = [];
    let amadeusResults = [];
    const errors = {};

    // Execute searches based on source parameter
    const promises = [];

    if (source === 'all' || source === 'local') {
      promises.push(
        searchLocalProperties(searchParams)
          .then(results => {
            localResults = results;
          })
          .catch(error => {
            console.error('[UnifiedSearch] Local search failed:', error);
            errors.local = error.message;
          })
      );
    }

    if (source === 'all' || source === 'amadeus') {
      // Only search Amadeus if we have cityCode or coordinates (Amadeus requires location)
      if (amadeusService && (cityCode || (latitude !== undefined && longitude !== undefined))) {
        promises.push(
          searchAmadeusHotels(searchParams)
            .then(results => {
              amadeusResults = results;
            })
            .catch(error => {
              console.error('[UnifiedSearch] Amadeus search failed:', error);
              errors.amadeus = error.message;
            })
        );
      } else if (source === 'amadeus' && !cityCode && (latitude === undefined || longitude === undefined)) {
        // If explicitly requesting Amadeus but no location provided
        return res.status(400).json({
          success: false,
          message: 'Amadeus search requires cityCode or latitude/longitude'
        });
      } else if (source === 'amadeus' && !amadeusService) {
        // If explicitly requesting Amadeus but it's not available
        return res.status(503).json({
          success: false,
          message: 'Amadeus service is not available'
        });
      }
    }

    // Wait for all searches to complete
    await Promise.all(promises);

    // Check if we have any results
    if (localResults.length === 0 && amadeusResults.length === 0) {
      // If both searches failed, return error
      if (Object.keys(errors).length > 0) {
        return res.status(500).json({
          success: false,
          message: 'All search sources failed',
          errors
        });
      }

      // Otherwise, just no results found
      return res.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          localCount: 0,
          amadeusCount: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        }
      });
    }

    // Merge results
    let mergedResults = mergeResults(localResults, amadeusResults);

    // Apply filters
    mergedResults = applyFilters(mergedResults, {
      amenities: parsedAmenities,
      minPrice,
      maxPrice,
      ratings: parsedRatings
    });

    // Sort results
    mergedResults = sortResults(mergedResults, sortBy, sortOrder);

    // Apply pagination
    const paginatedResults = paginateResults(mergedResults, page, limit);

    // Build response
    const response = {
      success: true,
      data: paginatedResults.data,
      meta: {
        total: paginatedResults.pagination.total,
        localCount: localResults.length,
        amadeusCount: amadeusResults.length,
        page: paginatedResults.pagination.page,
        limit: paginatedResults.pagination.limit,
        totalPages: paginatedResults.pagination.totalPages
      }
    };

    // Include partial failure warnings if any
    if (Object.keys(errors).length > 0) {
      response.warnings = errors;
    }

    res.json(response);

  } catch (error) {
    console.error('[UnifiedSearch] Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute search',
      error: error.message
    });
  }
});

/**
 * GET /api/search/hotels/:id
 * Get hotel details by ID (supports both local UUID and Amadeus hotel ID)
 */
router.get('/hotels/:id', [
  param('id').notEmpty().withMessage('Hotel ID is required'),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    // Detect ID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isAmadeusId = /^amadeus_[A-Z0-9]{8}$/i.test(id) || /^[A-Z0-9]{8}$/i.test(id);

    if (isUUID) {
      // Search local database
      const property = await Property.findOne({
        where: {
          id,
          isActive: true,
          approvalStatus: 'approved'
        }
      });

      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }

      const propertyData = property.toJSON();
      return res.json({
        success: true,
        data: {
          ...propertyData,
          source: 'local',
          isExternal: false
        }
      });

    } else if (isAmadeusId) {
      // Search Amadeus
      if (!amadeusService) {
        return res.status(503).json({
          success: false,
          message: 'Amadeus service is not available'
        });
      }

      // Extract hotel ID (remove amadeus_ prefix if present)
      const hotelId = id.startsWith('amadeus_') ? id.substring(8) : id;

      try {
        const hotel = await amadeusService.getHotelDetails(hotelId);
        return res.json({
          success: true,
          data: hotel
        });
      } catch (error) {
        if (error.error && error.error.code === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            message: 'Hotel not found'
          });
        }
        throw error;
      }

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID format'
      });
    }

  } catch (error) {
    console.error('[UnifiedSearch] Hotel details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel details',
      error: error.message
    });
  }
});

module.exports = router;
