# Test Data Generators

This directory contains property-based test generators for the role-segregation-optimization feature. These generators produce valid test data for users, properties, and territories while respecting all role hierarchy and validation rules.

## Overview

The generators are built using [fast-check](https://github.com/dubzzz/fast-check), a property-based testing library for JavaScript. They ensure that generated test data:

- Respects role conflicts (no user can have both owner role and internalRole)
- Maintains proper role hierarchy (internalRole > role > staffRole)
- Generates valid permission sets for each user type
- Creates realistic property and territory data
- Supports complex test scenarios

## Generator Files

### `userGenerator.js`

Generates users of all types with valid role combinations:

- **External Users**: Website visitors with role 'user'
- **Property Owners**: Users with owner/admin/category_owner role
- **Property Staff**: Users with staffRole (front_desk, housekeeping, etc.)
- **Platform Staff**: Users with internalRole (agent, regional_manager, etc.)

### `propertyGenerator.js`

Generates properties (rooms) with:

- Realistic property data (name, address, amenities)
- Owner relationships
- Territory assignments
- Room/bed details
- Property assignments for agents

### `territoryGenerator.js`

Generates territories with:

- Geographic boundaries (GeoJSON format)
- Indian cities and states
- Regional manager assignments
- Coverage testing support
- Overlap detection

### `index.js`

Central export point providing:

- All individual generators
- Scenario generators for complex tests
- Utility generators (UUID, dates, emails, etc.)

## Usage Examples

### Basic User Generation

```javascript
const fc = require('fast-check');
const generators = require('./generators');

// Generate a property owner
fc.assert(
  fc.property(
    generators.propertyOwnerArbitrary(),
    (owner) => {
      expect(owner.role).toMatch(/owner|admin|category_owner/);
      expect(owner.internalRole).toBeNull();
    }
  )
);

// Generate a platform staff member
fc.assert(
  fc.property(
    generators.platformStaffArbitrary(),
    (staff) => {
      expect(staff.internalRole).toBeTruthy();
      expect(staff.role).toBe('user');
    }
  )
);

// Generate a specific role
fc.assert(
  fc.property(
    generators.agentArbitrary(),
    (agent) => {
      expect(agent.internalRole).toBe('agent');
      expect(agent.commissionRate).toBeGreaterThanOrEqual(0);
    }
  )
);
```

### Property Generation

```javascript
// Generate properties for an owner
const ownerId = 'owner-uuid-123';

fc.assert(
  fc.property(
    generators.multiplePropertiesArbitrary(ownerId, 3),
    (properties) => {
      expect(properties).toHaveLength(3);
      properties.forEach(prop => {
        expect(prop.ownerId).toBe(ownerId);
      });
    }
  )
);

// Generate property with territory
const territoryId = 'territory-uuid-456';

fc.assert(
  fc.property(
    generators.propertyWithTerritoryArbitrary(ownerId, territoryId),
    (property) => {
      expect(property.territoryId).toBe(territoryId);
    }
  )
);
```

### Territory Generation

```javascript
// Generate a basic territory
fc.assert(
  fc.property(
    generators.basicTerritoryArbitrary(),
    (territory) => {
      expect(territory.cities.length).toBeGreaterThan(0);
      expect(territory.states.length).toBeGreaterThan(0);
    }
  )
);

// Generate territories with managers
const managerIds = ['rm-1', 'rm-2', 'rm-3'];

fc.assert(
  fc.property(
    generators.territoriesWithManagersArbitrary(managerIds),
    (territories) => {
      expect(territories).toHaveLength(managerIds.length);
    }
  )
);
```

### Complete Scenario Generation

```javascript
// Generate a complete test scenario
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
      expect(scenario.owners).toHaveLength(3);
      expect(scenario.properties).toHaveLength(6); // 3 owners * 2 properties
      expect(scenario.platformStaff).toHaveLength(4);
      expect(scenario.propertyStaff).toHaveLength(2);
      expect(scenario.territories).toHaveLength(2);
    }
  ),
  { numRuns: 100 }
);
```

### Data Scoping Scenario

```javascript
// Generate scenario for testing data scoping
fc.assert(
  fc.asyncProperty(
    generators.dataScopingScenarioArbitrary(),
    async (scenario) => {
      const { owner, superuser, regionalManager, agent, staff, properties, territory } = scenario;
      
      // Test that owner can only access their properties
      const ownerAccessible = await owner.getAccessiblePropertyIds();
      expect(ownerAccessible).toHaveLength(properties.length);
      
      // Test that superuser can access all properties
      const superuserAccessible = await superuser.getAccessiblePropertyIds();
      expect(superuserAccessible.length).toBeGreaterThanOrEqual(properties.length);
      
      // Test that staff can only access assigned property
      const staffAccessible = await staff.getAccessiblePropertyIds();
      expect(staffAccessible).toHaveLength(1);
    }
  ),
  { numRuns: 50 }
);
```

### Role Hierarchy Testing

```javascript
// Generate users at all hierarchy levels
fc.assert(
  fc.property(
    generators.roleHierarchyScenarioArbitrary(),
    (scenario) => {
      // Verify role priority
      expect(scenario.superuser.getUserType()).toBe('platform_staff');
      expect(scenario.propertyOwner.getUserType()).toBe('property_owner');
      expect(scenario.propertyStaff.getUserType()).toBe('property_staff');
      expect(scenario.externalUser.getUserType()).toBe('external_user');
    }
  )
);
```

### Invalid Data Generation (for validation testing)

```javascript
// Generate users with role conflicts
fc.assert(
  fc.property(
    generators.invalidUserWithRoleConflictArbitrary(),
    (invalidUser) => {
      // This should fail validation
      expect(() => {
        validateRoleConflicts(invalidUser);
      }).toThrow(/role conflict/i);
    }
  )
);
```

## Best Practices

### 1. Use Appropriate Generators

Choose the most specific generator for your test:

```javascript
// Good: Specific generator
generators.agentArbitrary()

// Less ideal: Generic generator with filtering
generators.platformStaffArbitrary().filter(u => u.internalRole === 'agent')
```

### 2. Configure Scenario Generators

Customize scenario generators for your test needs:

```javascript
generators.completeScenarioArbitrary({
  ownerCount: 5,        // More owners for stress testing
  propertiesPerOwner: 1, // Fewer properties for faster tests
  platformStaffCount: 2,
  propertyStaffCount: 0, // Skip property staff if not needed
  territoryCount: 3
})
```

### 3. Use Appropriate Run Counts

Balance test coverage with execution time:

```javascript
// Quick smoke test
{ numRuns: 10 }

// Standard property test
{ numRuns: 100 }

// Thorough validation
{ numRuns: 1000 }
```

### 4. Combine Generators

Build complex scenarios by combining generators:

```javascript
fc.tuple(
  generators.propertyOwnerArbitrary(),
  generators.multiplePropertiesArbitrary('owner-id', 3),
  generators.propertyStaffArbitrary({ assignedPropertyId: 'prop-id' })
).chain(([owner, properties, staff]) => {
  // Use all three in your test
  return fc.constant({ owner, properties, staff });
})
```

## Generator Guarantees

### User Generators

- ✅ No role conflicts (owner + internalRole)
- ✅ Valid permission sets for each role
- ✅ Proper role hierarchy
- ✅ Valid email and phone formats
- ✅ Appropriate fields for each user type

### Property Generators

- ✅ Valid owner relationships
- ✅ Realistic property data
- ✅ Proper territory assignments
- ✅ Valid room/bed configurations
- ✅ Non-negative numeric values

### Territory Generators

- ✅ Valid geographic boundaries
- ✅ Realistic Indian cities and states
- ✅ Proper manager assignments
- ✅ Non-overlapping territories (when using appropriate generator)

## Integration with Property-Based Tests

These generators are designed to work seamlessly with the property-based tests in `backend/tests/properties/`:

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

## Troubleshooting

### Generator Produces Invalid Data

If a generator produces data that fails validation:

1. Check the generator constraints match your validation rules
2. Verify you're using the correct generator for your use case
3. Review the generator source code for any bugs
4. Add additional constraints using `.filter()` or `.chain()`

### Tests Are Too Slow

If property-based tests run too slowly:

1. Reduce `numRuns` count
2. Use more specific generators (less filtering needed)
3. Simplify scenario generators
4. Consider using smaller data sets

### Need Custom Generator

To create a custom generator:

```javascript
const customUserArbitrary = () =>
  fc.record({
    // Your custom fields
    customField: fc.string(),
    // Reuse existing generators
    ...generators.baseUserFieldsArbitrary()
  });
```

## Contributing

When adding new generators:

1. Follow existing naming conventions (`*Arbitrary` suffix)
2. Document the generator's purpose and guarantees
3. Add usage examples to this README
4. Ensure generators produce valid data
5. Test generators with property-based tests

## References

- [fast-check Documentation](https://github.com/dubzzz/fast-check/tree/main/documentation)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/1-Guides/PropertyBasedTesting.md)
- [Role Segregation Design Document](../../.kiro/specs/role-segregation-optimization/design.md)
