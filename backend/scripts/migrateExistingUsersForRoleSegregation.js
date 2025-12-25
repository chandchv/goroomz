const { sequelize } = require('../config/database');
const User = require('../models/User');
const PropertyAssignment = require('../models/PropertyAssignment');

/**
 * Data Migration Script for Role Segregation
 * 
 * This script migrates existing user data to work with the new role segregation system.
 * It handles:
 * 1. Identifying users with conflicting roles
 * 2. Setting up property assignments for agents
 * 3. Assigning property staff to their properties
 * 4. Validating role configurations
 * 
 * Requirements: All (infrastructure)
 */

async function migrateExistingUsers() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Starting user data migration for role segregation...\n');
    
    // Step 1: Identify and report users with conflicting roles
    console.log('Step 1: Checking for role conflicts...');
    const [conflictingUsers] = await sequelize.query(`
      SELECT id, name, email, role, internal_role
      FROM users
      WHERE (role IN ('owner', 'admin', 'category_owner'))
        AND internal_role IS NOT NULL
    `, { transaction });
    
    if (conflictingUsers.length > 0) {
      console.log(`⚠️  Found ${conflictingUsers.length} users with conflicting roles:`);
      conflictingUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}): role=${user.role}, internalRole=${user.internal_role}`);
      });
      console.log('\n⚠️  These users need manual review. The migration will continue but these users may need correction.');
      console.log('   Recommendation: Decide if they should be property owners OR platform staff, not both.\n');
    } else {
      console.log('✅ No role conflicts found\n');
    }
    
    // Step 2: Set up property assignments for agents who have leads
    console.log('Step 2: Creating property assignments for agents with leads...');
    const [agentsWithLeads] = await sequelize.query(`
      SELECT DISTINCT u.id as user_id, l.property_id
      FROM users u
      INNER JOIN leads l ON l.agent_id = u.id
      WHERE u.internal_role = 'agent'
        AND l.property_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM property_assignments pa
          WHERE pa.user_id = u.id
            AND pa.property_id = l.property_id
        )
    `, { transaction });
    
    if (agentsWithLeads.length > 0) {
      console.log(`   Found ${agentsWithLeads.length} agent-property relationships to create`);
      
      // Get a system user to use as "assignedBy" (preferably a superuser)
      const [systemUsers] = await sequelize.query(`
        SELECT id FROM users
        WHERE internal_role = 'superuser'
        LIMIT 1
      `, { transaction });
      
      const systemUserId = systemUsers.length > 0 ? systemUsers[0].id : agentsWithLeads[0].user_id;
      
      for (const assignment of agentsWithLeads) {
        await sequelize.query(`
          INSERT INTO property_assignments (
            id, user_id, property_id, assignment_type, assigned_by, is_active, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), :userId, :propertyId, 'agent', :assignedBy, true, NOW(), NOW()
          )
        `, {
          replacements: {
            userId: assignment.user_id,
            propertyId: assignment.property_id,
            assignedBy: systemUserId
          },
          transaction
        });
      }
      console.log(`✅ Created ${agentsWithLeads.length} property assignments for agents\n`);
    } else {
      console.log('✅ No agent property assignments needed\n');
    }
    
    // Step 3: Identify property staff without assigned properties
    console.log('Step 3: Checking property staff assignments...');
    const [staffWithoutProperty] = await sequelize.query(`
      SELECT id, name, email, staff_role, assigned_property_id
      FROM users
      WHERE staff_role IS NOT NULL
        AND role NOT IN ('owner', 'admin', 'category_owner')
        AND internal_role IS NULL
        AND assigned_property_id IS NULL
    `, { transaction });
    
    if (staffWithoutProperty.length > 0) {
      console.log(`⚠️  Found ${staffWithoutProperty.length} property staff without assigned properties:`);
      staffWithoutProperty.forEach(user => {
        console.log(`   - ${user.name} (${user.email}): staffRole=${user.staff_role}`);
      });
      console.log('\n⚠️  These staff members need to be assigned to properties manually.');
      console.log('   They will not be able to access any data until assigned.\n');
    } else {
      console.log('✅ All property staff have assigned properties\n');
    }
    
    // Step 4: Validate permission scopes
    console.log('Step 4: Validating permission scopes...');
    const [usersWithInvalidPermissions] = await sequelize.query(`
      SELECT id, name, email, staff_role, permissions, internal_permissions
      FROM users
      WHERE staff_role IS NOT NULL
        AND internal_role IS NULL
        AND (
          internal_permissions IS NOT NULL
          AND internal_permissions::text != '{}'::text
          AND internal_permissions::text != 'null'
        )
    `, { transaction });
    
    if (usersWithInvalidPermissions.length > 0) {
      console.log(`⚠️  Found ${usersWithInvalidPermissions.length} property staff with internal permissions:`);
      usersWithInvalidPermissions.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
      
      // Clear internal permissions for property staff
      await sequelize.query(`
        UPDATE users
        SET internal_permissions = NULL
        WHERE staff_role IS NOT NULL
          AND internal_role IS NULL
          AND internal_permissions IS NOT NULL
      `, { transaction });
      
      console.log(`✅ Cleared internal permissions from ${usersWithInvalidPermissions.length} property staff\n`);
    } else {
      console.log('✅ All permission scopes are valid\n');
    }
    
    // Step 5: Generate summary statistics
    console.log('Step 5: Generating migration summary...\n');
    
    const [stats] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE internal_role IS NOT NULL) as platform_staff_count,
        COUNT(*) FILTER (WHERE role IN ('owner', 'admin', 'category_owner') AND internal_role IS NULL) as property_owner_count,
        COUNT(*) FILTER (WHERE staff_role IS NOT NULL AND internal_role IS NULL AND role NOT IN ('owner', 'admin', 'category_owner')) as property_staff_count,
        COUNT(*) FILTER (WHERE role = 'user' AND internal_role IS NULL AND staff_role IS NULL) as external_user_count
      FROM users
    `, { transaction });
    
    const [assignmentStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_assignments,
        COUNT(*) FILTER (WHERE assignment_type = 'agent') as agent_assignments,
        COUNT(*) FILTER (WHERE assignment_type = 'staff') as staff_assignments,
        COUNT(*) FILTER (WHERE assignment_type = 'manager') as manager_assignments
      FROM property_assignments
    `, { transaction });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                   MIGRATION SUMMARY                       ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nUser Type Distribution:');
    console.log(`  Platform Staff:    ${stats[0].platform_staff_count}`);
    console.log(`  Property Owners:   ${stats[0].property_owner_count}`);
    console.log(`  Property Staff:    ${stats[0].property_staff_count}`);
    console.log(`  External Users:    ${stats[0].external_user_count}`);
    console.log('\nProperty Assignments:');
    console.log(`  Total Assignments: ${assignmentStats[0].total_assignments}`);
    console.log(`  Agent Assignments: ${assignmentStats[0].agent_assignments}`);
    console.log(`  Staff Assignments: ${assignmentStats[0].staff_assignments}`);
    console.log(`  Manager Assignments: ${assignmentStats[0].manager_assignments}`);
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    // Commit transaction
    await transaction.commit();
    
    console.log('✅ Migration completed successfully!');
    console.log('\nNext Steps:');
    console.log('1. Review any users with conflicting roles and resolve manually');
    console.log('2. Assign properties to any property staff without assignments');
    console.log('3. Test the role segregation system with different user types');
    console.log('4. Run the test script: node backend/scripts/testRoleSegregationMigration.js\n');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Migration failed:', error);
    console.error('\nStack trace:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrateExistingUsers();
}

module.exports = { migrateExistingUsers };
