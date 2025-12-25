/**
 * Property Generator for Property-Based Testing
 * Feature: role-segregation-optimization
 * 
 * Generates valid property (room) objects with proper relationships
 * to owners and territories.
 */

const fc = require('fast-check');

/**
 * Property type generator
 */
const propertyTypeArbitrary = () =>
  fc.constantFrom('hotel', 'pg', 'hostel', 'lodge', 'apartment');

/**
 * Property status generator
 */
const propertyStatusArbitrary = () =>
  fc.constantFrom('active', 'inactive', 'pending_approval', 'suspended');

/**
 * Amenities generator
 */
const amenitiesArbitrary = () =>
  fc.array(
    fc.constantFrom(
      'wifi', 'parking', 'ac', 'tv', 'laundry', 'kitchen',
      'gym', 'pool', 'security', 'power_backup', 'water_supply'
    ),
    { minLength: 0, maxLength: 8 }
  ).map(arr => [...new Set(arr)]); // Remove duplicates

/**
 * Basic property generator
 * Generates a property with required fields
 */
const basicPropertyArbitrary = (ownerId) =>
  fc.record({
    name: fc.tuple(
      fc.constantFrom('Sunrise', 'Sunset', 'Royal', 'Grand', 'Elite', 'Premium', 'Comfort', 'Paradise'),
      fc.constantFrom('Hotel', 'PG', 'Hostel', 'Lodge', 'Residency', 'Inn')
    ).map(([prefix, suffix]) => `${prefix} ${suffix}`),
    description: fc.option(
      fc.string({ minLength: 20, maxLength: 500 }),
      { nil: null }
    ),
    address: fc.string({ minLength: 10, maxLength: 200 }),
    city: fc.constantFrom(
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
      'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
    ),
    state: fc.constantFrom(
      'Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu',
      'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'
    ),
    country: fc.constant('India'),
    pincode: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString()),
    latitude: fc.float({ min: 8.0, max: 35.0, noNaN: true }),
    longitude: fc.float({ min: 68.0, max: 97.0, noNaN: true }),
    ownerId: fc.constant(ownerId),
    propertyType: propertyTypeArbitrary(),
    totalRooms: fc.integer({ min: 5, max: 200 }),
    availableRooms: fc.integer({ min: 0, max: 200 }),
    amenities: amenitiesArbitrary(),
    images: fc.array(
      fc.webUrl({ validSchemes: ['https'] }),
      { minLength: 0, maxLength: 10 }
    ),
    status: propertyStatusArbitrary(),
    rating: fc.option(
      fc.float({ min: 1.0, max: 5.0, noNaN: true }),
      { nil: null }
    ),
    reviewCount: fc.integer({ min: 0, max: 1000 }),
    isVerified: fc.boolean(),
    isFeatured: fc.boolean()
  });

/**
 * Property with territory generator
 * Generates a property assigned to a specific territory
 */
const propertyWithTerritoryArbitrary = (ownerId, territoryId) =>
  basicPropertyArbitrary(ownerId).map(property => ({
    ...property,
    territoryId
  }));

/**
 * Property without territory generator
 * Generates a property not assigned to any territory
 */
const propertyWithoutTerritoryArbitrary = (ownerId) =>
  basicPropertyArbitrary(ownerId).map(property => ({
    ...property,
    territoryId: null
  }));

/**
 * Multiple properties generator
 * Generates an array of properties for a single owner
 */
const multiplePropertiesArbitrary = (ownerId, count) =>
  fc.array(
    basicPropertyArbitrary(ownerId),
    { minLength: count, maxLength: count }
  );

/**
 * Properties across owners generator
 * Generates properties distributed across multiple owners
 */
const propertiesAcrossOwnersArbitrary = (ownerIds) =>
  fc.array(
    fc.tuple(
      fc.constantFrom(...ownerIds),
      basicPropertyArbitrary(ownerIds[0]) // Will be overridden
    ).chain(([ownerId, _]) => basicPropertyArbitrary(ownerId)),
    { minLength: ownerIds.length, maxLength: ownerIds.length * 3 }
  );

/**
 * Properties in territory generator
 * Generates multiple properties all in the same territory
 */
const propertiesInTerritoryArbitrary = (ownerIds, territoryId, count) =>
  fc.array(
    fc.constantFrom(...ownerIds).chain(ownerId =>
      propertyWithTerritoryArbitrary(ownerId, territoryId)
    ),
    { minLength: count, maxLength: count }
  );

/**
 * Room (bed) generator for a property
 * Generates individual rooms/beds within a property
 */
const roomArbitrary = (propertyId) =>
  fc.tuple(
    fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F'),
    fc.integer({ min: 1, max: 50 }),
    fc.constantFrom('single', 'double', 'triple', 'dormitory', 'suite'),
    fc.integer({ min: 0, max: 10 }), // floor
    fc.integer({ min: 1, max: 8 }), // capacity
    fc.float({ min: 500, max: 10000, noNaN: true }), // pricePerBed
    fc.constantFrom('available', 'occupied', 'maintenance', 'reserved'),
    fc.array(
      fc.constantFrom('ac', 'tv', 'attached_bathroom', 'balcony', 'window', 'wardrobe'),
      { minLength: 0, maxLength: 6 }
    ).map(arr => [...new Set(arr)]),
    fc.boolean()
  ).chain(([block, num, roomType, floor, capacity, pricePerBed, status, amenities, isActive]) =>
    fc.integer({ min: 0, max: capacity }).map(currentOccupancy => ({
      propertyId,
      roomNumber: `${block}${num}`,
      roomType,
      floor,
      capacity,
      currentOccupancy, // Always <= capacity
      pricePerBed,
      status,
      amenities,
      isActive
    }))
  );

/**
 * Multiple rooms generator
 * Generates multiple rooms for a property
 */
const multipleRoomsArbitrary = (propertyId, count) =>
  fc.array(
    roomArbitrary(propertyId),
    { minLength: count, maxLength: count }
  );

/**
 * Property with rooms generator
 * Generates a complete property with its rooms
 */
const propertyWithRoomsArbitrary = (ownerId, roomCount) =>
  basicPropertyArbitrary(ownerId).chain(property =>
    fc.tuple(
      fc.constant(property),
      fc.uuid() // Property ID
    ).chain(([prop, propId]) =>
      multipleRoomsArbitrary(propId, roomCount).map(rooms => ({
        property: { ...prop, id: propId },
        rooms
      }))
    )
  );

/**
 * Property assignment data generator
 * Generates data for PropertyAssignment model
 */
const propertyAssignmentArbitrary = (userId, propertyId) =>
  fc.record({
    userId: fc.constant(userId),
    propertyId: fc.constant(propertyId),
    assignmentType: fc.constantFrom('agent', 'staff', 'manager'),
    assignedBy: fc.uuid(),
    isActive: fc.boolean()
  });

/**
 * Multiple property assignments generator
 * Generates assignments for a user across multiple properties
 */
const multiplePropertyAssignmentsArbitrary = (userId, propertyIds) =>
  fc.array(
    fc.constantFrom(...propertyIds).chain(propertyId =>
      propertyAssignmentArbitrary(userId, propertyId)
    ),
    { minLength: 1, maxLength: propertyIds.length }
  );

module.exports = {
  // Basic generators
  propertyTypeArbitrary,
  propertyStatusArbitrary,
  amenitiesArbitrary,
  
  // Property generators
  basicPropertyArbitrary,
  propertyWithTerritoryArbitrary,
  propertyWithoutTerritoryArbitrary,
  multiplePropertiesArbitrary,
  propertiesAcrossOwnersArbitrary,
  propertiesInTerritoryArbitrary,
  
  // Room generators
  roomArbitrary,
  multipleRoomsArbitrary,
  propertyWithRoomsArbitrary,
  
  // Assignment generators
  propertyAssignmentArbitrary,
  multiplePropertyAssignmentsArbitrary
};
