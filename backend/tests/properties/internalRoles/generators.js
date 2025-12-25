/**
 * Custom Generators for Internal User Roles Property-Based Testing
 * 
 * This file contains fast-check generators for domain models used in
 * property-based testing of the internal user role management system.
 */

const fc = require('fast-check');

/**
 * Role hierarchy and their default permissions
 */
const ROLE_PERMISSIONS = {
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

/**
 * Generator for internal role names
 */
const internalRoleArbitrary = () =>
  fc.constantFrom('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser');

/**
 * Generator for lead status
 */
const leadStatusArbitrary = () =>
  fc.constantFrom('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost');

/**
 * Generator for property types
 */
const propertyTypeArbitrary = () =>
  fc.constantFrom('hotel', 'pg');

/**
 * Generator for commission status
 */
const commissionStatusArbitrary = () =>
  fc.constantFrom('earned', 'pending_payment', 'paid', 'cancelled');

/**
 * Generator for internal user objects
 * @param {string} roleName - Optional specific role name
 * @returns {fc.Arbitrary} Fast-check arbitrary for user objects
 */
function userGenerator(roleName = null) {
  if (roleName) {
    const permissions = ROLE_PERMISSIONS[roleName];
    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
      internalRole: fc.constant(roleName),
      internalPermissions: fc.constant(permissions),
      territoryId: fc.option(fc.uuid(), { nil: null }),
      managerId: fc.option(fc.uuid(), { nil: null }),
      commissionRate: fc.float({ min: 0, max: 100, noNaN: true }),
      isActive: fc.boolean(),
      lastLoginAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    });
  }

  // Generate user with random role
  return fc.tuple(internalRoleArbitrary()).chain(([role]) => {
    const permissions = ROLE_PERMISSIONS[role];
    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
      internalRole: fc.constant(role),
      internalPermissions: fc.constant(permissions),
      territoryId: fc.option(fc.uuid(), { nil: null }),
      managerId: fc.option(fc.uuid(), { nil: null }),
      commissionRate: fc.float({ min: 0, max: 100, noNaN: true }),
      isActive: fc.boolean(),
      lastLoginAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    });
  });
}

/**
 * Generator for lead objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for lead objects
 */
function leadGenerator() {
  return fc.record({
    id: fc.uuid(),
    propertyOwnerName: fc.string({ minLength: 3, maxLength: 100 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    businessName: fc.string({ minLength: 3, maxLength: 100 }),
    propertyType: propertyTypeArbitrary(),
    address: fc.string({ minLength: 10, maxLength: 200 }),
    city: fc.string({ minLength: 3, maxLength: 50 }),
    state: fc.string({ minLength: 3, maxLength: 50 }),
    country: fc.constant('India'),
    estimatedRooms: fc.integer({ min: 1, max: 500 }),
    status: leadStatusArbitrary(),
    source: fc.constantFrom('referral', 'cold_call', 'website', 'social_media', 'other'),
    agentId: fc.uuid(),
    territoryId: fc.option(fc.uuid(), { nil: null }),
    expectedCloseDate: fc.date({ min: new Date(), max: new Date('2025-12-31') }),
    rejectionReason: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    approvedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: null }),
    approvedBy: fc.option(fc.uuid(), { nil: null })
  });
}

/**
 * Generator for commission objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for commission objects
 */
function commissionGenerator() {
  return fc.record({
    id: fc.uuid(),
    agentId: fc.uuid(),
    leadId: fc.uuid(),
    propertyId: fc.uuid(),
    amount: fc.float({ min: 0, max: 100000, noNaN: true }),
    rate: fc.float({ min: 0, max: 100, noNaN: true }),
    status: commissionStatusArbitrary(),
    earnedDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    paymentDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: null }),
    paymentMethod: fc.option(fc.constantFrom('bank_transfer', 'check', 'cash', 'upi'), { nil: null }),
    transactionReference: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: null }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for territory objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for territory objects
 */
function territoryGenerator() {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null }),
    regionalManagerId: fc.uuid(),
    boundaries: fc.record({
      type: fc.constant('Polygon'),
      coordinates: fc.array(
        fc.array(
          fc.tuple(
            fc.float({ min: -180, max: 180, noNaN: true }), // longitude
            fc.float({ min: -90, max: 90, noNaN: true })    // latitude
          ),
          { minLength: 4, maxLength: 10 }
        ),
        { minLength: 1, maxLength: 1 }
      )
    }),
    cities: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
    states: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    isActive: fc.boolean(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for agent target objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for agent target objects
 */
function agentTargetGenerator() {
  return fc.record({
    id: fc.uuid(),
    agentId: fc.uuid(),
    territoryId: fc.option(fc.uuid(), { nil: null }),
    period: fc.constantFrom('monthly', 'quarterly', 'yearly'),
    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    endDate: fc.date({ min: new Date(), max: new Date('2025-12-31') }),
    targetProperties: fc.integer({ min: 1, max: 100 }),
    targetRevenue: fc.float({ min: 0, max: 10000000, noNaN: true }),
    actualProperties: fc.integer({ min: 0, max: 150 }),
    actualRevenue: fc.float({ min: 0, max: 15000000, noNaN: true }),
    setBy: fc.uuid(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for support ticket objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for support ticket objects
 */
function supportTicketGenerator() {
  return fc.record({
    id: fc.uuid(),
    ticketNumber: fc.string({ minLength: 8, maxLength: 12 }),
    propertyOwnerId: fc.uuid(),
    propertyId: fc.option(fc.uuid(), { nil: null }),
    title: fc.string({ minLength: 5, maxLength: 200 }),
    description: fc.string({ minLength: 10, maxLength: 1000 }),
    category: fc.constantFrom('technical', 'billing', 'operations', 'feature_request', 'other'),
    priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
    status: fc.constantFrom('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
    assignedTo: fc.option(fc.uuid(), { nil: null }),
    createdBy: fc.uuid(),
    resolvedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: null }),
    resolvedBy: fc.option(fc.uuid(), { nil: null }),
    resolution: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for property document objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for property document objects
 */
function propertyDocumentGenerator() {
  return fc.record({
    id: fc.uuid(),
    leadId: fc.option(fc.uuid(), { nil: null }),
    propertyOwnerId: fc.option(fc.uuid(), { nil: null }),
    documentType: fc.constantFrom('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
    fileName: fc.string({ minLength: 5, maxLength: 100 }),
    fileUrl: fc.webUrl(),
    fileSize: fc.integer({ min: 1024, max: 10485760 }), // 1KB to 10MB
    mimeType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png', 'image/jpg'),
    uploadedBy: fc.uuid(),
    status: fc.constantFrom('pending_review', 'approved', 'rejected'),
    reviewedBy: fc.option(fc.uuid(), { nil: null }),
    reviewNotes: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for announcement objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for announcement objects
 */
function announcementGenerator() {
  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 200 }),
    content: fc.string({ minLength: 20, maxLength: 2000 }),
    targetAudience: fc.constantFrom('all_property_owners', 'specific_region', 'specific_property_type'),
    targetFilters: fc.record({
      regions: fc.option(fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }), { nil: null }),
      propertyTypes: fc.option(fc.array(propertyTypeArbitrary(), { minLength: 0, maxLength: 2 }), { nil: null })
    }),
    createdBy: fc.uuid(),
    scheduledAt: fc.option(fc.date({ min: new Date(), max: new Date('2025-12-31') }), { nil: null }),
    sentAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: null }),
    deliveryMethod: fc.array(fc.constantFrom('email', 'in_app', 'sms'), { minLength: 1, maxLength: 3 }),
    readCount: fc.integer({ min: 0, max: 10000 }),
    totalRecipients: fc.integer({ min: 0, max: 10000 }),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

/**
 * Generator for audit log objects
 * @returns {fc.Arbitrary} Fast-check arbitrary for audit log objects
 */
function auditLogGenerator() {
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    action: fc.constantFrom(
      'create_lead', 'update_lead', 'approve_onboarding', 'reject_onboarding',
      'create_commission', 'update_commission', 'mark_commission_paid',
      'create_territory', 'update_territory', 'assign_agent',
      'create_ticket', 'update_ticket', 'resolve_ticket',
      'create_user', 'update_user', 'deactivate_user',
      'update_system_settings', 'create_role', 'update_role'
    ),
    resourceType: fc.constantFrom('lead', 'commission', 'territory', 'ticket', 'user', 'role', 'settings'),
    resourceId: fc.uuid(),
    changes: fc.record({
      before: fc.object(),
      after: fc.object()
    }),
    ipAddress: fc.ipV4(),
    userAgent: fc.string({ minLength: 20, maxLength: 200 }),
    isCritical: fc.boolean(),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
  });
}

module.exports = {
  // Role and permission constants
  ROLE_PERMISSIONS,
  
  // Basic arbitraries
  internalRoleArbitrary,
  leadStatusArbitrary,
  propertyTypeArbitrary,
  commissionStatusArbitrary,
  
  // Domain model generators
  userGenerator,
  leadGenerator,
  commissionGenerator,
  territoryGenerator,
  agentTargetGenerator,
  supportTicketGenerator,
  propertyDocumentGenerator,
  announcementGenerator,
  auditLogGenerator
};
