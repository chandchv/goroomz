/**
 * Integration Tests for Commission Lifecycle
 * Tests flow: onboarding → commission earned → payment → paid
 * 
 * Validates Requirements: 1.4, 17.2, 17.3
 */

const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false
});

// Define models for testing
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  role: { type: DataTypes.ENUM('customer', 'owner', 'admin', 'staff'), defaultValue: 'customer' },
  phoneNumber: { type: DataTypes.STRING },
  internalRole: { 
    type: DataTypes.ENUM('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'),
    allowNull: true
  },
  commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10.00 }
});

const Lead = sequelize.define('Lead', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  propertyOwnerName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  businessName: { type: DataTypes.STRING },
  propertyType: { type: DataTypes.ENUM('hotel', 'pg'), allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  state: { type: DataTypes.STRING, allowNull: false },
  status: { 
    type: DataTypes.ENUM('contacted', 'in_progress', 'pending_approval', 'approved', 'rejected', 'lost'),
    defaultValue: 'contacted'
  },
  agentId: { type: DataTypes.UUID, allowNull: false },
  approvedAt: { type: DataTypes.DATE },
  approvedBy: { type: DataTypes.UUID }
});

const Commission = sequelize.define('Commission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  agentId: { type: DataTypes.UUID, allowNull: false },
  leadId: { type: DataTypes.UUID },
  propertyId: { type: DataTypes.UUID },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  status: { 
    type: DataTypes.ENUM('earned', 'pending_payment', 'paid', 'cancelled'),
    defaultValue: 'earned'
  },
  earnedDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  paymentDate: { type: DataTypes.DATEONLY },
  paymentMethod: { type: DataTypes.STRING },
  transactionReference: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT }
});

describe('Commission Lifecycle Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Complete Commission Flow: onboarding → earned → payment → paid', () => {
    let agent, regionalManager, lead, propertyOwner;

    beforeEach(async () => {
      // Clean up
      await Commission.destroy({ where: {}, truncate: true });
      await Lead.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      // Create agent with commission rate
      agent = await User.create({
        name: 'Commission Test Agent',
        email: 'agent@commission.com',
        role: 'staff',
        phoneNumber: '1234567890',
        internalRole: 'agent',
        commissionRate: 10.00
      });

      // Create regional manager
      regionalManager = await User.create({
        name: 'Commission Test RM',
        email: 'rm@commission.com',
        role: 'staff',
        phoneNumber: '9876543210',
        internalRole: 'regional_manager'
      });
    });

    test('Commission earned when property onboarding is approved', async () => {
      // Step 1: Create and approve lead
      lead = await Lead.create({
        propertyOwnerName: 'Property Owner 1',
        email: 'owner1@property.com',
        phone: '+919876543210',
        businessName: 'Owner 1 Hotels',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'approved',
        agentId: agent.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      // Step 2: Create property owner account
      propertyOwner = await User.create({
        name: lead.propertyOwnerName,
        email: lead.email,
        role: 'owner',
        phoneNumber: lead.phone
      });

      // Step 3: System generates commission
      const baseAmount = 50000; // Base commission amount
      const commissionAmount = baseAmount * (parseFloat(agent.commissionRate) / 100);

      const commission = await Commission.create({
        agentId: agent.id,
        leadId: lead.id,
        propertyId: propertyOwner.id,
        amount: commissionAmount,
        rate: agent.commissionRate,
        status: 'earned',
        earnedDate: new Date()
      });

      // Verify commission created
      expect(commission.agentId).toBe(agent.id);
      expect(commission.leadId).toBe(lead.id);
      expect(commission.propertyId).toBe(propertyOwner.id);
      expect(parseFloat(commission.amount)).toBe(5000);
      expect(parseFloat(commission.rate)).toBe(10);
      expect(commission.status).toBe('earned');
      expect(commission.earnedDate).toBeDefined();

      // Verify agent attribution (without associations, just verify the agentId)
      expect(commission.agentId).toBe(agent.id);
    });

    test('Commission moves from earned to pending_payment', async () => {
      // Create approved lead
      lead = await Lead.create({
        propertyOwnerName: 'Property Owner 2',
        email: 'owner2@property.com',
        phone: '+919876543211',
        businessName: 'Owner 2 PG',
        propertyType: 'pg',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'approved',
        agentId: agent.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      propertyOwner = await User.create({
        name: lead.propertyOwnerName,
        email: lead.email,
        role: 'owner',
        phoneNumber: lead.phone
      });

      // Create commission
      const commission = await Commission.create({
        agentId: agent.id,
        leadId: lead.id,
        propertyId: propertyOwner.id,
        amount: 3000.00,
        rate: 10.00,
        status: 'earned',
        earnedDate: new Date()
      });

      expect(commission.status).toBe('earned');

      // Move to pending_payment (e.g., after payment cycle starts)
      await commission.update({ status: 'pending_payment' });
      await commission.reload();

      expect(commission.status).toBe('pending_payment');
      expect(commission.paymentDate).toBeNull();
      expect(commission.paymentMethod).toBeNull();
    });

    test('Commission payment recording with transaction details', async () => {
      // Create approved lead and commission
      lead = await Lead.create({
        propertyOwnerName: 'Property Owner 3',
        email: 'owner3@property.com',
        phone: '+919876543212',
        businessName: 'Owner 3 Hotels',
        propertyType: 'hotel',
        city: 'Bangalore',
        state: 'Karnataka',
        status: 'approved',
        agentId: agent.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      propertyOwner = await User.create({
        name: lead.propertyOwnerName,
        email: lead.email,
        role: 'owner',
        phoneNumber: lead.phone
      });

      const commission = await Commission.create({
        agentId: agent.id,
        leadId: lead.id,
        propertyId: propertyOwner.id,
        amount: 7500.00,
        rate: 15.00,
        status: 'pending_payment',
        earnedDate: new Date()
      });

      // Record payment
      const paymentDate = new Date();
      const paymentMethod = 'bank_transfer';
      const transactionRef = 'TXN-2024-001234';

      await commission.update({
        status: 'paid',
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        transactionReference: transactionRef,
        notes: 'Payment processed successfully'
      });

      await commission.reload();

      // Verify payment recorded
      expect(commission.status).toBe('paid');
      expect(commission.paymentDate).toBeDefined();
      expect(commission.paymentMethod).toBe(paymentMethod);
      expect(commission.transactionReference).toBe(transactionRef);
      expect(commission.notes).toBe('Payment processed successfully');

      // Verify all required payment fields are present
      expect(commission.paymentDate).not.toBeNull();
      expect(commission.paymentMethod).not.toBeNull();
      expect(commission.transactionReference).not.toBeNull();
    });

    test('Multiple commissions for same agent', async () => {
      // Create multiple leads and commissions
      const leads = [];
      const commissions = [];

      for (let i = 0; i < 3; i++) {
        const lead = await Lead.create({
          propertyOwnerName: `Property Owner ${i + 4}`,
          email: `owner${i + 4}@property.com`,
          phone: `+91987654321${i + 3}`,
          businessName: `Owner ${i + 4} Hotels`,
          propertyType: i % 2 === 0 ? 'hotel' : 'pg',
          city: 'Delhi',
          state: 'Delhi',
          status: 'approved',
          agentId: agent.id,
          approvedAt: new Date(),
          approvedBy: regionalManager.id
        });
        leads.push(lead);

        const owner = await User.create({
          name: lead.propertyOwnerName,
          email: lead.email,
          role: 'owner',
          phoneNumber: lead.phone
        });

        const commission = await Commission.create({
          agentId: agent.id,
          leadId: lead.id,
          propertyId: owner.id,
          amount: (i + 1) * 1000,
          rate: 10.00,
          status: 'earned',
          earnedDate: new Date()
        });
        commissions.push(commission);
      }

      // Verify all commissions created
      const agentCommissions = await Commission.findAll({
        where: { agentId: agent.id }
      });

      expect(agentCommissions.length).toBe(3);

      // Calculate total commission
      const totalCommission = agentCommissions.reduce(
        (sum, comm) => sum + parseFloat(comm.amount),
        0
      );
      expect(totalCommission).toBe(6000); // 1000 + 2000 + 3000

      // Pay first commission
      await commissions[0].update({
        status: 'paid',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        transactionReference: 'TXN-001'
      });

      // Check commission statuses
      const paidCommissions = await Commission.findAll({
        where: { agentId: agent.id, status: 'paid' }
      });
      const earnedCommissions = await Commission.findAll({
        where: { agentId: agent.id, status: 'earned' }
      });

      expect(paidCommissions.length).toBe(1);
      expect(earnedCommissions.length).toBe(2);
    });

    test('Commission calculation with different rates', async () => {
      // Create agents with different commission rates
      const agent1 = await User.create({
        name: 'Agent 1',
        email: 'agent1@test.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 10.00
      });

      const agent2 = await User.create({
        name: 'Agent 2',
        email: 'agent2@test.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 15.00
      });

      const agent3 = await User.create({
        name: 'Agent 3',
        email: 'agent3@test.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 12.50
      });

      // Create leads for each agent
      const baseAmount = 10000;

      const lead1 = await Lead.create({
        propertyOwnerName: 'Owner A',
        email: 'ownera@property.com',
        phone: '+919876543220',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'approved',
        agentId: agent1.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      const lead2 = await Lead.create({
        propertyOwnerName: 'Owner B',
        email: 'ownerb@property.com',
        phone: '+919876543221',
        propertyType: 'pg',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'approved',
        agentId: agent2.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      const lead3 = await Lead.create({
        propertyOwnerName: 'Owner C',
        email: 'ownerc@property.com',
        phone: '+919876543222',
        propertyType: 'hotel',
        city: 'Bangalore',
        state: 'Karnataka',
        status: 'approved',
        agentId: agent3.id,
        approvedAt: new Date(),
        approvedBy: regionalManager.id
      });

      // Create commissions with different rates
      const comm1 = await Commission.create({
        agentId: agent1.id,
        leadId: lead1.id,
        amount: baseAmount * 0.10,
        rate: 10.00,
        status: 'earned'
      });

      const comm2 = await Commission.create({
        agentId: agent2.id,
        leadId: lead2.id,
        amount: baseAmount * 0.15,
        rate: 15.00,
        status: 'earned'
      });

      const comm3 = await Commission.create({
        agentId: agent3.id,
        leadId: lead3.id,
        amount: baseAmount * 0.125,
        rate: 12.50,
        status: 'earned'
      });

      // Verify commission amounts
      expect(parseFloat(comm1.amount)).toBe(1000);
      expect(parseFloat(comm2.amount)).toBe(1500);
      expect(parseFloat(comm3.amount)).toBe(1250);

      // Verify rates preserved
      expect(parseFloat(comm1.rate)).toBe(10);
      expect(parseFloat(comm2.rate)).toBe(15);
      expect(parseFloat(comm3.rate)).toBe(12.5);
    });
  });

  describe('Commission Status Transitions', () => {
    let agent, lead, commission;

    beforeEach(async () => {
      await Commission.destroy({ where: {}, truncate: true });
      await Lead.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      agent = await User.create({
        name: 'Status Test Agent',
        email: 'agent@status.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 10.00
      });

      lead = await Lead.create({
        propertyOwnerName: 'Status Test Owner',
        email: 'owner@status.com',
        phone: '+919876543230',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'approved',
        agentId: agent.id,
        approvedAt: new Date()
      });

      commission = await Commission.create({
        agentId: agent.id,
        leadId: lead.id,
        amount: 5000.00,
        rate: 10.00,
        status: 'earned',
        earnedDate: new Date()
      });
    });

    test('Valid status transitions', async () => {
      // earned → pending_payment
      await commission.update({ status: 'pending_payment' });
      await commission.reload();
      expect(commission.status).toBe('pending_payment');

      // pending_payment → paid
      await commission.update({
        status: 'paid',
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer',
        transactionReference: 'TXN-123'
      });
      await commission.reload();
      expect(commission.status).toBe('paid');
    });

    test('Commission cancellation', async () => {
      // Cancel commission (e.g., if property owner cancels)
      await commission.update({
        status: 'cancelled',
        notes: 'Property owner cancelled subscription'
      });

      await commission.reload();
      expect(commission.status).toBe('cancelled');
      expect(commission.notes).toContain('cancelled');
    });

    test('Bulk payment processing', async () => {
      // Create multiple pending commissions
      const commissions = [];
      
      for (let i = 0; i < 5; i++) {
        const comm = await Commission.create({
          agentId: agent.id,
          leadId: lead.id,
          amount: 1000 * (i + 1),
          rate: 10.00,
          status: 'pending_payment',
          earnedDate: new Date()
        });
        commissions.push(comm);
      }

      // Process bulk payment
      const paymentDate = new Date();
      const paymentMethod = 'bank_transfer';
      const batchRef = 'BATCH-2024-001';

      for (const comm of commissions) {
        await comm.update({
          status: 'paid',
          paymentDate: paymentDate,
          paymentMethod: paymentMethod,
          transactionReference: `${batchRef}-${comm.id.substring(0, 8)}`
        });
      }

      // Verify all paid
      const paidCommissions = await Commission.findAll({
        where: { agentId: agent.id, status: 'paid' }
      });

      expect(paidCommissions.length).toBe(5); // 5 new commissions marked as paid
      
      // Verify all have payment details
      paidCommissions.forEach(comm => {
        expect(comm.paymentDate).toBeDefined();
        expect(comm.paymentMethod).toBe(paymentMethod);
        expect(comm.transactionReference).toContain(batchRef);
      });
    });
  });

  describe('Commission Reporting and Aggregation', () => {
    let agent1, agent2, regionalManager;

    beforeEach(async () => {
      await Commission.destroy({ where: {}, truncate: true });
      await Lead.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      agent1 = await User.create({
        name: 'Report Agent 1',
        email: 'agent1@report.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 10.00
      });

      agent2 = await User.create({
        name: 'Report Agent 2',
        email: 'agent2@report.com',
        role: 'staff',
        internalRole: 'agent',
        commissionRate: 12.00
      });

      regionalManager = await User.create({
        name: 'Report RM',
        email: 'rm@report.com',
        role: 'staff',
        internalRole: 'regional_manager'
      });
    });

    test('Agent commission summary by status', async () => {
      // Create commissions with different statuses
      await Commission.create({
        agentId: agent1.id,
        amount: 1000,
        rate: 10,
        status: 'earned',
        earnedDate: new Date()
      });

      await Commission.create({
        agentId: agent1.id,
        amount: 2000,
        rate: 10,
        status: 'earned',
        earnedDate: new Date()
      });

      await Commission.create({
        agentId: agent1.id,
        amount: 1500,
        rate: 10,
        status: 'pending_payment',
        earnedDate: new Date()
      });

      await Commission.create({
        agentId: agent1.id,
        amount: 3000,
        rate: 10,
        status: 'paid',
        earnedDate: new Date(),
        paymentDate: new Date(),
        paymentMethod: 'bank_transfer'
      });

      // Get summary
      const earned = await Commission.findAll({
        where: { agentId: agent1.id, status: 'earned' }
      });
      const pending = await Commission.findAll({
        where: { agentId: agent1.id, status: 'pending_payment' }
      });
      const paid = await Commission.findAll({
        where: { agentId: agent1.id, status: 'paid' }
      });

      const earnedTotal = earned.reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const pendingTotal = pending.reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const paidTotal = paid.reduce((sum, c) => sum + parseFloat(c.amount), 0);

      expect(earnedTotal).toBe(3000);
      expect(pendingTotal).toBe(1500);
      expect(paidTotal).toBe(3000);

      const totalCommission = earnedTotal + pendingTotal + paidTotal;
      expect(totalCommission).toBe(7500);
    });

    test('Commission comparison between agents', async () => {
      // Create commissions for both agents
      await Commission.create({
        agentId: agent1.id,
        amount: 5000,
        rate: 10,
        status: 'paid',
        earnedDate: new Date(),
        paymentDate: new Date()
      });

      await Commission.create({
        agentId: agent1.id,
        amount: 3000,
        rate: 10,
        status: 'earned',
        earnedDate: new Date()
      });

      await Commission.create({
        agentId: agent2.id,
        amount: 7000,
        rate: 12,
        status: 'paid',
        earnedDate: new Date(),
        paymentDate: new Date()
      });

      await Commission.create({
        agentId: agent2.id,
        amount: 2000,
        rate: 12,
        status: 'earned',
        earnedDate: new Date()
      });

      // Get totals for each agent
      const agent1Commissions = await Commission.findAll({
        where: { agentId: agent1.id }
      });
      const agent2Commissions = await Commission.findAll({
        where: { agentId: agent2.id }
      });

      const agent1Total = agent1Commissions.reduce(
        (sum, c) => sum + parseFloat(c.amount),
        0
      );
      const agent2Total = agent2Commissions.reduce(
        (sum, c) => sum + parseFloat(c.amount),
        0
      );

      expect(agent1Total).toBe(8000);
      expect(agent2Total).toBe(9000);

      // Agent 2 has higher total
      expect(agent2Total).toBeGreaterThan(agent1Total);
    });
  });
});
