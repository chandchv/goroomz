# Test Data Generators Implementation Summary

## Overview

Successfully implemented comprehensive test data generators for the role-segregation-optimization feature. These generators produce valid, realistic test data for property-based testing while respecting all role hierarchy and validation rules.

## What Was Created

### 1. User Generator (`userGenerator.js`)

Generates users of all types with valid role combinations:

- **External Users**: Website visitors (role: 'user')
- **Property Owners**: Users with owner/admin/category_owner roles
- **Property Staff**: Front desk, housekeeping, maintenance, manager roles
- **Platform Staff**: Agents, regional managers, operations managers, platform admins, superusers

**Key Features:**
- Prevents role conflicts (no user can have both owner role and internalRole)
- Generates appropriate permissions for each user type
- Supports specific role generation (e.g., `agentArbitrary()`, `superuserArbitrary()`)
- Includes invalid user generator for testing validation

### 2. Property Generator (`propertyGenerator.js`)

Generates properties (rooms) with realistic data:

- Basic property information (name, address, amenities)
- Owner relationships
- Territory assignments
- Room/bed details with proper capacity constraints
- Property assignments for agents

**Key Features:**
- Realistic Indian cities and addresses
- Proper owner-property relationships
- Territory assignment support
- Room occupancy always ≤ capacity
- Multiple properties per owner support

### 3. Territory Generator (`territoryGenerator.js`)

Generates territories with geographic data:

- Indian states and cities
- Geographic boundaries (GeoJSON format)
- Regional manager assignments
- Coverage testing support
- Overlap detection for testing conflicts

**Key Features:**
- Realistic Indian geography
- Non-overlapping territory generation
- Multi-state territory support
- Territory coverage validation

### 4. Index File (`index.js`)

Central export point providing:

- All individual generators
- Scenario generators for complex tests
- Utility generators (UUID, dates, emails, phones)

**Scenario Generators:**
- `completeScenarioArbitrary()`: Full test scenario with users, properties, territories
- `dataScopingScenarioArbitrary()`: Configured for data scoping tests
- `roleHierarchyScenarioArbitrary()`: All user types at different hierarchy levels
- `propertyAssignmentScenarioArbitrary()`: Agents, properties, and assignments
- `territoryCoverageScenarioArbitrary()`: Territory coverage testing

### 5. Documentation

- **README.md**: Comprehensive usage guide with examples
- **IMPLEMENTATION_SUMMARY.md**: This file
- **generators.test.js**: Validation tests for all generators

## Test Results

All 23 generator validation tests pass:

```
✓ User Generators (9 tests)
  - External users, property owners, property staff, platform staff
  - Role-specific generators (agents, superusers, etc.)
  - Invalid user generation for validation testing

✓ Property Generators (4 tests)
  - Basic properties, multiple properties, territory assignment
  - Room generation with proper constraints

✓ Territory Generators (3 tests)
  - Basic territories, manager assignment, overlapping territories

✓ Scenario Generators (3 tests)
  - Complete scenarios, data scoping, role hierarchy

✓ Utility Generators (4 tests)
  - UUIDs, emails, phone numbers, date ranges
```

## Usage Examples

### Generate a Property Owner

```javascript
const generators = require('./generators');
const fc = require('fast-check');

fc.assert(
  fc.property(
    generators.propertyOwnerArbitrary(),
    (owner) => {
      // owner has valid owner role and no internalRole
      expect(owner.role).toMatch(/owner|admin|category_owner/);
      expect(owner.internalRole).toBeNull();
    }
  ),
  { numRuns: 100 }
);
```

### Generate a Complete Test Scenario

```javascript
fc.assert(
  fc.asyncProperty(
    generators.completeScenarioArbitrary({
      ownerCount: 3,
      propertiesPerOwner: 2,
      platformStaffCount: 4,
      propertyStaffCount: 2,
      territoryCount: 2
    }),
    async (scenario) => {
      // scenario contains owners, properties, platform staff, property staff, territories
      expect(scenario.owners).toHaveLength(3);
      expect(scenario.properties).toHaveLength(6);
    }
  ),
  { numRuns: 50 }
);
```

### Test Data Scoping

```javascript
fc.assert(
  fc.asyncProperty(
    generators.dataScopingScenarioArbitrary(),
    async (scenario) => {
      const { owner, superuser, staff, properties } = scenario;
      
      // Test that owner can only access their properties
      const ownerAccessible = await owner.getAccessiblePropertyIds();
      expect(ownerAccessible).toHaveLength(properties.length);
      
      // Test that superuser can access all properties
      const superuserAccessible = await superuser.getAccessiblePropertyIds();
      expect(superuserAccessible.length).toBeGreaterThanOrEqual(properties.length);
    }
  ),
  { numRuns: 50 }
);
```

## Generator Guarantees

### User Generators
✅ No role conflicts (owner + internalRole)
✅ Valid permission sets for each role
✅ Proper role hierarchy (internalRole > role > staffRole)
✅ Valid email and phone formats
✅ Appropriate fields for each user type

### Property Generators
✅ Valid owner relationships
✅ Realistic property data
✅ Proper territory assignments
✅ Valid room/bed configurations
✅ Room occupancy ≤ capacity

### Territory Generators
✅ Valid geographic boundaries
✅ Realistic Indian cities and states
✅ Proper manager assignments
✅ Non-overlapping territories (when using appropriate generator)

## Integration with Property-Based Tests

These generators are designed to work with the property-based tests in `backend/tests/properties/`:

```javascript
/**
 * Feature: role-segregation-optimization, Property 5: Property owner data scoping
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 12.1
 */
test('property owners only see their own data', async () => {
  await fc.assert(
    fc.asyncProperty(
      generators.dataScopingScenarioArbitrary(),
      async (scenario) => {
        // Test implementation using generated scenario
      }
    ),
    { numRuns: 100 }
  );
});
```

## Files Created

```
backend/tests/generators/
├── index.js                      # Central export point
├── userGenerator.js              # User generators for all types
├── propertyGenerator.js          # Property and room generators
├── territoryGenerator.js         # Territory generators
├── generators.test.js            # Validation tests
├── README.md                     # Usage documentation
└── IMPLEMENTATION_SUMMARY.md     # This file
```

## Next Steps

These generators are now ready to be used in:

1. **Existing Property-Based Tests**: Replace inline generators with these reusable ones
2. **New Property-Based Tests**: Use scenario generators for complex test cases
3. **Integration Tests**: Generate realistic test data for integration testing
4. **Performance Tests**: Generate large datasets for stress testing

## Benefits

1. **Consistency**: All tests use the same generators, ensuring consistent test data
2. **Validity**: Generators respect all role hierarchy and validation rules
3. **Reusability**: Generators can be composed and combined for complex scenarios
4. **Maintainability**: Single source of truth for test data generation
5. **Documentation**: Generators serve as executable documentation of valid data structures

## Technical Notes

- Built using [fast-check](https://github.com/dubzzz/fast-check) v3.x
- All generators use `.map()` and `.chain()` for composition
- Generators avoid spread operators in `fc.record()` (not supported)
- Room occupancy constraint enforced using `.chain()` to ensure currentOccupancy ≤ capacity
- Date range generator handles NaN dates gracefully
- All generators produce deterministic output given the same seed

## Validation

Run generator tests:
```bash
npm test -- generators.test.js
```

All 23 tests pass, validating:
- User role combinations
- Permission sets
- Property relationships
- Territory assignments
- Scenario generation
- Utility functions
