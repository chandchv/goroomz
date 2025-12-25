# Role Segregation Optimization - Documentation Index

This document serves as the central index for all documentation related to the role segregation optimization feature.

## Overview

The role segregation optimization establishes clear separation between three user ecosystems:
1. **External Users**: Website visitors who browse and book properties
2. **Property Ecosystem**: Property owners and their staff who manage day-to-day operations
3. **Platform Staff**: Internal company employees who manage the platform

## Documentation Structure

### 1. Core Documentation

#### [CONVENTIONS.md](./CONVENTIONS.md)
**Purpose**: Naming conventions for database, code, and API responses

**Key Topics**:
- Database naming (snake_case)
- JavaScript/TypeScript naming (camelCase)
- Sequelize configuration (underscored: true)
- API response format
- Case conversion utilities

**When to Use**: 
- Writing new models or migrations
- Creating API endpoints
- Debugging case conversion issues

**Validates**: Requirements 13.1, 13.2, 13.3, 13.4, 13.5

---

#### [DATA_SCOPING.md](./DATA_SCOPING.md)
**Purpose**: Comprehensive guide to automatic data scoping

**Key Topics**:
- How data scoping works
- Scoping rules by user type
- Using applyScopingMiddleware
- Using applyScopeToWhere helper
- Performance considerations
- Security considerations
- Testing data scoping

**When to Use**:
- Implementing new routes
- Debugging access issues
- Understanding query filtering
- Writing tests for data access

**Validates**: Requirements 2.1-2.5, 3.1-3.5, 4.1-4.5, 7.1-7.5, 12.1-12.5

---

#### [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md)
**Purpose**: Visual guide to user type determination and access levels

**Key Topics**:
- User type decision flow
- Access level matrix
- Role conflict prevention
- Permission set selection
- Navigation routing
- Code examples

**When to Use**:
- Understanding user type logic
- Implementing authentication
- Debugging role issues
- Planning new features

**Validates**: Requirements 1.1-1.5, 5.1-5.5, 8.1-8.5, 11.1-11.5

---

#### [PLATFORM_ROUTES_API.md](./PLATFORM_ROUTES_API.md)
**Purpose**: API documentation for platform-specific routes

**Key Topics**:
- Platform routes structure
- Authentication & authorization
- Route endpoints and parameters
- Request/response formats
- Error responses
- Data scoping behavior

**When to Use**:
- Implementing platform features
- Integrating with platform API
- Understanding platform access
- Debugging API issues

**Validates**: Requirements 6.1-6.5, 9.1-9.5

---

#### [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md)
**Purpose**: Step-by-step migration plan for production deployment

**Key Topics**:
- Migration phases (6 weeks)
- Database schema updates
- Data migration scripts
- Deployment procedures
- Rollback plans
- Monitoring and alerts
- Success criteria

**When to Use**:
- Planning production deployment
- Executing migrations
- Handling rollbacks
- Monitoring deployment

**Validates**: All requirements (deployment strategy)

---

### 2. Related Documentation

#### [ROLE_VALIDATION_GUIDE.md](./ROLE_VALIDATION_GUIDE.md)
**Purpose**: Guide to role validation and conflict prevention

**Key Topics**:
- Role validation rules
- Conflict detection
- Validation hooks
- Error handling

**Related Requirements**: 1.5, 7.5, 8.4, 10.2, 10.4

---

#### [PROPERTY_ASSIGNMENT_MODEL_IMPLEMENTATION.md](./PROPERTY_ASSIGNMENT_MODEL_IMPLEMENTATION.md)
**Purpose**: Implementation details for PropertyAssignment model

**Key Topics**:
- Model structure
- Relationships
- Assignment types
- Usage examples

**Related Requirements**: 3.3, 7.1, 7.4

---

### 3. Specification Documents

Located in `.kiro/specs/role-segregation-optimization/`:

- **requirements.md**: Detailed requirements with acceptance criteria
- **design.md**: System design and architecture
- **tasks.md**: Implementation task list

## Quick Reference

### For Developers

**I need to...**

- **Create a new route**: Read [DATA_SCOPING.md](./DATA_SCOPING.md) → Use applyScopingMiddleware
- **Understand user types**: Read [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md)
- **Add a database column**: Read [CONVENTIONS.md](./CONVENTIONS.md) → Use snake_case
- **Fix case conversion error**: Read [CONVENTIONS.md](./CONVENTIONS.md) → Check underscored: true
- **Implement platform feature**: Read [PLATFORM_ROUTES_API.md](./PLATFORM_ROUTES_API.md)
- **Deploy to production**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md)

### For DevOps

**I need to...**

- **Plan deployment**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) → Follow phases
- **Run migrations**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) → Phase 1-2
- **Monitor deployment**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) → Monitoring section
- **Rollback changes**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) → Rollback procedures

### For Product Managers

**I need to...**

- **Understand user types**: Read [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md) → Quick Reference Table
- **Plan feature access**: Read [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md) → Access Level Matrix
- **Communicate changes**: Read [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) → Communication Plan

## Common Scenarios

### Scenario 1: Adding a New Route

1. Read [DATA_SCOPING.md](./DATA_SCOPING.md) to understand scoping
2. Add middleware chain: `protectInternal` → `applyScopingMiddleware`
3. Use `applyScopeToWhere` in queries
4. Follow naming conventions from [CONVENTIONS.md](./CONVENTIONS.md)
5. Test with different user types

### Scenario 2: Debugging Access Issues

1. Check [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md) to verify user type
2. Review [DATA_SCOPING.md](./DATA_SCOPING.md) for scoping rules
3. Check `req.dataScope` object in logs
4. Verify property assignments in database
5. Check for role conflicts

### Scenario 3: Creating a New User Type

1. Review [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md) for existing types
2. Update User model helper methods
3. Update data scoping middleware
4. Add navigation rules
5. Update documentation

### Scenario 4: Performance Optimization

1. Check [DATA_SCOPING.md](./DATA_SCOPING.md) → Performance Considerations
2. Verify database indexes exist
3. Add query result caching
4. Monitor query execution times
5. Optimize property ID lookups

## Testing Documentation

### Unit Tests
- `backend/tests/userHelperMethods.test.js` - User model helper methods
- `backend/tests/caseConversion.test.js` - Case conversion utilities
- `backend/tests/userRoleValidation.test.js` - Role validation logic

### Integration Tests
- `backend/tests/internalAuth.test.js` - Authentication flow
- `backend/tests/scopingBypassPrevention.test.js` - Scoping security
- `backend/tests/userRoleValidationIntegration.test.js` - Role validation integration

### Property-Based Tests
- `backend/tests/properties/dataScoping.property.test.js` - Data scoping properties
- `backend/tests/properties/platformRouteProtection.property.test.js` - Route protection
- `backend/tests/properties/rolePriorityEnforcement.property.test.js` - Role priority
- `backend/tests/properties/roleConflictPrevention.property.test.js` - Role conflicts
- `backend/tests/properties/sequelizeCaseConversion.property.test.js` - Case conversion

## API Endpoints

### Property Management Routes
- `GET /api/internal/properties` - List properties (scoped)
- `GET /api/internal/properties/:id` - Get property details (scoped)
- `POST /api/internal/properties` - Create property
- `PUT /api/internal/properties/:id` - Update property (scoped)
- `DELETE /api/internal/properties/:id` - Delete property (scoped)

### Platform Routes (Platform Staff Only)
- `GET /api/internal/platform/properties` - List all properties
- `GET /api/internal/platform/properties/:id` - Get any property
- `GET /api/internal/platform/owners` - List property owners
- `GET /api/internal/platform/owners/:id` - Get owner details
- `GET /api/internal/platform/agents` - List agents
- `GET /api/internal/platform/agents/:id` - Get agent details

See [PLATFORM_ROUTES_API.md](./PLATFORM_ROUTES_API.md) for complete API documentation.

## Database Schema

### Key Tables

**users**
- `role` - Base role (user, owner, admin, category_owner)
- `internal_role` - Platform staff role (agent, regional_manager, etc.)
- `staff_role` - Property staff role (front_desk, housekeeping, etc.)
- `territory_id` - Assigned territory (for platform staff)
- `assigned_property_id` - Assigned property (for property staff)
- `permissions` - Property staff permissions (JSONB)
- `internal_permissions` - Platform staff permissions (JSONB)

**property_assignments**
- `user_id` - User being assigned
- `property_id` - Property being assigned to
- `assignment_type` - Type of assignment (agent, staff, manager)
- `assigned_at` - When assignment was made
- `assigned_by` - Who made the assignment
- `is_active` - Whether assignment is active

### Key Indexes
- `users.internal_role` - For platform staff queries
- `users.staff_role` - For property staff queries
- `users.territory_id` - For territory-based scoping
- `users.assigned_property_id` - For property staff scoping
- `property_assignments.user_id` - For user assignment lookups
- `property_assignments.property_id` - For property assignment lookups
- `properties.owner_id` - For property owner scoping
- `properties.territory_id` - For territory-based scoping

## Middleware Chain

### Standard Route Protection
```javascript
router.get('/route',
  protectInternal,           // 1. Verify JWT token
  applyScopingMiddleware,    // 2. Calculate data scope
  async (req, res) => {      // 3. Handle request with scoped data
    // req.user available
    // req.dataScope available
  }
);
```

### Platform Route Protection
```javascript
router.get('/platform/route',
  protectInternal,           // 1. Verify JWT token
  requirePlatformRole,       // 2. Verify internal role
  applyScopingMiddleware,    // 3. Calculate data scope
  async (req, res) => {      // 4. Handle request
    // Only platform staff can reach here
  }
);
```

## Environment Variables

### Feature Flags (During Migration)
- `ENABLE_SCOPING_PROPERTY_OWNERS` - Enable scoping for property owners
- `ENABLE_SCOPING_PLATFORM_STAFF` - Enable scoping for platform staff
- `ENABLE_SCOPING_PROPERTY_STAFF` - Enable scoping for property staff

### Configuration
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration time
- `DATABASE_URL` - Database connection string

## Support and Troubleshooting

### Common Issues

**Issue**: User can't see their properties
- **Check**: `req.dataScope.propertyIds` in logs
- **Solution**: Verify property ownership in database
- **Documentation**: [DATA_SCOPING.md](./DATA_SCOPING.md)

**Issue**: Case conversion errors
- **Check**: Model has `underscored: true`
- **Solution**: Add underscored option to model
- **Documentation**: [CONVENTIONS.md](./CONVENTIONS.md)

**Issue**: 403 Forbidden on platform routes
- **Check**: User has `internalRole`
- **Solution**: Verify user role in database
- **Documentation**: [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md)

**Issue**: Role conflict error
- **Check**: User doesn't have both owner and internalRole
- **Solution**: Remove conflicting role
- **Documentation**: [USER_TYPE_DECISION_TREE.md](./USER_TYPE_DECISION_TREE.md)

### Getting Help

1. Check relevant documentation above
2. Review test files for examples
3. Check logs for error details
4. Contact development team

## Version History

- **v1.0** (2025-01-01): Initial documentation
  - Created all core documentation files
  - Established naming conventions
  - Documented data scoping behavior
  - Created migration strategy

## Contributing

When updating this documentation:

1. Keep all documents in sync
2. Update this index when adding new docs
3. Follow the same structure and format
4. Include code examples
5. Reference requirements
6. Update version history

## Related Specifications

- `.kiro/specs/role-segregation-optimization/requirements.md`
- `.kiro/specs/role-segregation-optimization/design.md`
- `.kiro/specs/role-segregation-optimization/tasks.md`
