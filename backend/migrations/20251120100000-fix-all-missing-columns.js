'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Helper function to check if column exists
      const columnExists = async (tableName, columnName) => {
        const [results] = await queryInterface.sequelize.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name='${tableName}' AND column_name='${columnName}';`,
          { transaction }
        );
        return results.length > 0;
      };

      // Helper function to check if enum type exists
      const enumTypeExists = async (typeName) => {
        const [results] = await queryInterface.sequelize.query(
          `SELECT typname FROM pg_type WHERE typname = '${typeName}';`,
          { transaction }
        );
        return results.length > 0;
      };

      console.log('Starting migration to fix missing columns...');

      // 1. Fix PaymentSchedule status column
      console.log('Checking payment_schedules table...');
      if (!(await columnExists('payment_schedules', 'status'))) {
        console.log('Adding status column to payment_schedules...');
        
        // Create enum type if it doesn't exist
        if (!(await enumTypeExists('enum_payment_schedules_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_payment_schedules_status" AS ENUM ('pending', 'paid', 'overdue');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('payment_schedules', 'status', {
          type: Sequelize.ENUM('pending', 'paid', 'overdue'),
          allowNull: false,
          defaultValue: 'pending'
        }, { transaction });
      }

      // 2. Fix Payment columns
      console.log('Checking payments table...');
      if (!(await columnExists('payments', 'payment_method'))) {
        console.log('Adding payment_method column to payments...');
        
        if (!(await enumTypeExists('enum_payments_payment_method'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_payments_payment_method" AS ENUM ('cash', 'card', 'upi', 'bank_transfer');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('payments', 'payment_method', {
          type: Sequelize.ENUM('cash', 'card', 'upi', 'bank_transfer'),
          allowNull: false,
          defaultValue: 'cash'
        }, { transaction });
      }

      if (!(await columnExists('payments', 'payment_type'))) {
        console.log('Adding payment_type column to payments...');
        
        if (!(await enumTypeExists('enum_payments_payment_type'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_payments_payment_type" AS ENUM ('booking', 'monthly_rent', 'security_deposit');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('payments', 'payment_type', {
          type: Sequelize.ENUM('booking', 'monthly_rent', 'security_deposit'),
          allowNull: false,
          defaultValue: 'booking'
        }, { transaction });
      }

      if (!(await columnExists('payments', 'status'))) {
        console.log('Adding status column to payments...');
        
        if (!(await enumTypeExists('enum_payments_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_payments_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('payments', 'status', {
          type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
          allowNull: false,
          defaultValue: 'completed'
        }, { transaction });
      }

      // 3. Fix SecurityDeposit columns
      console.log('Checking security_deposits table...');
      if (!(await columnExists('security_deposits', 'payment_method'))) {
        console.log('Adding payment_method column to security_deposits...');
        
        if (!(await enumTypeExists('enum_security_deposits_payment_method'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_security_deposits_payment_method" AS ENUM ('cash', 'card', 'upi', 'bank_transfer');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('security_deposits', 'payment_method', {
          type: Sequelize.ENUM('cash', 'card', 'upi', 'bank_transfer'),
          allowNull: false,
          defaultValue: 'cash'
        }, { transaction });
      }

      if (!(await columnExists('security_deposits', 'status'))) {
        console.log('Adding status column to security_deposits...');
        
        if (!(await enumTypeExists('enum_security_deposits_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_security_deposits_status" AS ENUM ('collected', 'refunded', 'partially_refunded');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('security_deposits', 'status', {
          type: Sequelize.ENUM('collected', 'refunded', 'partially_refunded'),
          allowNull: false,
          defaultValue: 'collected'
        }, { transaction });
      }

      // 4. Fix MaintenanceRequest columns
      console.log('Checking maintenance_requests table...');
      if (!(await columnExists('maintenance_requests', 'priority'))) {
        console.log('Adding priority column to maintenance_requests...');
        
        if (!(await enumTypeExists('enum_maintenance_requests_priority'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_maintenance_requests_priority" AS ENUM ('low', 'medium', 'high', 'urgent');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('maintenance_requests', 'priority', {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          allowNull: false,
          defaultValue: 'medium'
        }, { transaction });
      }

      if (!(await columnExists('maintenance_requests', 'status'))) {
        console.log('Adding status column to maintenance_requests...');
        
        if (!(await enumTypeExists('enum_maintenance_requests_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_maintenance_requests_status" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('maintenance_requests', 'status', {
          type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending'
        }, { transaction });
      }

      // 5. Fix Booking columns
      console.log('Checking bookings table...');
      if (!(await columnExists('bookings', 'booking_source'))) {
        console.log('Adding booking_source column to bookings...');
        
        if (!(await enumTypeExists('enum_bookings_booking_source'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_bookings_booking_source" AS ENUM ('online', 'offline');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('bookings', 'booking_source', {
          type: Sequelize.ENUM('online', 'offline'),
          allowNull: true,
          defaultValue: 'online'
        }, { transaction });
      }

      // 6. Fix Room columns
      console.log('Checking rooms table...');
      if (!(await columnExists('rooms', 'sharing_type'))) {
        console.log('Adding sharing_type column to rooms...');
        
        if (!(await enumTypeExists('enum_rooms_sharing_type'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_rooms_sharing_type" AS ENUM ('single', '2_sharing', '3_sharing');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('rooms', 'sharing_type', {
          type: Sequelize.ENUM('single', '2_sharing', '3_sharing'),
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('rooms', 'current_status'))) {
        console.log('Adding current_status column to rooms...');
        
        if (!(await enumTypeExists('enum_rooms_current_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_rooms_current_status" AS ENUM ('occupied', 'vacant_clean', 'vacant_dirty');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('rooms', 'current_status', {
          type: Sequelize.ENUM('occupied', 'vacant_clean', 'vacant_dirty'),
          allowNull: true,
          defaultValue: 'vacant_clean'
        }, { transaction });
      }

      // 7. Fix User columns
      console.log('Checking users table...');
      if (!(await columnExists('users', 'staff_role'))) {
        console.log('Adding staff_role column to users...');
        
        if (!(await enumTypeExists('enum_users_staff_role'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_users_staff_role" AS ENUM ('front_desk', 'housekeeping', 'maintenance', 'manager');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('users', 'staff_role', {
          type: Sequelize.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
          allowNull: true
        }, { transaction });
      }

      // 8. Fix Lead columns
      console.log('Checking leads table...');
      if (!(await columnExists('leads', 'property_type'))) {
        console.log('Adding property_type column to leads...');
        
        if (!(await enumTypeExists('enum_leads_property_type'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_leads_property_type" AS ENUM ('hotel', 'pg');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('leads', 'property_type', {
          type: Sequelize.ENUM('hotel', 'pg'),
          allowNull: false,
          defaultValue: 'hotel'
        }, { transaction });
      }

      if (!(await columnExists('leads', 'status'))) {
        console.log('Adding status column to leads...');
        
        if (!(await enumTypeExists('enum_leads_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_leads_status" AS ENUM ('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('leads', 'status', {
          type: Sequelize.ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
          allowNull: false,
          defaultValue: 'contacted'
        }, { transaction });
      }

      // 9. Fix SupportTicket columns
      console.log('Checking support_tickets table...');
      if (!(await columnExists('support_tickets', 'category'))) {
        console.log('Adding category column to support_tickets...');
        
        if (!(await enumTypeExists('enum_support_tickets_category'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_support_tickets_category" AS ENUM ('technical', 'billing', 'operations', 'feature_request', 'other');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('support_tickets', 'category', {
          type: Sequelize.ENUM('technical', 'billing', 'operations', 'feature_request', 'other'),
          allowNull: false,
          defaultValue: 'other'
        }, { transaction });
      }

      if (!(await columnExists('support_tickets', 'priority'))) {
        console.log('Adding priority column to support_tickets...');
        
        if (!(await enumTypeExists('enum_support_tickets_priority'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_support_tickets_priority" AS ENUM ('low', 'medium', 'high', 'urgent');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('support_tickets', 'priority', {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          allowNull: false,
          defaultValue: 'medium'
        }, { transaction });
      }

      if (!(await columnExists('support_tickets', 'status'))) {
        console.log('Adding status column to support_tickets...');
        
        if (!(await enumTypeExists('enum_support_tickets_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_support_tickets_status" AS ENUM ('new', 'in_progress', 'waiting_response', 'resolved', 'closed');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('support_tickets', 'status', {
          type: Sequelize.ENUM('new', 'in_progress', 'waiting_response', 'resolved', 'closed'),
          allowNull: false,
          defaultValue: 'new'
        }, { transaction });
      }

      // 10. Fix Commission columns
      console.log('Checking commissions table...');
      if (!(await columnExists('commissions', 'status'))) {
        console.log('Adding status column to commissions...');
        
        if (!(await enumTypeExists('enum_commissions_status'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_commissions_status" AS ENUM ('earned', 'pending_payment', 'paid', 'cancelled');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('commissions', 'status', {
          type: Sequelize.ENUM('earned', 'pending_payment', 'paid', 'cancelled'),
          allowNull: false,
          defaultValue: 'earned'
        }, { transaction });
      }

      // 11. Fix AgentTarget columns
      console.log('Checking agent_targets table...');
      if (!(await columnExists('agent_targets', 'period'))) {
        console.log('Adding period column to agent_targets...');
        
        if (!(await enumTypeExists('enum_agent_targets_period'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_agent_targets_period" AS ENUM ('monthly', 'quarterly', 'yearly');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('agent_targets', 'period', {
          type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
          allowNull: false,
          defaultValue: 'monthly'
        }, { transaction });
      }

      // 12. Fix LeadCommunication columns
      console.log('Checking lead_communications table...');
      if (!(await columnExists('lead_communications', 'type'))) {
        console.log('Adding type column to lead_communications...');
        
        if (!(await enumTypeExists('enum_lead_communications_type'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_lead_communications_type" AS ENUM ('call', 'email', 'meeting', 'note');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('lead_communications', 'type', {
          type: Sequelize.ENUM('call', 'email', 'meeting', 'note'),
          allowNull: false,
          defaultValue: 'note'
        }, { transaction });
      }

      // 13. Fix Announcement columns
      console.log('Checking announcements table...');
      if (!(await columnExists('announcements', 'target_audience'))) {
        console.log('Adding target_audience column to announcements...');
        
        if (!(await enumTypeExists('enum_announcements_target_audience'))) {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_announcements_target_audience" AS ENUM ('all_property_owners', 'specific_region', 'specific_property_type');`,
            { transaction }
          );
        }
        
        await queryInterface.addColumn('announcements', 'target_audience', {
          type: Sequelize.ENUM('all_property_owners', 'specific_region', 'specific_property_type'),
          allowNull: false,
          defaultValue: 'all_property_owners'
        }, { transaction });
      }

      // 14. Fix HousekeepingLog columns
      console.log('Checking housekeeping_logs table...');
      if (!(await columnExists('housekeeping_logs', 'time_taken'))) {
        console.log('Adding time_taken column to housekeeping_logs...');
        
        await queryInterface.addColumn('housekeeping_logs', 'time_taken', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      // 15. Fix Booking additional columns
      console.log('Checking bookings table for additional columns...');
      if (!(await columnExists('bookings', 'bed_id'))) {
        console.log('Adding bed_id column to bookings...');
        
        await queryInterface.addColumn('bookings', 'bed_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'bed_assignments',
            key: 'id'
          }
        }, { transaction });
      }

      if (!(await columnExists('bookings', 'actual_check_in_time'))) {
        console.log('Adding actual_check_in_time column to bookings...');
        
        await queryInterface.addColumn('bookings', 'actual_check_in_time', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('bookings', 'actual_check_out_time'))) {
        console.log('Adding actual_check_out_time column to bookings...');
        
        await queryInterface.addColumn('bookings', 'actual_check_out_time', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('bookings', 'security_deposit_id'))) {
        console.log('Adding security_deposit_id column to bookings...');
        
        await queryInterface.addColumn('bookings', 'security_deposit_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'security_deposits',
            key: 'id'
          }
        }, { transaction });
      }

      if (!(await columnExists('bookings', 'checked_in_by'))) {
        console.log('Adding checked_in_by column to bookings...');
        
        await queryInterface.addColumn('bookings', 'checked_in_by', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        }, { transaction });
      }

      if (!(await columnExists('bookings', 'checked_out_by'))) {
        console.log('Adding checked_out_by column to bookings...');
        
        await queryInterface.addColumn('bookings', 'checked_out_by', {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        }, { transaction });
      }

      // 16. Fix Room additional columns
      console.log('Checking rooms table for additional columns...');
      if (!(await columnExists('rooms', 'floor_number'))) {
        console.log('Adding floor_number column to rooms...');
        
        await queryInterface.addColumn('rooms', 'floor_number', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('rooms', 'room_number'))) {
        console.log('Adding room_number column to rooms...');
        
        await queryInterface.addColumn('rooms', 'room_number', {
          type: Sequelize.STRING,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('rooms', 'total_beds'))) {
        console.log('Adding total_beds column to rooms...');
        
        await queryInterface.addColumn('rooms', 'total_beds', {
          type: Sequelize.INTEGER,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('rooms', 'last_cleaned_at'))) {
        console.log('Adding last_cleaned_at column to rooms...');
        
        await queryInterface.addColumn('rooms', 'last_cleaned_at', {
          type: Sequelize.DATE,
          allowNull: true
        }, { transaction });
      }

      if (!(await columnExists('rooms', 'last_maintenance_at'))) {
        console.log('Adding last_maintenance_at column to rooms...');
        
        await queryInterface.addColumn('rooms', 'last_maintenance_at', {
          type: Sequelize.DATE,
          allowNull: true
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
      // Remove columns in reverse order
      
      // Room additional columns
      await queryInterface.removeColumn('rooms', 'last_maintenance_at', { transaction });
      await queryInterface.removeColumn('rooms', 'last_cleaned_at', { transaction });
      await queryInterface.removeColumn('rooms', 'total_beds', { transaction });
      await queryInterface.removeColumn('rooms', 'room_number', { transaction });
      await queryInterface.removeColumn('rooms', 'floor_number', { transaction });
      
      // Booking additional columns
      await queryInterface.removeColumn('bookings', 'checked_out_by', { transaction });
      await queryInterface.removeColumn('bookings', 'checked_in_by', { transaction });
      await queryInterface.removeColumn('bookings', 'security_deposit_id', { transaction });
      await queryInterface.removeColumn('bookings', 'actual_check_out_time', { transaction });
      await queryInterface.removeColumn('bookings', 'actual_check_in_time', { transaction });
      await queryInterface.removeColumn('bookings', 'bed_id', { transaction });
      
      // HousekeepingLog columns
      await queryInterface.removeColumn('housekeeping_logs', 'time_taken', { transaction });
      
      // Announcement columns
      await queryInterface.removeColumn('announcements', 'target_audience', { transaction });
      
      // LeadCommunication columns
      await queryInterface.removeColumn('lead_communications', 'type', { transaction });
      
      // AgentTarget columns
      await queryInterface.removeColumn('agent_targets', 'period', { transaction });
      
      // Commission columns
      await queryInterface.removeColumn('commissions', 'status', { transaction });
      
      // SupportTicket columns
      await queryInterface.removeColumn('support_tickets', 'status', { transaction });
      await queryInterface.removeColumn('support_tickets', 'priority', { transaction });
      await queryInterface.removeColumn('support_tickets', 'category', { transaction });
      
      // Lead columns
      await queryInterface.removeColumn('leads', 'status', { transaction });
      await queryInterface.removeColumn('leads', 'property_type', { transaction });
      
      // User columns
      await queryInterface.removeColumn('users', 'staff_role', { transaction });
      
      // Room columns
      await queryInterface.removeColumn('rooms', 'current_status', { transaction });
      await queryInterface.removeColumn('rooms', 'sharing_type', { transaction });
      
      // Booking columns
      await queryInterface.removeColumn('bookings', 'booking_source', { transaction });
      
      // MaintenanceRequest columns
      await queryInterface.removeColumn('maintenance_requests', 'status', { transaction });
      await queryInterface.removeColumn('maintenance_requests', 'priority', { transaction });
      
      // SecurityDeposit columns
      await queryInterface.removeColumn('security_deposits', 'status', { transaction });
      await queryInterface.removeColumn('security_deposits', 'payment_method', { transaction });
      
      // Payment columns
      await queryInterface.removeColumn('payments', 'status', { transaction });
      await queryInterface.removeColumn('payments', 'payment_type', { transaction });
      await queryInterface.removeColumn('payments', 'payment_method', { transaction });
      
      // PaymentSchedule columns
      await queryInterface.removeColumn('payment_schedules', 'status', { transaction });

      // Drop enum types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payment_schedules_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_payment_method";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_payment_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_security_deposits_payment_method";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_security_deposits_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_requests_priority";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_requests_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_booking_source";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_rooms_sharing_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_rooms_current_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_staff_role";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leads_property_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_leads_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_support_tickets_category";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_support_tickets_priority";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_support_tickets_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_commissions_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_agent_targets_period";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lead_communications_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_announcements_target_audience";', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
