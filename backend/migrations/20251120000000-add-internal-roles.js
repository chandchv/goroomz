'use strict';

/**
 * Migration: Add Internal User Roles System
 * 
 * This migration adds all tables and fields required for the internal user role management system.
 * It includes:
 * - User model extensions for internal roles
 * - New tables: InternalRoles, Leads, LeadCommunications, Commissions, Territories, 
 *   AgentTargets, SupportTickets, TicketResponses, PropertyDocuments, Announcements
 * - Indexes for performance
 * - Foreign key constraints
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Extend Users table with internal role fields
      console.log('Adding internal role fields to Users table...');
      
      await queryInterface.addColumn('users', 'internalRole', {
        type: Sequelize.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn('users', 'internalPermissions', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn('users', 'territoryId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'territories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      await queryInterface.addColumn('users', 'managerId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      await queryInterface.addColumn('users', 'commissionRate', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null
      }, { transaction });

      await queryInterface.addColumn('users', 'lastLoginAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      // 2. Create InternalRoles table
      console.log('Creating InternalRoles table...');
      
      await queryInterface.createTable('internal_roles', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        displayName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        defaultPermissions: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        isCustom: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // 3. Create Territories table (must be created before adding foreign key to Users)
      console.log('Creating Territories table...');
      
      await queryInterface.createTable('territories', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        regionalManagerId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        boundaries: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        cities: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
          defaultValue: []
        },
        states: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
          defaultValue: []
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // 4. Create Leads table
      console.log('Creating Leads table...');
      
      await queryInterface.createTable('leads', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        propertyOwnerName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: false
        },
        businessName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        propertyType: {
          type: Sequelize.ENUM('hotel', 'pg'),
          allowNull: false
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING,
          allowNull: true
        },
        state: {
          type: Sequelize.STRING,
          allowNull: true
        },
        country: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'India'
        },
        estimatedRooms: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
          allowNull: false,
          defaultValue: 'contacted'
        },
        source: {
          type: Sequelize.STRING,
          allowNull: true
        },
        agentId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        territoryId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'territories',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        expectedCloseDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        rejectionReason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        approvedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        approvedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      // Add indexes for Leads
      await queryInterface.addIndex('leads', ['agentId'], { transaction });
      await queryInterface.addIndex('leads', ['territoryId'], { transaction });
      await queryInterface.addIndex('leads', ['status'], { transaction });
      await queryInterface.addIndex('leads', ['email'], { transaction });

      // 5. Create LeadCommunications table
      console.log('Creating LeadCommunications table...');
      
      await queryInterface.createTable('lead_communications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        leadId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'leads',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        type: {
          type: Sequelize.ENUM('call', 'email', 'meeting', 'note'),
          allowNull: false
        },
        subject: {
          type: Sequelize.STRING,
          allowNull: true
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        scheduledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('lead_communications', ['leadId'], { transaction });

      // 6. Create Commissions table
      console.log('Creating Commissions table...');
      
      await queryInterface.createTable('commissions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        agentId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        leadId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'leads',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        propertyId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        rate: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('earned', 'pending_payment', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'earned'
        },
        earnedDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        paymentDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        transactionReference: {
          type: Sequelize.STRING,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('commissions', ['agentId'], { transaction });
      await queryInterface.addIndex('commissions', ['status'], { transaction });

      // 7. Create AgentTargets table
      console.log('Creating AgentTargets table...');
      
      await queryInterface.createTable('agent_targets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        agentId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        territoryId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'territories',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        period: {
          type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
          allowNull: false
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        targetProperties: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        targetRevenue: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true
        },
        actualProperties: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        actualRevenue: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        setBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('agent_targets', ['agentId'], { transaction });

      // 8. Create SupportTickets table
      console.log('Creating SupportTickets table...');
      
      await queryInterface.createTable('support_tickets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        ticketNumber: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        propertyOwnerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        propertyId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        category: {
          type: Sequelize.ENUM('technical', 'billing', 'operations', 'feature_request', 'other'),
          allowNull: false
        },
        priority: {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          allowNull: false,
          defaultValue: 'medium'
        },
        status: {
          type: Sequelize.ENUM('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
          allowNull: false,
          defaultValue: 'new'
        },
        assignedTo: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        resolvedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        resolvedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        resolution: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('support_tickets', ['status'], { transaction });
      await queryInterface.addIndex('support_tickets', ['assignedTo'], { transaction });
      await queryInterface.addIndex('support_tickets', ['propertyOwnerId'], { transaction });
      await queryInterface.addIndex('support_tickets', ['priority'], { transaction });

      // 9. Create TicketResponses table
      console.log('Creating TicketResponses table...');
      
      await queryInterface.createTable('ticket_responses', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        ticketId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'support_tickets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        isInternal: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        attachments: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: []
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('ticket_responses', ['ticketId'], { transaction });

      // 10. Create PropertyDocuments table
      console.log('Creating PropertyDocuments table...');
      
      await queryInterface.createTable('property_documents', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        leadId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'leads',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        propertyOwnerId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        documentType: {
          type: Sequelize.ENUM('business_license', 'property_photos', 'owner_id', 'tax_certificate', 'other'),
          allowNull: false
        },
        fileName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        fileUrl: {
          type: Sequelize.STRING,
          allowNull: false
        },
        fileSize: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        mimeType: {
          type: Sequelize.STRING,
          allowNull: true
        },
        uploadedBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        status: {
          type: Sequelize.ENUM('pending_review', 'approved', 'rejected'),
          allowNull: false,
          defaultValue: 'pending_review'
        },
        reviewedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        reviewNotes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction });

      await queryInterface.addIndex('property_documents', ['leadId'], { transaction });
      await queryInterface.addIndex('property_documents', ['propertyOwnerId'], { transaction });

      // 11. Create Announcements table (if not exists)
      console.log('Creating Announcements table...');
      
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('Announcements')) {
        await queryInterface.createTable('announcements', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false
          },
          content: {
            type: Sequelize.TEXT,
            allowNull: false
          },
          targetAudience: {
            type: Sequelize.ENUM('all_property_owners', 'specific_region', 'specific_property_type'),
            allowNull: false
          },
          targetFilters: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
          },
          createdBy: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          scheduledAt: {
            type: Sequelize.DATE,
            allowNull: true
          },
          sentAt: {
            type: Sequelize.DATE,
            allowNull: true
          },
          deliveryMethod: {
            type: Sequelize.ARRAY(Sequelize.ENUM('email', 'in_app', 'sms')),
            allowNull: false,
            defaultValue: ['in_app']
          },
          readCount: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          totalRecipients: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false
          }
        }, { transaction });
      }

      await transaction.commit();
      console.log('Migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables in reverse order (respecting foreign key constraints)
      console.log('Rolling back migration...');
      
      await queryInterface.dropTable('ticket_responses', { transaction });
      await queryInterface.dropTable('support_tickets', { transaction });
      await queryInterface.dropTable('property_documents', { transaction });
      await queryInterface.dropTable('lead_communications', { transaction });
      await queryInterface.dropTable('agent_targets', { transaction });
      await queryInterface.dropTable('commissions', { transaction });
      await queryInterface.dropTable('leads', { transaction });
      await queryInterface.dropTable('internal_roles', { transaction });
      await queryInterface.dropTable('territories', { transaction });
      
      // Remove columns from Users table
      await queryInterface.removeColumn('users', 'lastLoginAt', { transaction });
      await queryInterface.removeColumn('users', 'commissionRate', { transaction });
      await queryInterface.removeColumn('users', 'managerId', { transaction });
      await queryInterface.removeColumn('users', 'territoryId', { transaction });
      await queryInterface.removeColumn('users', 'internalPermissions', { transaction });
      await queryInterface.removeColumn('users', 'internalRole', { transaction });
      
      await transaction.commit();
      console.log('Rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
