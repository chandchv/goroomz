# Migration Strategy for Role Segregation Optimization

This document outlines the strategy for migrating existing data and deploying the role segregation optimization feature to production.

## Overview

The role segregation optimization introduces:
1. Enhanced User model with helper methods
2. New PropertyAssignment model for tracking assignments
3. Data scoping middleware for automatic query filtering
4. Platform-specific routes under `/platform/` prefix
5. Role-based navigation in the frontend

## Migration Phases

### Phase 1: Database Schema Updates (Week 1)

**Goal**: Add new tables and columns without breaking existing functionality

#### 1.1 Create PropertyAssignment Table

```javascript
// Migration: 20250101000001-create-property-assignments.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('property_assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      property_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'properties',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignment_type: {
        type: Sequelize.ENUM('agent', 'staff', 'manager'),
        allowNull: false
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('property_assignments', ['user_id']);
    await queryInterface.addIndex('property_assignments', ['property_id']);
    await queryInterface.addIndex('property_assignments', ['assignment_type']);
    await queryInterface.addIndex('property_assignments', ['is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('property_assignments');
  }
};
```

#### 1.2 Add assignedPropertyId to Users Table

```javascript
// Migration: 20250101000002-add-assigned-property-id.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'assigned_property_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('users', ['assigned_property_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'assigned_property_id');
  }
};
```

#### 1.3 Add Performance Indexes

```javascript
// Migration: 20250101000003-add-performance-indexes.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for data scoping queries
    await queryInterface.addIndex('properties', ['owner_id']);
    await queryInterface.addIndex('properties', ['territory_id']);
    await queryInterface.addIndex('rooms', ['property_id']);
    await queryInterface.addIndex('bookings', ['property_id']);
    await queryInterface.addIndex('payments', ['property_id']);
    await queryInterface.addIndex('users', ['internal_role']);
    await queryInterface.addIndex('users', ['staff_role']);
    await queryInterface.addIndex('users', ['territory_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes if needed
    await queryInterface.removeIndex('properties', ['owner_id']);
    await queryInterface.removeIndex('properties', ['territory_id']);
    await queryInterface.removeIndex('rooms', ['property_id']);
    await queryInterface.removeIndex('bookings', ['property_id']);
    await queryInterface.removeIndex('payments', ['property_id']);
    await queryInterface.removeIndex('users', ['internal_role']);
    await queryInterface.removeIndex('users', ['staff_role']);
    await queryInterface.removeIndex('users', ['territory_id']);
  }
};
```

**Deployment Steps**:
1. Run migrations on staging database
2. Verify schema changes
3. Test existing functionality (should not break)
4. Run migrations on production during low-traffic window
5. Monitor for errors

**Rollback Plan**:
- Keep migration down functions ready
- Database backup before migration
- Can rollback migrations if issues occur

### Phase 2: Data Migration (Week 2)

**Goal**: Populate new tables with existing data

#### 2.1 Migrate Agent Property Assignments

```javascript
// Script: backend/scripts/migrateAgentAssignments.js
const { User, Property, PropertyAssignment } = require('../models');

async function migrateAgentAssignments() {
  console.log('Starting agent assignment migration...');
  
  // Find all agents
  const agents = await User.findAll({
    where: {
      internalRole: 'agent'
    }
  });
  
  console.log(`Found ${agents.length} agents`);
  
  for (const agent of agents) {
    // Find properties in agent's territory
    if (agent.territoryId) {
      const properties = await Property.findAll({
        where: {
          territoryId: agent.territoryId
        }
      });
      
      console.log(`Agent ${agent.name} - ${properties.length} properties in territory`);
      
      // Create assignments
      for (const property of properties) {
        await PropertyAssignment.create({
          userId: agent.id,
          propertyId: property.id,
          assignmentType: 'agent',
          assignedAt: new Date(),
          isActive: true
        });
      }
    }
  }
  
  console.log('Agent assignment migration complete');
}

migrateAgentAssignments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

#### 2.2 Migrate Property Staff Assignments

```javascript
// Script: backend/scripts/migratePropertyStaffAssignments.js
const { User, Property } = require('../models');

async function migratePropertyStaffAssignments() {
  console.log('Starting property staff assignment migration...');
  
  // Find all property staff
  const staff = await User.findAll({
    where: {
      staffRole: ['front_desk', 'housekeeping', 'maintenance', 'manager']
    }
  });
  
  console.log(`Found ${staff.length} property staff members`);
  
  for (const staffMember of staff) {
    // Logic to determine assigned property
    // This depends on your existing data structure
    // Example: Find property where staff member has been active
    
    const property = await findStaffProperty(staffMember);
    
    if (property) {
      await staffMember.update({
        assignedPropertyId: property.id
      });
      
      console.log(`Assigned ${staffMember.name} to ${property.name}`);
    } else {
      console.warn(`Could not determine property for ${staffMember.name}`);
    }
  }
  
  console.log('Property staff assignment migration complete');
}

async function findStaffProperty(staffMember) {
  // Implement logic based on your data
  // Examples:
  // - Check recent bookings/payments they processed
  // - Check housekeeping logs
  // - Check maintenance requests
  // - Manual mapping if needed
  
  return null; // Placeholder
}

migratePropertyStaffAssignments()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

**Deployment Steps**:
1. Run migration scripts on staging with production data copy
2. Verify data accuracy
3. Generate report of unmapped users
4. Manually review and fix edge cases
5. Run on production during maintenance window
6. Verify all users have correct assignments

**Rollback Plan**:
- Keep backup of users table before updates
- Script to clear property_assignments table
- Script to reset assigned_property_id to null

### Phase 3: Backend Code Deployment (Week 3-4)

**Goal**: Deploy new middleware and helper methods without enforcing

#### 3.1 Deploy User Model Enhancements

```javascript
// Deploy User.js with new helper methods
// These are read-only and won't break existing code
User.prototype.getUserType = function() { /* ... */ };
User.prototype.isPropertyOwner = function() { /* ... */ };
User.prototype.isPlatformStaff = function() { /* ... */ };
User.prototype.isPropertyStaff = function() { /* ... */ };
User.prototype.getAccessiblePropertyIds = async function() { /* ... */ };
```

**Testing**:
- Unit tests for all helper methods
- Integration tests with existing routes
- Verify no breaking changes

#### 3.2 Deploy Data Scoping Middleware (Logging Only)

```javascript
// Initial deployment: Log but don't enforce
exports.applyScopingMiddleware = async (req, res, next) => {
  try {
    const scope = await calculateDataScope(req.user);
    req.dataScope = scope;
    
    // LOG ONLY - Don't enforce yet
    console.log('Data scope calculated:', {
      userId: req.user.id,
      userType: scope.userType,
      propertyCount: scope.propertyIds.length,
      canBypass: scope.canBypassScoping
    });
    
    next();
  } catch (error) {
    console.error('Data scoping error:', error);
    next(); // Continue even if scoping fails
  }
};
```

**Monitoring**:
- Review logs for unexpected scoping results
- Identify edge cases
- Fix issues before enforcement

#### 3.3 Deploy Platform Routes (Parallel to Existing)

```javascript
// Add new /platform/ routes alongside existing routes
// Existing routes continue to work
app.use('/api/internal/properties', propertyRoutes);  // Existing
app.use('/api/internal/platform/properties', platformPropertyRoutes);  // New
```

**Testing**:
- Test all new platform routes
- Verify existing routes still work
- Test with different user types

**Deployment Steps**:
1. Deploy to staging
2. Run full test suite
3. Manual testing with different user types
4. Deploy to production
5. Monitor error rates and performance
6. Keep feature flag to disable if needed

**Rollback Plan**:
- Feature flag to disable data scoping
- Can revert to previous version
- Database unchanged, so safe to rollback

### Phase 4: Enable Data Scoping Enforcement (Week 5-6)

**Goal**: Gradually enable scoping enforcement by user type

#### 4.1 Enable for Property Owners (Week 5)

```javascript
// Feature flag: ENABLE_SCOPING_PROPERTY_OWNERS=true
exports.applyScopingMiddleware = async (req, res, next) => {
  const scope = await calculateDataScope(req.user);
  req.dataScope = scope;
  
  // Enforce for property owners only
  if (scope.userType === 'property_owner' && process.env.ENABLE_SCOPING_PROPERTY_OWNERS === 'true') {
    // Scoping is enforced
  }
  
  next();
};
```

**Monitoring**:
- Watch for 403 errors
- Monitor property owner feedback
- Check for data access issues

#### 4.2 Enable for Platform Staff (Week 6)

```javascript
// Feature flag: ENABLE_SCOPING_PLATFORM_STAFF=true
if (scope.userType === 'platform_staff' && process.env.ENABLE_SCOPING_PLATFORM_STAFF === 'true') {
  // Scoping is enforced
}
```

**Monitoring**:
- Watch for agents/managers reporting access issues
- Verify territory-based scoping works correctly
- Check assignment accuracy

#### 4.3 Enable for Property Staff (Week 6)

```javascript
// Feature flag: ENABLE_SCOPING_PROPERTY_STAFF=true
if (scope.userType === 'property_staff' && process.env.ENABLE_SCOPING_PROPERTY_STAFF === 'true') {
  // Scoping is enforced
}
```

**Monitoring**:
- Verify staff can access their assigned property
- Check for permission issues
- Monitor staff feedback

#### 4.4 Full Enforcement (End of Week 6)

```javascript
// Remove feature flags, enforce for all
exports.applyScopingMiddleware = async (req, res, next) => {
  const scope = await calculateDataScope(req.user);
  req.dataScope = scope;
  // Always enforced
  next();
};
```

**Deployment Steps**:
1. Enable for one user type at a time
2. Monitor for 24-48 hours between each
3. Fix any issues before proceeding
4. Communicate changes to users
5. Provide support for access issues

**Rollback Plan**:
- Feature flags can be disabled instantly
- No database changes needed
- Can rollback to previous phase

### Phase 5: Frontend Deployment (Week 7)

**Goal**: Deploy new navigation and route guards

#### 5.1 Deploy Route Guards

```typescript
// Deploy PlatformRoute component
// Deploy updated ProtectedRoute component
// Add route guards to all routes
```

#### 5.2 Deploy Navigation Updates

```typescript
// Deploy updated Sidebar component
// Deploy InternalSidebar component
// Add role-based menu filtering
```

#### 5.3 Deploy Dashboard Routing

```typescript
// Add user type detection
// Route to appropriate dashboard
// Handle unauthorized access
```

**Testing**:
- Test with all user types
- Verify navigation shows correct items
- Test route protection
- Verify redirects work correctly

**Deployment Steps**:
1. Build and test frontend
2. Deploy to staging
3. Manual testing with different user types
4. Deploy to production
5. Monitor for navigation issues

**Rollback Plan**:
- Can revert frontend deployment
- Backend still works with old frontend
- No data loss

### Phase 6: Cleanup and Optimization (Week 8)

**Goal**: Remove old code and optimize performance

#### 6.1 Remove Feature Flags

```javascript
// Remove all feature flag checks
// Clean up logging code
// Remove temporary workarounds
```

#### 6.2 Optimize Queries

```javascript
// Add query result caching
// Optimize property ID lookups
// Add database query monitoring
```

#### 6.3 Update Documentation

```markdown
// Update all API documentation
// Update developer guides
// Create user guides
```

**Deployment Steps**:
1. Code cleanup
2. Performance testing
3. Documentation updates
4. Final deployment

## Data Validation

### Pre-Migration Validation

```javascript
// Script: backend/scripts/validatePreMigration.js
async function validatePreMigration() {
  const checks = [];
  
  // Check 1: All property owners have properties
  const ownersWithoutProperties = await User.count({
    where: { role: 'owner' },
    include: [{
      model: Property,
      required: false
    }],
    having: sequelize.literal('COUNT(Properties.id) = 0')
  });
  checks.push({
    name: 'Owners without properties',
    count: ownersWithoutProperties,
    severity: 'warning'
  });
  
  // Check 2: All agents have territories
  const agentsWithoutTerritory = await User.count({
    where: {
      internalRole: 'agent',
      territoryId: null
    }
  });
  checks.push({
    name: 'Agents without territory',
    count: agentsWithoutTerritory,
    severity: 'error'
  });
  
  // Check 3: All property staff have valid staffRole
  const invalidStaff = await User.count({
    where: {
      staffRole: {
        [Op.notIn]: ['front_desk', 'housekeeping', 'maintenance', 'manager']
      }
    }
  });
  checks.push({
    name: 'Invalid staff roles',
    count: invalidStaff,
    severity: 'error'
  });
  
  // Check 4: No role conflicts
  const roleConflicts = await User.count({
    where: {
      role: ['owner', 'admin'],
      internalRole: { [Op.ne]: null }
    }
  });
  checks.push({
    name: 'Role conflicts (owner + internalRole)',
    count: roleConflicts,
    severity: 'error'
  });
  
  return checks;
}
```

### Post-Migration Validation

```javascript
// Script: backend/scripts/validatePostMigration.js
async function validatePostMigration() {
  const checks = [];
  
  // Check 1: All agents have property assignments
  const agentsWithoutAssignments = await User.count({
    where: { internalRole: 'agent' },
    include: [{
      model: PropertyAssignment,
      required: false
    }],
    having: sequelize.literal('COUNT(PropertyAssignments.id) = 0')
  });
  checks.push({
    name: 'Agents without property assignments',
    count: agentsWithoutAssignments,
    severity: 'warning'
  });
  
  // Check 2: All property staff have assigned property
  const staffWithoutProperty = await User.count({
    where: {
      staffRole: { [Op.ne]: null },
      assignedPropertyId: null
    }
  });
  checks.push({
    name: 'Property staff without assigned property',
    count: staffWithoutProperty,
    severity: 'error'
  });
  
  // Check 3: All property assignments are valid
  const invalidAssignments = await PropertyAssignment.count({
    include: [
      { model: User, required: false },
      { model: Property, required: false }
    ],
    where: {
      [Op.or]: [
        { '$User.id$': null },
        { '$Property.id$': null }
      ]
    }
  });
  checks.push({
    name: 'Invalid property assignments',
    count: invalidAssignments,
    severity: 'error'
  });
  
  return checks;
}
```

## Rollback Procedures

### Emergency Rollback (Any Phase)

```bash
# 1. Disable feature flags
export ENABLE_SCOPING_PROPERTY_OWNERS=false
export ENABLE_SCOPING_PLATFORM_STAFF=false
export ENABLE_SCOPING_PROPERTY_STAFF=false

# 2. Restart application
pm2 restart all

# 3. Verify system is working
curl https://api.goroomz.com/health
```

### Database Rollback (Phase 1-2)

```bash
# 1. Stop application
pm2 stop all

# 2. Restore database backup
psql goroomz < backup_before_migration.sql

# 3. Restart application
pm2 start all
```

### Code Rollback (Phase 3-6)

```bash
# 1. Revert to previous git commit
git revert HEAD
git push origin main

# 2. Redeploy
./deploy.sh

# 3. Verify
curl https://api.goroomz.com/health
```

## Communication Plan

### Week Before Migration

**To**: All users (property owners, staff, platform staff)

**Subject**: Upcoming System Improvements

**Content**:
- Explain role segregation improvements
- Highlight benefits (better security, clearer permissions)
- Mention potential brief downtime
- Provide support contact

### During Migration

**To**: Technical team

**Content**:
- Real-time status updates
- Issue tracking
- Rollback decision points

### After Migration

**To**: All users

**Subject**: System Update Complete

**Content**:
- Confirm successful migration
- Highlight new features
- Provide documentation links
- Offer support for questions

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Error Rates**
   - 403 Forbidden errors (access denied)
   - 500 Internal Server errors
   - Authentication failures

2. **Performance Metrics**
   - Query response times
   - Property ID lookup times
   - Middleware execution time

3. **User Activity**
   - Login success/failure rates
   - Route access patterns
   - Feature usage by user type

4. **Data Integrity**
   - Property assignment counts
   - User role distribution
   - Scoping bypass attempts

### Alert Thresholds

```javascript
// Alert if error rate exceeds threshold
if (errorRate > 5%) {
  alert('High error rate detected - consider rollback');
}

// Alert if response time degrades
if (avgResponseTime > 500ms) {
  alert('Performance degradation detected');
}

// Alert if many users can't access data
if (403ErrorCount > 100 per hour) {
  alert('Many access denied errors - check scoping logic');
}
```

## Success Criteria

### Phase 1-2 Success
- ✅ All migrations run without errors
- ✅ Existing functionality unchanged
- ✅ All users have correct assignments
- ✅ No data loss

### Phase 3-4 Success
- ✅ Data scoping works correctly for all user types
- ✅ No unauthorized data access
- ✅ Performance within acceptable range
- ✅ Error rate < 1%

### Phase 5-6 Success
- ✅ All users can access appropriate features
- ✅ Navigation shows correct items
- ✅ Route guards work correctly
- ✅ User satisfaction maintained

## Related Documentation

- [Data Scoping Guide](./DATA_SCOPING.md)
- [User Type Decision Tree](./USER_TYPE_DECISION_TREE.md)
- [Platform Routes API](./PLATFORM_ROUTES_API.md)
- [Naming Conventions](./CONVENTIONS.md)
