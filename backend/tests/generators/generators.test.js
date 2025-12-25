/**
 * Test Data Generators Validation Tests
 * 
 * Verifies that all generators produce valid data that respects
 * role hierarchy and validation rules.
 */

const fc = require('fast-check');
const generators = require('./index');

describe('User Generators', () => {
  describe('External User Generator', () => {
    test('generates valid external users', () => {
      fc.assert(
        fc.property(
          generators.externalUserArbitrary(),
          (user) => {
            expect(user.role).toBe('user');
            expect(user.internalRole).toBeNull();
            expect(user.staffRole).toBeNull();
            expect(user.name).toBeTruthy();
            expect(user.email).toMatch(/@/);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property Owner Generator', () => {
    test('generates valid property owners', () => {
      fc.assert(
        fc.property(
          generators.propertyOwnerArbitrary(),
          (owner) => {
            expect(['owner', 'admin', 'category_owner']).toContain(owner.role);
            expect(owner.internalRole).toBeNull(); // No role conflict
            expect(owner.staffRole).toBeNull();
            expect(owner.name).toBeTruthy();
            expect(owner.email).toMatch(/@/);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('property owners have no internal permissions', () => {
      fc.assert(
        fc.property(
          generators.propertyOwnerArbitrary(),
          (owner) => {
            expect(owner.internalPermissions).toEqual({});
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property Staff Generator', () => {
    test('generates valid property staff', () => {
      fc.assert(
        fc.property(
          generators.propertyStaffArbitrary(),
          (staff) => {
            expect(staff.role).toBe('user');
            expect(staff.internalRole).toBeNull();
            expect(['front_desk', 'housekeeping', 'maintenance', 'manager']).toContain(staff.staffRole);
            expect(staff.permissions).toBeDefined();
            expect(typeof staff.permissions).toBe('object');
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('property staff have valid permissions', () => {
      fc.assert(
        fc.property(
          generators.propertyStaffArbitrary(),
          (staff) => {
            const validPermissions = [
              'canCheckIn', 'canCheckOut', 'canManageRooms',
              'canRecordPayments', 'canViewReports', 'canManageStaff',
              'canUpdateRoomStatus', 'canManageMaintenance'
            ];
            
            const staffPermissionKeys = Object.keys(staff.permissions);
            for (const key of staffPermissionKeys) {
              expect(validPermissions).toContain(key);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Platform Staff Generator', () => {
    test('generates valid platform staff', () => {
      fc.assert(
        fc.property(
          generators.platformStaffArbitrary(),
          (staff) => {
            expect(staff.role).toBe('user');
            expect(staff.internalRole).toBeTruthy();
            expect(['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'])
              .toContain(staff.internalRole);
            expect(staff.staffRole).toBeNull();
            expect(staff.internalPermissions).toBeDefined();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('agents have commission rates', () => {
      fc.assert(
        fc.property(
          generators.agentArbitrary(),
          (agent) => {
            expect(agent.internalRole).toBe('agent');
            expect(agent.commissionRate).toBeGreaterThanOrEqual(0);
            expect(agent.commissionRate).toBeLessThanOrEqual(100);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('superusers have all permissions', () => {
      fc.assert(
        fc.property(
          generators.superuserArbitrary(),
          (superuser) => {
            expect(superuser.internalRole).toBe('superuser');
            expect(superuser.internalPermissions.canAccessAllProperties).toBe(true);
            expect(superuser.internalPermissions.canManageSystemSettings).toBe(true);
            expect(superuser.internalPermissions.canViewAuditLogs).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Invalid User Generator', () => {
    test('generates users with role conflicts', () => {
      fc.assert(
        fc.property(
          generators.invalidUserWithRoleConflictArbitrary(),
          (user) => {
            // Should have both owner role AND internal role (conflict)
            expect(['owner', 'admin', 'category_owner']).toContain(user.role);
            expect(user.internalRole).toBeTruthy();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Property Generators', () => {
  describe('Basic Property Generator', () => {
    test('generates valid properties', () => {
      const ownerId = 'test-owner-id';
      
      fc.assert(
        fc.property(
          generators.basicPropertyArbitrary(ownerId),
          (property) => {
            expect(property.ownerId).toBe(ownerId);
            expect(property.name).toBeTruthy();
            expect(property.address).toBeTruthy();
            expect(property.city).toBeTruthy();
            expect(property.state).toBeTruthy();
            expect(property.country).toBe('India');
            expect(property.totalRooms).toBeGreaterThanOrEqual(5);
            expect(property.totalRooms).toBeLessThanOrEqual(200);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multiple Properties Generator', () => {
    test('generates correct number of properties', () => {
      const ownerId = 'test-owner-id';
      const count = 5;
      
      fc.assert(
        fc.property(
          generators.multiplePropertiesArbitrary(ownerId, count),
          (properties) => {
            expect(properties).toHaveLength(count);
            properties.forEach(prop => {
              expect(prop.ownerId).toBe(ownerId);
            });
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property with Territory Generator', () => {
    test('assigns territory to property', () => {
      const ownerId = 'test-owner-id';
      const territoryId = 'test-territory-id';
      
      fc.assert(
        fc.property(
          generators.propertyWithTerritoryArbitrary(ownerId, territoryId),
          (property) => {
            expect(property.ownerId).toBe(ownerId);
            expect(property.territoryId).toBe(territoryId);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Room Generator', () => {
    test('generates valid rooms', () => {
      const propertyId = 'test-property-id';
      
      fc.assert(
        fc.property(
          generators.roomArbitrary(propertyId),
          (room) => {
            expect(room.propertyId).toBe(propertyId);
            expect(room.roomNumber).toBeTruthy();
            expect(['single', 'double', 'triple', 'dormitory', 'suite']).toContain(room.roomType);
            expect(room.capacity).toBeGreaterThanOrEqual(1);
            expect(room.currentOccupancy).toBeLessThanOrEqual(room.capacity);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Territory Generators', () => {
  describe('Basic Territory Generator', () => {
    test('generates valid territories', () => {
      fc.assert(
        fc.property(
          generators.basicTerritoryArbitrary(),
          (territory) => {
            expect(territory.name).toBeTruthy();
            expect(territory.cities).toBeDefined();
            expect(territory.cities.length).toBeGreaterThan(0);
            expect(territory.states).toBeDefined();
            expect(territory.states.length).toBeGreaterThan(0);
            expect(territory.boundaries).toBeDefined();
            expect(territory.boundaries.type).toBe('Polygon');
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Territory with Manager Generator', () => {
    test('assigns manager to territory', () => {
      const managerId = 'test-manager-id';
      
      fc.assert(
        fc.property(
          generators.territoryWithManagerArbitrary(managerId),
          (territory) => {
            expect(territory.regionalManagerId).toBe(managerId);
            expect(territory.cities.length).toBeGreaterThan(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Overlapping Territories Generator', () => {
    test('generates territories with shared cities', () => {
      fc.assert(
        fc.property(
          generators.overlappingTerritoriesArbitrary(),
          ([territory1, territory2]) => {
            expect(territory1.cities).toBeDefined();
            expect(territory2.cities).toBeDefined();
            
            // Find shared cities
            const sharedCities = territory1.cities.filter(city =>
              territory2.cities.includes(city)
            );
            
            expect(sharedCities.length).toBeGreaterThan(0);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

describe('Scenario Generators', () => {
  describe('Complete Scenario Generator', () => {
    test('generates complete test scenario', () => {
      fc.assert(
        fc.property(
          generators.completeScenarioArbitrary({
            ownerCount: 2,
            propertiesPerOwner: 2,
            platformStaffCount: 2,
            propertyStaffCount: 1,
            territoryCount: 2
          }),
          (scenario) => {
            expect(scenario.owners).toHaveLength(2);
            expect(scenario.platformStaff).toHaveLength(2);
            expect(scenario.propertyStaff).toHaveLength(1);
            expect(scenario.territories).toHaveLength(2);
            expect(scenario.properties.length).toBeGreaterThanOrEqual(4); // 2 owners * 2 properties
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Data Scoping Scenario Generator', () => {
    test('generates data scoping test scenario', () => {
      fc.assert(
        fc.property(
          generators.dataScopingScenarioArbitrary(),
          (scenario) => {
            expect(scenario.owner).toBeDefined();
            expect(scenario.superuser).toBeDefined();
            expect(scenario.regionalManager).toBeDefined();
            expect(scenario.agent).toBeDefined();
            expect(scenario.staff).toBeDefined();
            expect(scenario.properties).toBeDefined();
            expect(scenario.territory).toBeDefined();
            
            // Verify user types
            expect(['owner', 'admin', 'category_owner']).toContain(scenario.owner.role);
            expect(scenario.superuser.internalRole).toBe('superuser');
            expect(scenario.regionalManager.internalRole).toBe('regional_manager');
            expect(scenario.agent.internalRole).toBe('agent');
            expect(scenario.staff.staffRole).toBeTruthy();
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Role Hierarchy Scenario Generator', () => {
    test('generates all user types', () => {
      fc.assert(
        fc.property(
          generators.roleHierarchyScenarioArbitrary(),
          (scenario) => {
            expect(scenario.externalUser.role).toBe('user');
            expect(['owner', 'admin', 'category_owner']).toContain(scenario.propertyOwner.role);
            expect(scenario.propertyStaff.staffRole).toBeTruthy();
            expect(scenario.agent.internalRole).toBe('agent');
            expect(scenario.regionalManager.internalRole).toBe('regional_manager');
            expect(scenario.operationsManager.internalRole).toBe('operations_manager');
            expect(scenario.platformAdmin.internalRole).toBe('platform_admin');
            expect(scenario.superuser.internalRole).toBe('superuser');
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

describe('Utility Generators', () => {
  test('UUID generator produces valid UUIDs', () => {
    fc.assert(
      fc.property(
        generators.uuidArbitrary(),
        (uuid) => {
          expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Email generator produces valid emails', () => {
    fc.assert(
      fc.property(
        generators.emailArbitrary(),
        (email) => {
          expect(email).toMatch(/@/);
          expect(email).toMatch(/\./);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Phone generator produces valid phone numbers', () => {
    fc.assert(
      fc.property(
        generators.phoneArbitrary(),
        (phone) => {
          expect(phone).toMatch(/^\+?[0-9]{10,13}$/);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Date range generator produces valid ranges', () => {
    fc.assert(
      fc.property(
        generators.dateRangeArbitrary(),
        (range) => {
          expect(range.startDate).toBeInstanceOf(Date);
          expect(range.endDate).toBeInstanceOf(Date);
          expect(range.startDate.getTime()).toBeLessThanOrEqual(range.endDate.getTime());
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
