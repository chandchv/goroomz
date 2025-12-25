/**
 * Test Data Generators Index
 * Feature: role-segregation-optimization
 * 
 * Central export point for all property-based test generators.
 * Provides convenient access to all generators and helper functions.
 */

const userGenerators = require('./userGenerator');
const propertyGenerators = require('./propertyGenerator');
const territoryGenerators = require('./territoryGenerator');
const fc = require('fast-check');

/**
 * Helper function to create a complete test scenario with users, properties, and territories
 * @param {Object} options - Configuration for scenario generation
 * @returns {fc.Arbitrary} Arbitrary that generates a complete test scenario
 */
const completeScenarioArbitrary = (options = {}) => {
  const {
    ownerCount = 2,
    propertiesPerOwner = 2,
    platformStaffCount = 2,
    propertyStaffCount = 1,
    territoryCount = 2
  } = options;

  return fc.tuple(
    // Generate property owners
    fc.array(userGenerators.propertyOwnerArbitrary(), {
      minLength: ownerCount,
      maxLength: ownerCount
    }),
    // Generate platform staff
    fc.array(userGenerators.platformStaffArbitrary(), {
      minLength: platformStaffCount,
      maxLength: platformStaffCount
    }),
    // Generate territories
    fc.array(territoryGenerators.basicTerritoryArbitrary(), {
      minLength: territoryCount,
      maxLength: territoryCount
    })
  ).chain(([owners, platformStaff, territories]) => {
    // Generate properties for each owner
    const propertiesPromises = owners.map(owner =>
      propertyGenerators.multiplePropertiesArbitrary(owner.id || 'owner-id', propertiesPerOwner)
    );

    return fc.tuple(...propertiesPromises).chain(propertiesArrays => {
      const allProperties = propertiesArrays.flat();

      // Generate property staff
      return fc.array(
        fc.constantFrom(...allProperties).chain(property =>
          userGenerators.propertyStaffArbitrary({
            assignedPropertyId: property.id || 'property-id'
          })
        ),
        { minLength: propertyStaffCount, maxLength: propertyStaffCount }
      ).map(propertyStaff => ({
        owners,
        platformStaff,
        propertyStaff,
        properties: allProperties,
        territories
      }));
    });
  });
};

/**
 * Helper function to create a data scoping test scenario
 * Generates users and properties configured for testing data scoping rules
 */
const dataScopingScenarioArbitrary = () => {
  return fc.tuple(
    // One property owner with properties
    userGenerators.propertyOwnerArbitrary(),
    fc.integer({ min: 2, max: 5 }), // Number of properties for owner
    // One superuser
    userGenerators.superuserArbitrary(),
    // One regional manager with territory
    userGenerators.regionalManagerArbitrary(),
    // One agent
    userGenerators.agentArbitrary(),
    // One property staff
    userGenerators.propertyStaffArbitrary()
  ).chain(([owner, propCount, superuser, regionalManager, agent, staff]) => {
    return fc.tuple(
      // Owner's properties
      propertyGenerators.multiplePropertiesArbitrary(owner.id || 'owner-id', propCount),
      // Territory for regional manager
      territoryGenerators.territoryWithManagerArbitrary(regionalManager.id || 'rm-id')
    ).map(([properties, territory]) => ({
      owner,
      superuser,
      regionalManager,
      agent,
      staff: { ...staff, assignedPropertyId: properties[0]?.id || 'prop-id' },
      properties,
      territory
    }));
  });
};

/**
 * Helper function to create a role hierarchy test scenario
 * Generates users with different role levels for testing priority
 */
const roleHierarchyScenarioArbitrary = () => {
  return fc.record({
    externalUser: userGenerators.externalUserArbitrary(),
    propertyOwner: userGenerators.propertyOwnerArbitrary(),
    propertyStaff: userGenerators.propertyStaffArbitrary(),
    agent: userGenerators.agentArbitrary(),
    regionalManager: userGenerators.regionalManagerArbitrary(),
    operationsManager: userGenerators.operationsManagerArbitrary(),
    platformAdmin: userGenerators.platformAdminArbitrary(),
    superuser: userGenerators.superuserArbitrary()
  });
};

/**
 * Helper function to create a property assignment test scenario
 * Generates agents, properties, and assignments
 */
const propertyAssignmentScenarioArbitrary = () => {
  return fc.tuple(
    fc.array(userGenerators.agentArbitrary(), { minLength: 2, maxLength: 4 }),
    fc.array(userGenerators.propertyOwnerArbitrary(), { minLength: 2, maxLength: 3 })
  ).chain(([agents, owners]) => {
    // Generate properties for owners
    return fc.tuple(
      ...owners.map(owner =>
        propertyGenerators.multiplePropertiesArbitrary(owner.id || 'owner-id', 2)
      )
    ).chain(propertiesArrays => {
      const allProperties = propertiesArrays.flat();

      // Generate assignments for agents
      return fc.tuple(
        ...agents.map(agent =>
          fc.array(
            fc.constantFrom(...allProperties),
            { minLength: 1, maxLength: 3 }
          ).chain(assignedProps =>
            fc.tuple(
              ...assignedProps.map(prop =>
                propertyGenerators.propertyAssignmentArbitrary(
                  agent.id || 'agent-id',
                  prop.id || 'prop-id'
                )
              )
            )
          )
        )
      ).map(assignmentsArrays => ({
        agents,
        owners,
        properties: allProperties,
        assignments: assignmentsArrays.flat()
      }));
    });
  });
};

/**
 * Helper function to create a territory coverage test scenario
 * Generates territories and properties to test coverage
 */
const territoryCoverageScenarioArbitrary = () => {
  return fc.tuple(
    fc.array(userGenerators.regionalManagerArbitrary(), { minLength: 2, maxLength: 4 }),
    fc.array(userGenerators.propertyOwnerArbitrary(), { minLength: 3, maxLength: 6 })
  ).chain(([regionalManagers, owners]) => {
    // Generate territories for regional managers
    return fc.tuple(
      ...regionalManagers.map(rm =>
        territoryGenerators.territoryWithManagerArbitrary(rm.id || 'rm-id')
      )
    ).chain(territories => {
      // Generate properties and assign to territories
      return fc.tuple(
        ...owners.map((owner, idx) => {
          const territory = territories[idx % territories.length];
          return propertyGenerators.propertyWithTerritoryArbitrary(
            owner.id || 'owner-id',
            territory.id || 'territory-id'
          );
        })
      ).map(properties => ({
        regionalManagers,
        owners,
        territories,
        properties
      }));
    });
  });
};

/**
 * UUID generator for IDs
 */
const uuidArbitrary = () => fc.uuid();

/**
 * Date range generator
 */
const dateRangeArbitrary = (minDate = new Date('2020-01-01'), maxDate = new Date()) =>
  fc.tuple(
    fc.date({ min: minDate, max: maxDate }),
    fc.date({ min: minDate, max: maxDate })
  ).map(([date1, date2]) => {
    // Ensure both dates are valid
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return {
        startDate: minDate,
        endDate: maxDate
      };
    }
    
    return {
      startDate: date1 < date2 ? date1 : date2,
      endDate: date1 < date2 ? date2 : date1
    };
  });

/**
 * Email generator
 */
const emailArbitrary = () => fc.emailAddress();

/**
 * Phone number generator (Indian format)
 */
const phoneArbitrary = () =>
  fc.tuple(
    fc.constantFrom('+91', ''),
    fc.integer({ min: 6000000000, max: 9999999999 })
  ).map(([prefix, num]) => `${prefix}${num}`);

module.exports = {
  // User generators
  ...userGenerators,
  
  // Property generators
  ...propertyGenerators,
  
  // Territory generators
  ...territoryGenerators,
  
  // Scenario generators
  completeScenarioArbitrary,
  dataScopingScenarioArbitrary,
  roleHierarchyScenarioArbitrary,
  propertyAssignmentScenarioArbitrary,
  territoryCoverageScenarioArbitrary,
  
  // Utility generators
  uuidArbitrary,
  dateRangeArbitrary,
  emailArbitrary,
  phoneArbitrary
};
