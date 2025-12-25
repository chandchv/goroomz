/**
 * Seed Sample Internal Users
 * 
 * Creates a diverse set of internal users with different roles and online statuses
 * for testing the OnlineStatusIndicator component and user management UI.
 */

const { User } = require('../models');
const bcrypt = require('bcryptjs');

const sampleUsers = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@goroomz.com',
    phone: '+919876543210',
    password: 'Password123!',
    internalRole: 'superuser',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (online)
    internalPermissions: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true,
    },
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@goroomz.com',
    phone: '+919876543211',
    password: 'Password123!',
    internalRole: 'platform_admin',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago (online)
    internalPermissions: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true,
    },
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@goroomz.com',
    phone: '+919876543212',
    password: 'Password123!',
    internalRole: 'regional_manager',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago (offline)
    internalPermissions: {
      canOnboardProperties: false,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: false,
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'David Martinez',
    email: 'david.martinez@goroomz.com',
    phone: '+919876543213',
    password: 'Password123!',
    internalRole: 'operations_manager',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago (online)
    internalPermissions: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: true,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: true,
      canBroadcastAnnouncements: true,
    },
  },
  {
    name: 'Aisha Patel',
    email: 'aisha.patel@goroomz.com',
    phone: '+919876543214',
    password: 'Password123!',
    internalRole: 'agent',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago (online)
    commissionRate: 5.0,
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
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@goroomz.com',
    phone: '+919876543215',
    password: 'Password123!',
    internalRole: 'agent',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (offline)
    commissionRate: 4.5,
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
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@goroomz.com',
    phone: '+919876543216',
    password: 'Password123!',
    internalRole: 'regional_manager',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago (offline)
    internalPermissions: {
      canOnboardProperties: false,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: false,
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@goroomz.com',
    phone: '+919876543217',
    password: 'Password123!',
    internalRole: 'agent',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (offline)
    commissionRate: 6.0,
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
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'Lisa Thompson',
    email: 'lisa.thompson@goroomz.com',
    phone: '+919876543218',
    password: 'Password123!',
    internalRole: 'operations_manager',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (offline)
    internalPermissions: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: true,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: true,
      canBroadcastAnnouncements: true,
    },
  },
  {
    name: 'Mohammed Ali',
    email: 'mohammed.ali@goroomz.com',
    phone: '+919876543219',
    password: 'Password123!',
    internalRole: 'agent',
    isActive: false, // Inactive user
    lastLoginAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    commissionRate: 5.5,
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
      canBroadcastAnnouncements: false,
    },
  },
  {
    name: 'Sophie Anderson',
    email: 'sophie.anderson@goroomz.com',
    phone: '+919876543220',
    password: 'Password123!',
    internalRole: 'platform_admin',
    isActive: true,
    lastLoginAt: new Date(Date.now() - 45 * 1000), // 45 seconds ago (online)
    internalPermissions: {
      canOnboardProperties: true,
      canApproveOnboardings: true,
      canManageAgents: true,
      canAccessAllProperties: true,
      canManageSystemSettings: true,
      canViewAuditLogs: true,
      canManageCommissions: true,
      canManageTerritories: true,
      canManageTickets: true,
      canBroadcastAnnouncements: true,
    },
  },
  {
    name: 'Vikram Singh',
    email: 'vikram.singh@goroomz.com',
    phone: '+919876543221',
    password: 'Password123!',
    internalRole: 'agent',
    isActive: true,
    lastLoginAt: null, // Never logged in
    commissionRate: 4.0,
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
      canBroadcastAnnouncements: false,
    },
  },
];

async function seedSampleUsers() {
  try {
    console.log('🌱 Starting to seed sample internal users...\n');

    let created = 0;
    let skipped = 0;

    for (const userData of sampleUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });

      if (existingUser) {
        console.log(`⏭️  Skipped: ${userData.name} (${userData.email}) - already exists`);
        skipped++;
        continue;
      }

      // Create user (password will be hashed automatically by the model's beforeCreate hook)
      await User.create({
        ...userData,
      });

      const status = userData.lastLoginAt
        ? new Date().getTime() - new Date(userData.lastLoginAt).getTime() < 300000
          ? '🟢 ONLINE'
          : '⚫ OFFLINE'
        : '⚪ NEVER LOGGED IN';

      console.log(
        `✅ Created: ${userData.name.padEnd(20)} | ${userData.internalRole.padEnd(20)} | ${status} | ${userData.isActive ? 'Active' : 'Inactive'}`
      );
      created++;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✨ Seeding complete!`);
    console.log(`   Created: ${created} users`);
    console.log(`   Skipped: ${skipped} users (already exist)`);
    console.log(`   Total:   ${sampleUsers.length} users`);
    console.log('='.repeat(80));
    console.log('\n📝 Default password for all users: Password123!');
    console.log('\n🔍 User breakdown:');
    console.log(`   - Superusers: 1`);
    console.log(`   - Platform Admins: 2`);
    console.log(`   - Regional Managers: 2`);
    console.log(`   - Operations Managers: 2`);
    console.log(`   - Agents: 5`);
    console.log(`\n🟢 Online users (logged in < 5 min ago): 5`);
    console.log(`⚫ Offline users: 6`);
    console.log(`❌ Inactive users: 1`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding sample users:', error);
    process.exit(1);
  }
}

// Run the seeder
seedSampleUsers();
