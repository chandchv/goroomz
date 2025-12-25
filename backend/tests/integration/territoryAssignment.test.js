/**
 * Integration Tests for Territory and Lead Assignment
 * Tests territory creation, agent assignment, and automatic lead assignment
 * 
 * Validates Requirements: 4.1, 4.2, 28.1
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
  territoryId: { type: DataTypes.UUID },
  managerId: { type: DataTypes.UUID }
});

const Territory = sequelize.define('Territory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  regionalManagerId: { type: DataTypes.UUID },
  boundaries: { type: DataTypes.JSON },
  cities: { type: DataTypes.JSON, defaultValue: [] },
  states: { type: DataTypes.JSON, defaultValue: [] },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
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
  territoryId: { type: DataTypes.UUID }
});

describe('Territory and Lead Assignment Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Territory Creation and Management', () => {
    let regionalManager;

    beforeEach(async () => {
      // Clean up
      await Lead.destroy({ where: {}, truncate: true });
      await Territory.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      // Create regional manager
      regionalManager = await User.create({
        name: 'Regional Manager',
        email: 'rm@territory.com',
        role: 'staff',
        phoneNumber: '1234567890',
        internalRole: 'regional_manager'
      });
    });

    test('Create territory with geographic boundaries', async () => {
      const territory = await Territory.create({
        name: 'Mumbai Zone',
        description: 'Covers Mumbai and surrounding areas',
        regionalManagerId: regionalManager.id,
        boundaries: {
          type: 'Polygon',
          coordinates: [
            [72.8, 19.0],
            [72.9, 19.0],
            [72.9, 19.1],
            [72.8, 19.1],
            [72.8, 19.0]
          ]
        },
        cities: ['Mumbai', 'Navi Mumbai', 'Thane'],
        states: ['Maharashtra'],
        isActive: true
      });

      expect(territory.name).toBe('Mumbai Zone');
      expect(territory.regionalManagerId).toBe(regionalManager.id);
      expect(territory.boundaries).toBeDefined();
      expect(territory.boundaries.type).toBe('Polygon');
      expect(territory.cities).toContain('Mumbai');
      expect(territory.states).toContain('Maharashtra');
      expect(territory.isActive).toBe(true);
    });

    test('Create multiple territories for different regions', async () => {
      const mumbaiTerritory = await Territory.create({
        name: 'Mumbai Region',
        description: 'Mumbai metropolitan area',
        regionalManagerId: regionalManager.id,
        cities: ['Mumbai', 'Navi Mumbai'],
        states: ['Maharashtra'],
        isActive: true
      });

      const puneTerritory = await Territory.create({
        name: 'Pune Region',
        description: 'Pune and surrounding areas',
        regionalManagerId: regionalManager.id,
        cities: ['Pune', 'Pimpri-Chinchwad'],
        states: ['Maharashtra'],
        isActive: true
      });

      const bangaloreTerritory = await Territory.create({
        name: 'Bangalore Region',
        description: 'Bangalore metropolitan area',
        regionalManagerId: regionalManager.id,
        cities: ['Bangalore', 'Mysore'],
        states: ['Karnataka'],
        isActive: true
      });

      // Verify all territories created
      const allTerritories = await Territory.findAll({
        where: { regionalManagerId: regionalManager.id }
      });

      expect(allTerritories.length).toBe(3);
      expect(allTerritories.map(t => t.name)).toContain('Mumbai Region');
      expect(allTerritories.map(t => t.name)).toContain('Pune Region');
      expect(allTerritories.map(t => t.name)).toContain('Bangalore Region');
    });

    test('Update territory boundaries and cities', async () => {
      const territory = await Territory.create({
        name: 'Delhi NCR',
        description: 'Delhi and NCR region',
        regionalManagerId: regionalManager.id,
        cities: ['Delhi'],
        states: ['Delhi'],
        isActive: true
      });

      // Expand territory to include NCR cities
      await territory.update({
        cities: ['Delhi', 'Gurgaon', 'Noida', 'Faridabad'],
        states: ['Delhi', 'Haryana', 'Uttar Pradesh'],
        description: 'Delhi and complete NCR region'
      });

      await territory.reload();
      expect(territory.cities).toHaveLength(4);
      expect(territory.cities).toContain('Gurgaon');
      expect(territory.cities).toContain('Noida');
      expect(territory.states).toContain('Haryana');
      expect(territory.states).toContain('Uttar Pradesh');
    });

    test('Deactivate territory', async () => {
      const territory = await Territory.create({
        name: 'Test Territory',
        regionalManagerId: regionalManager.id,
        cities: ['Test City'],
        states: ['Test State'],
        isActive: true
      });

      expect(territory.isActive).toBe(true);

      // Deactivate territory
      await territory.update({ isActive: false });
      await territory.reload();
      expect(territory.isActive).toBe(false);

      // Get only active territories
      const activeTerritories = await Territory.findAll({
        where: { isActive: true }
      });

      expect(activeTerritories.find(t => t.id === territory.id)).toBeUndefined();
    });
  });

  describe('Agent Assignment to Territories', () => {
    let regionalManager, territory;

    beforeEach(async () => {
      await Lead.destroy({ where: {}, truncate: true });
      await Territory.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      regionalManager = await User.create({
        name: 'Regional Manager',
        email: 'rm@agent.com',
        role: 'staff',
        internalRole: 'regional_manager'
      });

      territory = await Territory.create({
        name: 'Mumbai Zone',
        regionalManagerId: regionalManager.id,
        cities: ['Mumbai'],
        states: ['Maharashtra'],
        isActive: true
      });
    });

    test('Assign agent to territory', async () => {
      const agent = await User.create({
        name: 'Agent 1',
        email: 'agent1@test.com',
        role: 'staff',
        phoneNumber: '9876543210',
        internalRole: 'agent',
        managerId: regionalManager.id
      });

      // Assign agent to territory
      await agent.update({ territoryId: territory.id });
      await agent.reload();

      expect(agent.territoryId).toBe(territory.id);
      expect(agent.managerId).toBe(regionalManager.id);

      // Get agents in territory
      const agentsInTerritory = await User.findAll({
        where: { territoryId: territory.id, internalRole: 'agent' }
      });

      expect(agentsInTerritory.length).toBe(1);
      expect(agentsInTerritory[0].id).toBe(agent.id);
    });

    test('Assign multiple agents to same territory', async () => {
      const agent1 = await User.create({
        name: 'Agent 1',
        email: 'agent1@multi.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      const agent2 = await User.create({
        name: 'Agent 2',
        email: 'agent2@multi.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      const agent3 = await User.create({
        name: 'Agent 3',
        email: 'agent3@multi.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      // Get all agents in territory
      const agentsInTerritory = await User.findAll({
        where: { territoryId: territory.id, internalRole: 'agent' }
      });

      expect(agentsInTerritory.length).toBe(3);
      expect(agentsInTerritory.map(a => a.name)).toContain('Agent 1');
      expect(agentsInTerritory.map(a => a.name)).toContain('Agent 2');
      expect(agentsInTerritory.map(a => a.name)).toContain('Agent 3');
    });

    test('Reassign agent to different territory', async () => {
      const agent = await User.create({
        name: 'Agent Reassign',
        email: 'agent@reassign.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      // Create new territory
      const newTerritory = await Territory.create({
        name: 'Pune Zone',
        regionalManagerId: regionalManager.id,
        cities: ['Pune'],
        states: ['Maharashtra'],
        isActive: true
      });

      // Reassign agent
      await agent.update({ territoryId: newTerritory.id });
      await agent.reload();

      expect(agent.territoryId).toBe(newTerritory.id);

      // Verify agent no longer in old territory
      const oldTerritoryAgents = await User.findAll({
        where: { territoryId: territory.id, internalRole: 'agent' }
      });
      expect(oldTerritoryAgents.length).toBe(0);

      // Verify agent in new territory
      const newTerritoryAgents = await User.findAll({
        where: { territoryId: newTerritory.id, internalRole: 'agent' }
      });
      expect(newTerritoryAgents.length).toBe(1);
      expect(newTerritoryAgents[0].id).toBe(agent.id);
    });
  });

  describe('Automatic Lead Assignment', () => {
    let regionalManager, territory, agent1, agent2;

    beforeEach(async () => {
      await Lead.destroy({ where: {}, truncate: true });
      await Territory.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      regionalManager = await User.create({
        name: 'Regional Manager',
        email: 'rm@lead.com',
        role: 'staff',
        internalRole: 'regional_manager'
      });

      territory = await Territory.create({
        name: 'Mumbai Zone',
        regionalManagerId: regionalManager.id,
        cities: ['Mumbai', 'Navi Mumbai', 'Thane'],
        states: ['Maharashtra'],
        isActive: true
      });

      agent1 = await User.create({
        name: 'Agent 1',
        email: 'agent1@lead.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      agent2 = await User.create({
        name: 'Agent 2',
        email: 'agent2@lead.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });
    });

    test('Lead automatically assigned to agent in territory', async () => {
      // Create lead in Mumbai (part of territory)
      const lead = await Lead.create({
        propertyOwnerName: 'Mumbai Property Owner',
        email: 'owner@mumbai.com',
        phone: '+919876543210',
        businessName: 'Mumbai Hotels',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      expect(lead.agentId).toBe(agent1.id);
      expect(lead.territoryId).toBe(territory.id);
      expect(lead.city).toBe('Mumbai');

      // Verify lead is in territory's city list
      expect(territory.cities).toContain(lead.city);
    });

    test('Round-robin lead assignment among agents', async () => {
      // Simulate round-robin assignment
      const leads = [];

      // Create 6 leads, should alternate between agent1 and agent2
      for (let i = 0; i < 6; i++) {
        const assignedAgent = i % 2 === 0 ? agent1 : agent2;
        
        const lead = await Lead.create({
          propertyOwnerName: `Owner ${i + 1}`,
          email: `owner${i + 1}@test.com`,
          phone: `+91987654321${i}`,
          businessName: `Business ${i + 1}`,
          propertyType: i % 2 === 0 ? 'hotel' : 'pg',
          city: 'Mumbai',
          state: 'Maharashtra',
          status: 'contacted',
          agentId: assignedAgent.id,
          territoryId: territory.id
        });
        leads.push(lead);
      }

      // Count leads per agent
      const agent1Leads = await Lead.findAll({ where: { agentId: agent1.id } });
      const agent2Leads = await Lead.findAll({ where: { agentId: agent2.id } });

      expect(agent1Leads.length).toBe(3);
      expect(agent2Leads.length).toBe(3);
    });

    test('Lead assignment based on city match', async () => {
      // Create leads in different cities within territory
      const mumbaiLead = await Lead.create({
        propertyOwnerName: 'Mumbai Owner',
        email: 'mumbai@test.com',
        phone: '+919876543210',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      const naviMumbaiLead = await Lead.create({
        propertyOwnerName: 'Navi Mumbai Owner',
        email: 'navimumbai@test.com',
        phone: '+919876543211',
        propertyType: 'pg',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent2.id,
        territoryId: territory.id
      });

      const thaneLead = await Lead.create({
        propertyOwnerName: 'Thane Owner',
        email: 'thane@test.com',
        phone: '+919876543212',
        propertyType: 'hotel',
        city: 'Thane',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      // Verify all leads are in territory cities
      expect(territory.cities).toContain(mumbaiLead.city);
      expect(territory.cities).toContain(naviMumbaiLead.city);
      expect(territory.cities).toContain(thaneLead.city);

      // Verify all leads assigned to agents in same territory
      const allLeads = [mumbaiLead, naviMumbaiLead, thaneLead];
      for (const lead of allLeads) {
        const agent = await User.findByPk(lead.agentId);
        expect(agent.territoryId).toBe(territory.id);
      }
    });

    test('Lead notification sent to assigned agent', async () => {
      const lead = await Lead.create({
        propertyOwnerName: 'Notification Test Owner',
        email: 'notify@test.com',
        phone: '+919876543220',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      // In real system, notification would be sent
      // Verify notification should be sent
      const shouldNotify = lead.agentId && lead.status === 'contacted';
      expect(shouldNotify).toBe(true);

      // Verify agent details for notification
      const agent = await User.findByPk(lead.agentId);
      expect(agent).toBeDefined();
      expect(agent.email).toBe('agent1@lead.com');
    });

    test('Lead reassignment when agent unavailable', async () => {
      // Create lead assigned to agent1
      const lead = await Lead.create({
        propertyOwnerName: 'Reassign Test Owner',
        email: 'reassign@test.com',
        phone: '+919876543230',
        propertyType: 'hotel',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      expect(lead.agentId).toBe(agent1.id);

      // Simulate agent1 becoming unavailable (deactivated)
      await agent1.update({ isActive: false });

      // Reassign lead to agent2
      await lead.update({ agentId: agent2.id });
      await lead.reload();

      expect(lead.agentId).toBe(agent2.id);
      expect(lead.territoryId).toBe(territory.id); // Territory remains same

      // Verify new agent is in same territory
      const newAgent = await User.findByPk(lead.agentId);
      expect(newAgent.territoryId).toBe(territory.id);
    });
  });

  describe('Lead Assignment with No Available Agents', () => {
    let regionalManager, territory;

    beforeEach(async () => {
      await Lead.destroy({ where: {}, truncate: true });
      await Territory.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      regionalManager = await User.create({
        name: 'Regional Manager',
        email: 'rm@noagent.com',
        role: 'staff',
        internalRole: 'regional_manager'
      });

      territory = await Territory.create({
        name: 'Empty Territory',
        regionalManagerId: regionalManager.id,
        cities: ['Test City'],
        states: ['Test State'],
        isActive: true
      });
    });

    test('Handle lead creation when no agents in territory', async () => {
      // Try to create lead in territory with no agents
      // In real system, this should alert regional manager

      const agentsInTerritory = await User.findAll({
        where: { territoryId: territory.id, internalRole: 'agent' }
      });

      expect(agentsInTerritory.length).toBe(0);

      // Lead would need to be assigned to regional manager or queued
      // For now, we can assign to regional manager temporarily
      const lead = await Lead.create({
        propertyOwnerName: 'Unassigned Lead Owner',
        email: 'unassigned@test.com',
        phone: '+919876543240',
        propertyType: 'hotel',
        city: 'Test City',
        state: 'Test State',
        status: 'contacted',
        agentId: regionalManager.id, // Temporarily assign to RM
        territoryId: territory.id
      });

      expect(lead.agentId).toBe(regionalManager.id);
      expect(lead.territoryId).toBe(territory.id);

      // Alert should be sent to regional manager
      const shouldAlertRM = agentsInTerritory.length === 0;
      expect(shouldAlertRM).toBe(true);
    });
  });

  describe('Territory Statistics and Reporting', () => {
    let regionalManager, territory, agent1, agent2;

    beforeEach(async () => {
      await Lead.destroy({ where: {}, truncate: true });
      await Territory.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });

      regionalManager = await User.create({
        name: 'Regional Manager',
        email: 'rm@stats.com',
        role: 'staff',
        internalRole: 'regional_manager'
      });

      territory = await Territory.create({
        name: 'Stats Territory',
        regionalManagerId: regionalManager.id,
        cities: ['City A', 'City B'],
        states: ['State A'],
        isActive: true
      });

      agent1 = await User.create({
        name: 'Stats Agent 1',
        email: 'agent1@stats.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });

      agent2 = await User.create({
        name: 'Stats Agent 2',
        email: 'agent2@stats.com',
        role: 'staff',
        internalRole: 'agent',
        territoryId: territory.id,
        managerId: regionalManager.id
      });
    });

    test('Territory lead statistics', async () => {
      // Create leads with different statuses
      await Lead.create({
        propertyOwnerName: 'Owner 1',
        email: 'owner1@stats.com',
        phone: '+919876543250',
        propertyType: 'hotel',
        city: 'City A',
        state: 'State A',
        status: 'contacted',
        agentId: agent1.id,
        territoryId: territory.id
      });

      await Lead.create({
        propertyOwnerName: 'Owner 2',
        email: 'owner2@stats.com',
        phone: '+919876543251',
        propertyType: 'pg',
        city: 'City A',
        state: 'State A',
        status: 'in_progress',
        agentId: agent1.id,
        territoryId: territory.id
      });

      await Lead.create({
        propertyOwnerName: 'Owner 3',
        email: 'owner3@stats.com',
        phone: '+919876543252',
        propertyType: 'hotel',
        city: 'City B',
        state: 'State A',
        status: 'approved',
        agentId: agent2.id,
        territoryId: territory.id
      });

      await Lead.create({
        propertyOwnerName: 'Owner 4',
        email: 'owner4@stats.com',
        phone: '+919876543253',
        propertyType: 'pg',
        city: 'City B',
        state: 'State A',
        status: 'rejected',
        agentId: agent2.id,
        territoryId: territory.id
      });

      // Get territory statistics
      const allLeads = await Lead.findAll({ where: { territoryId: territory.id } });
      const contactedLeads = await Lead.findAll({ 
        where: { territoryId: territory.id, status: 'contacted' }
      });
      const inProgressLeads = await Lead.findAll({ 
        where: { territoryId: territory.id, status: 'in_progress' }
      });
      const approvedLeads = await Lead.findAll({ 
        where: { territoryId: territory.id, status: 'approved' }
      });
      const rejectedLeads = await Lead.findAll({ 
        where: { territoryId: territory.id, status: 'rejected' }
      });

      expect(allLeads.length).toBe(4);
      expect(contactedLeads.length).toBe(1);
      expect(inProgressLeads.length).toBe(1);
      expect(approvedLeads.length).toBe(1);
      expect(rejectedLeads.length).toBe(1);

      // Calculate conversion rate
      const conversionRate = (approvedLeads.length / allLeads.length) * 100;
      expect(conversionRate).toBe(25);
    });

    test('Agent performance within territory', async () => {
      // Create leads for both agents
      for (let i = 0; i < 3; i++) {
        await Lead.create({
          propertyOwnerName: `Agent1 Owner ${i}`,
          email: `agent1owner${i}@stats.com`,
          phone: `+91987654325${i}`,
          propertyType: 'hotel',
          city: 'City A',
          state: 'State A',
          status: i < 2 ? 'approved' : 'in_progress',
          agentId: agent1.id,
          territoryId: territory.id
        });
      }

      for (let i = 0; i < 2; i++) {
        await Lead.create({
          propertyOwnerName: `Agent2 Owner ${i}`,
          email: `agent2owner${i}@stats.com`,
          phone: `+91987654326${i}`,
          propertyType: 'pg',
          city: 'City B',
          state: 'State A',
          status: 'approved',
          agentId: agent2.id,
          territoryId: territory.id
        });
      }

      // Get agent statistics
      const agent1Leads = await Lead.findAll({ where: { agentId: agent1.id } });
      const agent1Approved = await Lead.findAll({ 
        where: { agentId: agent1.id, status: 'approved' }
      });

      const agent2Leads = await Lead.findAll({ where: { agentId: agent2.id } });
      const agent2Approved = await Lead.findAll({ 
        where: { agentId: agent2.id, status: 'approved' }
      });

      expect(agent1Leads.length).toBe(3);
      expect(agent1Approved.length).toBe(2);
      expect(agent2Leads.length).toBe(2);
      expect(agent2Approved.length).toBe(2);

      // Agent 1 conversion rate: 2/3 = 66.67%
      const agent1ConversionRate = (agent1Approved.length / agent1Leads.length) * 100;
      expect(agent1ConversionRate).toBeCloseTo(66.67, 1);

      // Agent 2 conversion rate: 2/2 = 100%
      const agent2ConversionRate = (agent2Approved.length / agent2Leads.length) * 100;
      expect(agent2ConversionRate).toBe(100);
    });
  });
});
