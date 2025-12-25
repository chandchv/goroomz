/**
 * Seed Internal Roles Data
 * Inserts the 5 default internal roles into the database
 */

const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function seedInternalRoles() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');
    
    const roles = [
      {
        id: uuidv4(),
        name: 'agent',
        display_name: 'Marketing/Sales Agent',
        description: 'Onboards new properties and property owners onto the platform',
        default_permissions: JSON.stringify({
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
        }),
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'regional_manager',
        display_name: 'Regional Manager',
        description: 'Oversees agents and properties in a geographic region',
        default_permissions: JSON.stringify({
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
        }),
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'operations_manager',
        display_name: 'Operations Manager',
        description: 'Manages platform-wide operations and support',
        default_permissions: JSON.stringify({
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
        }),
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'platform_admin',
        display_name: 'Platform Administrator',
        description: 'Manages system configuration and internal users',
        default_permissions: JSON.stringify({
          canOnboardProperties: false,
          canApproveOnboardings: false,
          canManageAgents: true,
          canAccessAllProperties: true,
          canManageSystemSettings: true,
          canViewAuditLogs: true,
          canManageCommissions: true,
          canManageTerritories: true,
          canManageTickets: true,
          canBroadcastAnnouncements: true
        }),
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'superuser',
        display_name: 'Superuser',
        description: 'Complete platform access and control',
        default_permissions: JSON.stringify({
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
        }),
        is_custom: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    console.log('Inserting internal roles...\n');
    
    for (const role of roles) {
      await sequelize.query(`
        INSERT INTO internal_roles (id, name, display_name, description, default_permissions, is_custom, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO NOTHING
      `, {
        bind: [
          role.id,
          role.name,
          role.display_name,
          role.description,
          role.default_permissions,
          role.is_custom,
          role.created_at,
          role.updated_at
        ]
      });
      console.log(`✓ Inserted role: ${role.name}`);
    }
    
    console.log('\n✅ All internal roles seeded successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error seeding roles:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedInternalRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
