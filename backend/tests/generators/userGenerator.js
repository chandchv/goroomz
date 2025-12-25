/**
 * User Generator for Property-Based Testing
 * Feature: role-segregation-optimization
 * 
 * Generates valid user objects for all user types with proper role combinations
 * and permissions. Ensures generated data respects role hierarchy and constraints.
 */

const fc = require('fast-check');

/**
 * Base user fields generator
 * Generates common fields shared by all user types
 */
const baseUserFieldsArbitrary = () => fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }),
  email: fc.emailAddress(),
  phone: fc.option(
    fc.tuple(
      fc.constantFrom('+1', '+44', '+91', ''),
      fc.integer({ min: 1000000000, max: 9999999999 })
    ).map(([prefix, num]) => `${prefix}${num}`),
    { nil: null }
  ),
  address: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
  country: fc.option(fc.constantFrom('India', 'USA', 'UK', 'Canada'), { nil: null }),
  state: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: null }),
  city: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: null }),
  pincode: fc.option(fc.string({ minLength: 4, maxLength: 10 }), { nil: null }),
  isActive: fc.boolean(),
  isVerified: fc.boolean()
});

/**
 * Property owner permissions generator
 * Property owners don't have structured permissions, but may have preferences
 */
const propertyOwnerPermissionsArbitrary = () => fc.constant({
  canCheckIn: false,
  canCheckOut: false,
  canManageRooms: false,
  canRecordPayments: false,
  canViewReports: false,
  canManageStaff: false,
  canUpdateRoomStatus: false,
  canManageMaintenance: false
});

/**
 * Property staff permissions generator
 * Generates valid permission combinations for property staff
 */
const propertyStaffPermissionsArbitrary = () => fc.record({
  canCheckIn: fc.boolean(),
  canCheckOut: fc.boolean(),
  canManageRooms: fc.boolean(),
  canRecordPayments: fc.boolean(),
  canViewReports: fc.boolean(),
  canManageStaff: fc.boolean(),
  canUpdateRoomStatus: fc.boolean(),
  canManageMaintenance: fc.boolean()
});

/**
 * Platform staff permissions generator
 * Generates permissions based on internal role
 */
const platformStaffPermissionsArbitrary = (internalRole) => {
  const rolePermissions = {
    agent: {
      canOnboardProperties: true,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    regional_manager: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    operations_manager: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: true,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    },
    platform_admin: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    },
    superuser: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true
    }
  };

  return fc.constant(rolePermissions[internalRole] || {});
};

/**
 * External user generator
 * Generates users with role 'user' (website visitors)
 */
const externalUserArbitrary = () => 
  baseUserFieldsArbitrary().map(baseFields => ({
    ...baseFields,
    role: 'user',
    internalRole: null,
    staffRole: null,
    permissions: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    },
    internalPermissions: {},
    territoryId: null,
    managerId: null,
    assignedPropertyId: null,
    commissionRate: null
  }));

/**
 * Property owner generator
 * Generates users with owner/admin/category_owner role and no internalRole
 */
const propertyOwnerArbitrary = () =>
  fc.tuple(
    baseUserFieldsArbitrary(),
    fc.constantFrom('owner', 'admin', 'category_owner')
  ).map(([baseFields, role]) => ({
    ...baseFields,
    role,
    internalRole: null, // Must be null to avoid role conflict
    staffRole: null,
    permissions: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    },
    internalPermissions: {},
    territoryId: null,
    managerId: null,
    assignedPropertyId: null,
    commissionRate: null
  }));

/**
 * Property staff generator
 * Generates users with staffRole and no internalRole or owner role
 */
const propertyStaffArbitrary = (options = {}) =>
  fc.tuple(
    baseUserFieldsArbitrary(),
    fc.constantFrom('front_desk', 'housekeeping', 'maintenance', 'manager'),
    propertyStaffPermissionsArbitrary(),
    options.assignedPropertyId 
      ? fc.constant(options.assignedPropertyId)
      : fc.option(fc.uuid(), { nil: null })
  ).map(([baseFields, staffRole, permissions, assignedPropertyId]) => ({
    ...baseFields,
    role: 'user', // Property staff have base role 'user'
    internalRole: null, // Must be null
    staffRole,
    permissions,
    internalPermissions: {},
    territoryId: null,
    managerId: null,
    assignedPropertyId,
    commissionRate: null
  }));

/**
 * Platform staff generator
 * Generates users with internalRole and no owner role
 */
const platformStaffArbitrary = (specificRole = null) => {
  const roleArbitrary = specificRole 
    ? fc.constant(specificRole)
    : fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

  return fc.tuple(
    baseUserFieldsArbitrary(),
    roleArbitrary
  ).chain(([baseFields, internalRole]) => {
    const territoryArb = (internalRole === 'regional_manager' || internalRole === 'agent')
      ? fc.option(fc.uuid(), { nil: null })
      : fc.constant(null);
    
    const commissionArb = internalRole === 'agent'
      ? fc.float({ min: 0, max: 100, noNaN: true })
      : fc.constant(null);
    
    const permissions = platformStaffPermissionsArbitrary(internalRole);
    
    return fc.tuple(
      fc.constant(baseFields),
      fc.constant(internalRole),
      permissions,
      territoryArb,
      fc.option(fc.uuid(), { nil: null }), // managerId
      commissionArb
    ).map(([base, role, perms, territory, manager, commission]) => ({
      ...base,
      role: 'user', // Platform staff have base role 'user'
      internalRole: role,
      staffRole: null, // Must be null
      permissions: {},
      internalPermissions: perms,
      territoryId: territory,
      managerId: manager,
      assignedPropertyId: null,
      commissionRate: commission
    }));
  });
};

/**
 * Agent generator (specific platform staff type)
 */
const agentArbitrary = () => platformStaffArbitrary('agent');

/**
 * Regional manager generator (specific platform staff type)
 */
const regionalManagerArbitrary = () => platformStaffArbitrary('regional_manager');

/**
 * Operations manager generator (specific platform staff type)
 */
const operationsManagerArbitrary = () => platformStaffArbitrary('operations_manager');

/**
 * Platform admin generator (specific platform staff type)
 */
const platformAdminArbitrary = () => platformStaffArbitrary('platform_admin');

/**
 * Superuser generator (specific platform staff type)
 */
const superuserArbitrary = () => platformStaffArbitrary('superuser');

/**
 * Any valid user generator
 * Generates users of any type with valid role combinations
 */
const anyUserArbitrary = () =>
  fc.oneof(
    externalUserArbitrary(),
    propertyOwnerArbitrary(),
    propertyStaffArbitrary(),
    platformStaffArbitrary()
  );

/**
 * User generator with specific user type
 * @param {string} userType - 'external_user', 'property_owner', 'property_staff', or 'platform_staff'
 * @param {Object} options - Additional options for generation
 */
const userByTypeArbitrary = (userType, options = {}) => {
  switch (userType) {
    case 'external_user':
      return externalUserArbitrary();
    case 'property_owner':
      return propertyOwnerArbitrary();
    case 'property_staff':
      return propertyStaffArbitrary(options);
    case 'platform_staff':
      return platformStaffArbitrary(options.internalRole);
    default:
      return anyUserArbitrary();
  }
};

/**
 * Invalid user generator (for testing validation)
 * Generates users with role conflicts
 */
const invalidUserWithRoleConflictArbitrary = () =>
  fc.tuple(
    baseUserFieldsArbitrary(),
    fc.constantFrom('owner', 'admin', 'category_owner'), // Owner role
    fc.constantFrom('agent', 'regional_manager', 'superuser') // AND internal role (conflict!)
  ).map(([baseFields, role, internalRole]) => ({
    ...baseFields,
    role,
    internalRole,
    staffRole: null,
    permissions: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false
    },
    internalPermissions: {
      canOnboardProperties: true,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false
    },
    territoryId: null,
    managerId: null,
    assignedPropertyId: null,
    commissionRate: null
  }));

module.exports = {
  // Base generators
  baseUserFieldsArbitrary,
  
  // Permission generators
  propertyOwnerPermissionsArbitrary,
  propertyStaffPermissionsArbitrary,
  platformStaffPermissionsArbitrary,
  
  // User type generators
  externalUserArbitrary,
  propertyOwnerArbitrary,
  propertyStaffArbitrary,
  platformStaffArbitrary,
  
  // Specific role generators
  agentArbitrary,
  regionalManagerArbitrary,
  operationsManagerArbitrary,
  platformAdminArbitrary,
  superuserArbitrary,
  
  // Utility generators
  anyUserArbitrary,
  userByTypeArbitrary,
  invalidUserWithRoleConflictArbitrary
};
