'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Seed Data for Internal User Roles System
 * 
 * This seeder creates test data for development and testing:
 * - Default internal roles
 * - Sample internal users (superuser, admin, regional manager, agents)
 * - Sample territories
 * - Sample leads
 * - Sample commissions
 * - Sample targets
 * 
 * WARNING: This is for development/testing only. Do not run in production!
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Seeding internal roles system data...');
      
      // Generate UUIDs for relationships
      const superuserId = uuidv4();
      const adminId = uuidv4();
      const regionalManagerId = uuidv4();
      const agent1Id = uuidv4();
      const agent2Id = uuidv4();
      const territoryId = uuidv4();
      const lead1Id = uuidv4();
      const lead2Id = uuidv4();
      
      // Hash password for test users
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      // 1. Create default internal roles
      console.log('Creating default internal roles...');
      
      await queryInterface.bulkInsert('InternalRoles', [
        {
          id: uuidv4(),
          name: 'agent',
          displayName: 'Marketing/Sales Agent',
          description: 'Onboards new properties and property owners onto the platform',
          defaultPermissions: JSON.stringify({
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
          isCustom: false,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'regional_manager',
          displayName: 'Regional Manager',
          description: 'Oversees agents and properties in a geographic region',
          defaultPermissions: JSON.stringify({
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
          isCustom: false,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'operations_manager',
          displayName: 'Operations Manager',
          description: 'Manages platform-wide operations and support',
          defaultPermissions: JSON.stringify({
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
          isCustom: false,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'platform_admin',
          displayName: 'Platform Administrator',
          description: 'Manages system configuration and internal users',
          defaultPermissions: JSON.stringify({
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
          isCustom: false,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          name: 'superuser',
          displayName: 'Superuser',
          description: 'Complete platform access and control',
          defaultPermissions: JSON.stringify({
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
          isCustom: false,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      // 2. Create sample territory
      console.log('Creating sample territory...');
      
      await queryInterface.bulkInsert('Territories', [
        {
          id: territoryId,
          name: 'Mumbai Zone',
          description: 'Covers Mumbai and surrounding areas',
          regionalManagerId: regionalManagerId,
          boundaries: JSON.stringify({
            type: 'Polygon',
            coordinates: []
          }),
          cities: ['Mumbai', 'Navi Mumbai', 'Thane'],
          states: ['Maharashtra'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      // 3. Create sample internal users
      console.log('Creating sample internal users...');
      
      await queryInterface.bulkInsert('Users', [
        {
          id: superuserId,
          name: 'Super Admin',
          email: 'superadmin@goroomz.com',
          password: hashedPassword,
          phone: '+919876543210',
          role: 'admin',
          internalRole: 'superuser',
          internalPermissions: JSON.stringify({
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
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: adminId,
          name: 'Platform Admin',
          email: 'admin@goroomz.com',
          password: hashedPassword,
          phone: '+919876543211',
          role: 'admin',
          internalRole: 'platform_admin',
          internalPermissions: JSON.stringify({
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
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: regionalManagerId,
          name: 'Regional Manager Mumbai',
          email: 'rm.mumbai@goroomz.com',
          password: hashedPassword,
          phone: '+919876543212',
          role: 'admin',
          internalRole: 'regional_manager',
          internalPermissions: JSON.stringify({
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
          territoryId: territoryId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: agent1Id,
          name: 'Sales Agent 1',
          email: 'agent1@goroomz.com',
          password: hashedPassword,
          phone: '+919876543213',
          role: 'admin',
          internalRole: 'agent',
          internalPermissions: JSON.stringify({
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
          territoryId: territoryId,
          managerId: regionalManagerId,
          commissionRate: 5.0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: agent2Id,
          name: 'Sales Agent 2',
          email: 'agent2@goroomz.com',
          password: hashedPassword,
          phone: '+919876543214',
          role: 'admin',
          internalRole: 'agent',
          internalPermissions: JSON.stringify({
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
          territoryId: territoryId,
          managerId: regionalManagerId,
          commissionRate: 5.0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      // 4. Create sample leads
      console.log('Creating sample leads...');
      
      await queryInterface.bulkInsert('Leads', [
        {
          id: lead1Id,
          propertyOwnerName: 'ABC Hotels',
          email: 'owner@abchotels.com',
          phone: '+919876543220',
          businessName: 'ABC Hotels Pvt Ltd',
          propertyType: 'hotel',
          address: '123 Main Street, Andheri',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          estimatedRooms: 50,
          status: 'in_progress',
          source: 'referral',
          agentId: agent1Id,
          territoryId: territoryId,
          notes: 'Interested in premium listing. Follow up scheduled for next week.',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: lead2Id,
          propertyOwnerName: 'XYZ PG',
          email: 'owner@xyzpg.com',
          phone: '+919876543221',
          businessName: 'XYZ PG Services',
          propertyType: 'pg',
          address: '456 Park Road, Bandra',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          estimatedRooms: 20,
          status: 'pending_approval',
          source: 'website',
          agentId: agent2Id,
          territoryId: territoryId,
          notes: 'All documents uploaded. Ready for approval.',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      // 5. Create sample lead communications
      console.log('Creating sample lead communications...');
      
      await queryInterface.bulkInsert('LeadCommunications', [
        {
          id: uuidv4(),
          leadId: lead1Id,
          userId: agent1Id,
          type: 'call',
          subject: 'Initial contact',
          content: 'Discussed property details and platform benefits. Owner is interested.',
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: uuidv4(),
          leadId: lead1Id,
          userId: agent1Id,
          type: 'email',
          subject: 'Platform information sent',
          content: 'Sent detailed information about platform features and pricing.',
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          id: uuidv4(),
          leadId: lead2Id,
          userId: agent2Id,
          type: 'meeting',
          subject: 'Property visit',
          content: 'Visited property and met with owner. Collected all required documents.',
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ], { transaction });

      // 6. Create sample commissions
      console.log('Creating sample commissions...');
      
      await queryInterface.bulkInsert('Commissions', [
        {
          id: uuidv4(),
          agentId: agent1Id,
          leadId: null,
          propertyId: null,
          amount: 500.00,
          rate: 5.0,
          status: 'paid',
          earnedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          paymentMethod: 'bank_transfer',
          transactionReference: 'TXN001234',
          notes: 'October commission payment',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        },
        {
          id: uuidv4(),
          agentId: agent2Id,
          leadId: null,
          propertyId: null,
          amount: 750.00,
          rate: 5.0,
          status: 'pending_payment',
          earnedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          notes: 'Awaiting November payment cycle',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      ], { transaction });

      // 7. Create sample agent targets
      console.log('Creating sample agent targets...');
      
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      await queryInterface.bulkInsert('AgentTargets', [
        {
          id: uuidv4(),
          agentId: agent1Id,
          territoryId: territoryId,
          period: 'monthly',
          startDate: startOfMonth,
          endDate: endOfMonth,
          targetProperties: 5,
          targetRevenue: 50000.00,
          actualProperties: 3,
          actualRevenue: 32000.00,
          setBy: regionalManagerId,
          createdAt: startOfMonth,
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          agentId: agent2Id,
          territoryId: territoryId,
          period: 'monthly',
          startDate: startOfMonth,
          endDate: endOfMonth,
          targetProperties: 5,
          targetRevenue: 50000.00,
          actualProperties: 4,
          actualRevenue: 45000.00,
          setBy: regionalManagerId,
          createdAt: startOfMonth,
          updatedAt: new Date()
        }
      ], { transaction });

      // 8. Create sample property documents
      console.log('Creating sample property documents...');
      
      await queryInterface.bulkInsert('PropertyDocuments', [
        {
          id: uuidv4(),
          leadId: lead2Id,
          propertyOwnerId: null,
          documentType: 'business_license',
          fileName: 'business_license.pdf',
          fileUrl: '/uploads/documents/business_license_sample.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          uploadedBy: agent2Id,
          status: 'pending_review',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: uuidv4(),
          leadId: lead2Id,
          propertyOwnerId: null,
          documentType: 'property_photos',
          fileName: 'property_photos.jpg',
          fileUrl: '/uploads/documents/property_photos_sample.jpg',
          fileSize: 2048000,
          mimeType: 'image/jpeg',
          uploadedBy: agent2Id,
          status: 'pending_review',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      await transaction.commit();
      console.log('Seed data created successfully!');
      console.log('\nTest User Credentials:');
      console.log('======================');
      console.log('Superuser: superadmin@goroomz.com / Test@123');
      console.log('Platform Admin: admin@goroomz.com / Test@123');
      console.log('Regional Manager: rm.mumbai@goroomz.com / Test@123');
      console.log('Agent 1: agent1@goroomz.com / Test@123');
      console.log('Agent 2: agent2@goroomz.com / Test@123');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Seeding failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Removing seed data...');
      
      // Delete in reverse order to respect foreign key constraints
      await queryInterface.bulkDelete('PropertyDocuments', null, { transaction });
      await queryInterface.bulkDelete('AgentTargets', null, { transaction });
      await queryInterface.bulkDelete('Commissions', null, { transaction });
      await queryInterface.bulkDelete('LeadCommunications', null, { transaction });
      await queryInterface.bulkDelete('Leads', null, { transaction });
      
      // Delete test users (only those with internal roles)
      await queryInterface.bulkDelete('Users', {
        email: {
          [Sequelize.Op.in]: [
            'superadmin@goroomz.com',
            'admin@goroomz.com',
            'rm.mumbai@goroomz.com',
            'agent1@goroomz.com',
            'agent2@goroomz.com'
          ]
        }
      }, { transaction });
      
      await queryInterface.bulkDelete('Territories', null, { transaction });
      await queryInterface.bulkDelete('InternalRoles', null, { transaction });
      
      await transaction.commit();
      console.log('Seed data removed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Seed data removal failed:', error);
      throw error;
    }
  }
};
