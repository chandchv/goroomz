const Territory = require('../models/Territory');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { Op } = require('sequelize');

/**
 * Territory Assignment Service
 * Handles territory lookup, agent assignment, and workload distribution
 */
class TerritoryService {
  
  /**
   * Find territory that covers a specific city and state
   * @param {string} city - City name
   * @param {string} state - State name
   * @returns {Promise<Territory|null>} - Matching territory or null
   */
  async findTerritoryByLocation(city, state) {
    try {
      const normalizedCity = city.toLowerCase().trim();
      const normalizedState = state.toLowerCase().trim();

      // Find territories that cover this location
      const territories = await Territory.findAll({
        where: {
          isActive: true,
          [Op.and]: [
            { states: { [Op.contains]: [state] } },
            { cities: { [Op.contains]: [city] } }
          ]
        },
        include: [
          {
            model: User,
            as: 'territoryHead',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['currentLeadCount', 'ASC']
        ]
      });

      // Filter territories that match case-insensitive
      const matchingTerritories = territories.filter(territory => {
        const stateMatch = territory.states.some(s => 
          s.toLowerCase().trim() === normalizedState
        );
        const cityMatch = territory.cities.some(c => 
          c.toLowerCase().trim() === normalizedCity
        );
        return stateMatch && cityMatch;
      });

      // Find first territory within capacity
      const availableTerritory = matchingTerritories.find(territory => 
        territory.isWithinCapacity()
      );

      return availableTerritory || null;
    } catch (error) {
      console.error('Territory lookup error:', error);
      throw new Error('Failed to find territory for location');
    }
  }

  /**
   * Assign a lead to a territory and increment lead count
   * @param {string} leadId - Lead ID
   * @param {string} territoryId - Territory ID
   * @returns {Promise<Territory>} - Updated territory
   */
  async assignLeadToTerritory(leadId, territoryId) {
    try {
      const territory = await Territory.findByPk(territoryId);
      if (!territory) {
        throw new Error('Territory not found');
      }

      if (!territory.isWithinCapacity()) {
        throw new Error('Territory is at capacity');
      }

      // Update lead with territory assignment
      await Lead.update(
        { territoryId: territoryId },
        { where: { id: leadId } }
      );

      // Increment territory lead count
      await territory.increment('currentLeadCount');
      await territory.reload();

      return territory;
    } catch (error) {
      console.error('Territory assignment error:', error);
      throw error;
    }
  }

  /**
   * Get available agents in a territory for lead assignment
   * @param {string} territoryId - Territory ID
   * @param {number} maxWorkload - Maximum leads per agent (default: 10)
   * @returns {Promise<User[]>} - Available agents
   */
  async getAvailableAgents(territoryId, maxWorkload = 10) {
    try {
      const territory = await Territory.findByPk(territoryId, {
        include: [
          {
            model: User,
            as: 'territoryHead',
            attributes: ['id', 'name', 'email', 'phone']
          }
        ]
      });

      if (!territory) {
        throw new Error('Territory not found');
      }

      // Find agents in this territory (users with role 'agent' or similar)
      // Note: This assumes there's a role system in place
      const agents = await User.findAll({
        where: {
          // Add role-based filtering here when role system is implemented
          // For now, we'll use a placeholder approach
          isActive: true
        },
        attributes: ['id', 'name', 'email', 'phone'],
        include: [
          {
            model: Lead,
            as: 'assignedLeads',
            where: {
              status: {
                [Op.notIn]: ['approved', 'rejected', 'converted']
              }
            },
            required: false
          }
        ]
      });

      // Filter agents by current workload
      const availableAgents = agents.filter(agent => {
        const currentLeadCount = agent.assignedLeads ? agent.assignedLeads.length : 0;
        return currentLeadCount < maxWorkload;
      });

      // Sort by current workload (ascending)
      availableAgents.sort((a, b) => {
        const aLeadCount = a.assignedLeads ? a.assignedLeads.length : 0;
        const bLeadCount = b.assignedLeads ? b.assignedLeads.length : 0;
        return aLeadCount - bLeadCount;
      });

      return availableAgents;
    } catch (error) {
      console.error('Available agents lookup error:', error);
      throw new Error('Failed to get available agents');
    }
  }

  /**
   * Automatically assign a lead to the best available agent in a territory
   * @param {string} leadId - Lead ID
   * @param {string} territoryId - Territory ID
   * @returns {Promise<{agent: User, territory: Territory}>} - Assignment result
   */
  async autoAssignLeadToAgent(leadId, territoryId) {
    try {
      const territory = await Territory.findByPk(territoryId);
      if (!territory || !territory.autoAssignLeads) {
        throw new Error('Territory not found or auto-assignment disabled');
      }

      const availableAgents = await this.getAvailableAgents(territoryId);
      
      if (availableAgents.length === 0) {
        // No agents available, assign to territory head or leave unassigned
        console.warn(`No available agents in territory ${territoryId} for lead ${leadId}`);
        return { agent: null, territory };
      }

      // Assign to agent with lowest workload
      const selectedAgent = availableAgents[0];
      
      await Lead.update(
        { 
          agentId: selectedAgent.id,
          status: 'assigned',
          lastContactDate: new Date()
        },
        { where: { id: leadId } }
      );

      return { agent: selectedAgent, territory };
    } catch (error) {
      console.error('Auto-assignment error:', error);
      throw error;
    }
  }

  /**
   * Get workload distribution for a territory
   * @param {string} territoryId - Territory ID
   * @returns {Promise<Object>} - Workload statistics
   */
  async getTerritoryWorkloadDistribution(territoryId) {
    try {
      const territory = await Territory.findByPk(territoryId, {
        include: [
          {
            model: Lead,
            as: 'leads',
            where: {
              status: {
                [Op.notIn]: ['approved', 'rejected', 'converted']
              }
            },
            required: false,
            include: [
              {
                model: User,
                as: 'agent',
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ]
      });

      if (!territory) {
        throw new Error('Territory not found');
      }

      const leads = territory.leads || [];
      const totalActiveLeads = leads.length;
      const assignedLeads = leads.filter(lead => lead.agentId).length;
      const unassignedLeads = totalActiveLeads - assignedLeads;

      // Group leads by agent
      const agentWorkload = {};
      leads.forEach(lead => {
        if (lead.agentId) {
          const agentId = lead.agentId;
          if (!agentWorkload[agentId]) {
            agentWorkload[agentId] = {
              agent: lead.agent,
              leadCount: 0,
              leads: []
            };
          }
          agentWorkload[agentId].leadCount++;
          agentWorkload[agentId].leads.push({
            id: lead.id,
            status: lead.status,
            priority: lead.priority,
            submissionDate: lead.submissionDate
          });
        }
      });

      return {
        territory: {
          id: territory.id,
          name: territory.name,
          code: territory.code
        },
        totalActiveLeads,
        assignedLeads,
        unassignedLeads,
        agentWorkload: Object.values(agentWorkload),
        utilizationRate: territory.maxLeads ? 
          Math.round((totalActiveLeads / territory.maxLeads) * 100) : null
      };
    } catch (error) {
      console.error('Workload distribution error:', error);
      throw new Error('Failed to get workload distribution');
    }
  }

  /**
   * Reassign leads when territory capacity changes
   * @param {string} territoryId - Territory ID
   * @returns {Promise<Object>} - Reassignment result
   */
  async rebalanceTerritoryWorkload(territoryId) {
    try {
      const workloadData = await this.getTerritoryWorkloadDistribution(territoryId);
      const availableAgents = await this.getAvailableAgents(territoryId);

      if (availableAgents.length === 0) {
        return { reassigned: 0, message: 'No available agents for rebalancing' };
      }

      // Find unassigned leads
      const unassignedLeads = await Lead.findAll({
        where: {
          territoryId: territoryId,
          agentId: null,
          status: {
            [Op.notIn]: ['approved', 'rejected', 'converted']
          }
        },
        order: [['priority', 'DESC'], ['submissionDate', 'ASC']]
      });

      let reassignedCount = 0;
      
      // Assign unassigned leads to available agents
      for (const lead of unassignedLeads) {
        const agent = availableAgents.find(a => {
          const currentCount = workloadData.agentWorkload
            .find(aw => aw.agent.id === a.id)?.leadCount || 0;
          return currentCount < 10; // Max workload per agent
        });

        if (agent) {
          await Lead.update(
            { 
              agentId: agent.id,
              status: 'assigned'
            },
            { where: { id: lead.id } }
          );
          reassignedCount++;
        }
      }

      return {
        reassigned: reassignedCount,
        totalUnassigned: unassignedLeads.length,
        message: `Reassigned ${reassignedCount} leads`
      };
    } catch (error) {
      console.error('Workload rebalancing error:', error);
      throw new Error('Failed to rebalance territory workload');
    }
  }

  /**
   * Get territory performance metrics
   * @param {string} territoryId - Territory ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} - Performance metrics
   */
  async getTerritoryPerformanceMetrics(territoryId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const territory = await Territory.findByPk(territoryId);
      if (!territory) {
        throw new Error('Territory not found');
      }

      const leads = await Lead.findAll({
        where: {
          territoryId: territoryId,
          submissionDate: {
            [Op.gte]: startDate
          }
        }
      });

      const totalLeads = leads.length;
      const approvedLeads = leads.filter(l => l.status === 'approved').length;
      const rejectedLeads = leads.filter(l => l.status === 'rejected').length;
      const pendingLeads = leads.filter(l => 
        ['pending', 'assigned', 'contacted', 'in_review'].includes(l.status)
      ).length;

      // Calculate average response time
      const contactedLeads = leads.filter(l => l.lastContactDate);
      const avgResponseTime = contactedLeads.length > 0 ? 
        contactedLeads.reduce((sum, lead) => {
          const responseTime = new Date(lead.lastContactDate) - new Date(lead.submissionDate);
          return sum + (responseTime / (1000 * 60 * 60)); // Convert to hours
        }, 0) / contactedLeads.length : 0;

      const conversionRate = totalLeads > 0 ? 
        Math.round((approvedLeads / totalLeads) * 100) : 0;

      return {
        territory: {
          id: territory.id,
          name: territory.name,
          code: territory.code
        },
        period: {
          days,
          startDate,
          endDate: new Date()
        },
        metrics: {
          totalLeads,
          approvedLeads,
          rejectedLeads,
          pendingLeads,
          conversionRate,
          averageResponseTimeHours: Math.round(avgResponseTime * 100) / 100
        }
      };
    } catch (error) {
      console.error('Performance metrics error:', error);
      throw new Error('Failed to get territory performance metrics');
    }
  }
}

module.exports = new TerritoryService();