const express = require('express');
const router = express.Router();
const { 
  User, 
  Lead, 
  Commission, 
  Territory, 
  AgentTarget, 
  SupportTicket,
  Room,
  Booking,
  Payment
} = require('../../models');
const { protectInternal, authorizeInternalRoles } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

/**
 * Internal Analytics and Reporting Routes
 * Requirements: 3.2, 3.4, 3.5, 5.2, 5.4, 13.1, 13.2, 13.3, 13.4
 */

/**
 * GET /api/internal/analytics/agent/:agentId
 * Get agent performance analytics
 * Requirements: 3.2, 13.1
 */
router.get('/agent/:agentId', protectInternal, authorizeInternalRoles('agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate, period = 'monthly' } = req.query;

    // Validate agent exists and user has permission to view
    const agent = await User.findOne({
      where: {
        id: agentId,
        internal_role: 'agent',
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'territory_id', 'commission_rate']
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found or inactive.'
      });
    }

    // Check if user has permission to view this agent's data
    if (req.user.internal_role === 'agent' && req.user.id !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own performance data.'
      });
    }

    if (req.user.internal_role === 'regional_manager') {
      // Regional managers can only view agents in their territories
      const territory = await Territory.findOne({
        where: {
          id: agent.territory_id,
          regional_manager_id: req.user.id
        }
      });

      if (!territory) {
        return res.status(403).json({
          success: false,
          message: 'You can only view agents in your territories.'
        });
      }
    }

    // Set date range
    const now = new Date();
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = {
        [Op.between]: [monthStart, monthEnd]
      };
    }

    // Get lead performance metrics
    const leadMetrics = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.literal('EXTRACT(EPOCH FROM (COALESCE("approved_at", NOW()) - "created_at")) / 86400')), 'avgDaysToClose']
      ],
      where: {
        agent_id: agentId,
        created_at: dateFilter
      },
      group: ['status'],
      raw: true
    });

    const leadBreakdown = {
      contacted: { count: 0, avgDaysToClose: 0 },
      in_progress: { count: 0, avgDaysToClose: 0 },
      pending_approval: { count: 0, avgDaysToClose: 0 },
      approved: { count: 0, avgDaysToClose: 0 },
      rejected: { count: 0, avgDaysToClose: 0 },
      lost: { count: 0, avgDaysToClose: 0 }
    };

    leadMetrics.forEach(metric => {
      leadBreakdown[metric.status] = {
        count: parseInt(metric.count),
        avgDaysToClose: parseFloat(metric.avgDaysToClose || 0)
      };
    });

    // Calculate conversion rates
    const totalLeads = Object.values(leadBreakdown).reduce((sum, status) => sum + status.count, 0);
    const approvedLeads = leadBreakdown.approved.count;
    const conversionRate = totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(2) : 0;

    // Get commission performance
    const commissionMetrics = await Commission.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount']
      ],
      where: {
        agentId,
        earnedDate: dateFilter
      },
      group: ['status'],
      raw: true
    });

    const commissionBreakdown = {
      earned: { count: 0, amount: 0 },
      pending_payment: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    };

    let totalCommissionEarned = 0;
    commissionMetrics.forEach(metric => {
      const amount = parseFloat(metric.totalAmount);
      commissionBreakdown[metric.status] = {
        count: parseInt(metric.count),
        amount
      };
      if (metric.status !== 'cancelled') {
        totalCommissionEarned += amount;
      }
    });

    // Get target performance
    const currentTarget = await AgentTarget.findOne({
      where: {
        agent_id: agentId,
        start_date: {
          [Op.lte]: now
        },
        end_date: {
          [Op.gte]: now
        }
      },
      order: [['created_at', 'DESC']]
    });

    // Get historical performance (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const historicalPerformance = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as properties_onboarded,
        COUNT(*) as total_leads,
        COALESCE(SUM(c.amount), 0) as commission_earned
      FROM leads l
      LEFT JOIN commissions c ON l.id = c."leadId" AND c.status != 'cancelled'
      WHERE l."agentId" = :agentId 
        AND l."createdAt" >= :sixMonthsAgo
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `, {
      replacements: { agentId, sixMonthsAgo },
      type: sequelize.QueryTypes.SELECT
    });

    // Get lead sources performance
    const leadSources = await Lead.findAll({
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approved']
      ],
      where: {
        agent_id: agentId,
        created_at: dateFilter,
        source: {
          [Op.ne]: null
        }
      },
      group: ['source'],
      raw: true
    });

    const sourcePerformance = leadSources.map(source => ({
      source: source.source || 'Unknown',
      totalLeads: parseInt(source.count),
      approvedLeads: parseInt(source.approved),
      conversionRate: source.count > 0 ? ((source.approved / source.count) * 100).toFixed(2) : 0
    }));

    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          territoryId: agent.territoryId,
          commissionRate: agent.commissionRate
        },
        period: {
          startDate: startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        },
        leadPerformance: {
          breakdown: leadBreakdown,
          totalLeads,
          conversionRate: parseFloat(conversionRate),
          avgDaysToClose: leadBreakdown.approved.avgDaysToClose
        },
        commissionPerformance: {
          breakdown: commissionBreakdown,
          totalEarned: totalCommissionEarned
        },
        targetPerformance: currentTarget ? {
          targetProperties: currentTarget.targetProperties,
          actualProperties: currentTarget.actualProperties,
          targetRevenue: parseFloat(currentTarget.targetRevenue),
          actualRevenue: parseFloat(currentTarget.actualRevenue),
          propertiesProgress: currentTarget.targetProperties > 0 
            ? ((currentTarget.actualProperties / currentTarget.targetProperties) * 100).toFixed(2)
            : 0,
          revenueProgress: currentTarget.targetRevenue > 0 
            ? ((currentTarget.actualRevenue / currentTarget.targetRevenue) * 100).toFixed(2)
            : 0,
          period: currentTarget.period,
          startDate: currentTarget.startDate,
          endDate: currentTarget.endDate
        } : null,
        historicalPerformance: historicalPerformance.map(month => ({
          month: month.month,
          propertiesOnboarded: parseInt(month.properties_onboarded),
          totalLeads: parseInt(month.total_leads),
          commissionEarned: parseFloat(month.commission_earned),
          conversionRate: month.total_leads > 0 
            ? ((month.properties_onboarded / month.total_leads) * 100).toFixed(2)
            : 0
        })),
        sourcePerformance
      }
    });
  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/analytics/team/:territoryId
 * Get team performance analytics for a territory
 * Requirements: 3.4, 13.2
 */
router.get('/team/:territoryId', protectInternal, authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const { territoryId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate territory exists and user has permission
    const territory = await Territory.findOne({
      where: {
        id: territoryId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'regionalManager',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!territory) {
      return res.status(404).json({
        success: false,
        message: 'Territory not found or inactive.'
      });
    }

    // Check permissions
    if (req.user.internal_role === 'regional_manager' && territory.regional_manager_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own territories.'
      });
    }

    // Set date range
    const now = new Date();
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = {
        [Op.between]: [monthStart, monthEnd]
      };
    }

    // Get agents in territory
    const agents = await User.findAll({
      where: {
        territory_id: territoryId,
        internal_role: 'agent',
        is_active: true
      },
      attributes: ['id', 'name', 'email', 'commission_rate', 'created_at']
    });

    const agentIds = agents.map(a => a.id);

    // Get team performance metrics
    const teamPerformance = await Promise.all(
      agents.map(async (agent) => {
        // Lead metrics for this agent
        const leadMetrics = await Lead.findAll({
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
            [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedLeads'],
            [sequelize.fn('AVG', sequelize.literal('EXTRACT(EPOCH FROM (COALESCE("approved_at", NOW()) - "created_at")) / 86400')), 'avgDaysToClose']
          ],
          where: {
            agent_id: agent.id,
            created_at: dateFilter
          },
          raw: true
        });

        const totalLeads = parseInt(leadMetrics[0]?.totalLeads || 0);
        const approvedLeads = parseInt(leadMetrics[0]?.approvedLeads || 0);
        const avgDaysToClose = parseFloat(leadMetrics[0]?.avgDaysToClose || 0);

        // Commission metrics
        const commissionMetrics = await Commission.findOne({
          attributes: [
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
          ],
          where: {
            agent_id: agent.id,
            earned_date: dateFilter,
            status: {
              [Op.in]: ['earned', 'pending_payment', 'paid']
            }
          },
          raw: true
        });

        const totalCommission = parseFloat(commissionMetrics?.totalCommission || 0);

        // Current target
        const currentTarget = await AgentTarget.findOne({
          where: {
            agent_id: agent.id,
            start_date: {
              [Op.lte]: now
            },
            end_date: {
              [Op.gte]: now
            }
          }
        });

        return {
          agent: {
            id: agent.id,
            name: agent.name,
            email: agent.email,
            commissionRate: agent.commission_rate,
            joinedAt: agent.created_at
          },
          performance: {
            totalLeads,
            approvedLeads,
            conversionRate: totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(2) : 0,
            avgDaysToClose,
            totalCommission
          },
          target: currentTarget ? {
            targetProperties: currentTarget.targetProperties,
            actualProperties: currentTarget.actualProperties,
            targetRevenue: parseFloat(currentTarget.targetRevenue),
            actualRevenue: parseFloat(currentTarget.actualRevenue),
            propertiesProgress: currentTarget.targetProperties > 0 
              ? ((currentTarget.actualProperties / currentTarget.targetProperties) * 100).toFixed(2)
              : 0,
            revenueProgress: currentTarget.targetRevenue > 0 
              ? ((currentTarget.actualRevenue / currentTarget.targetRevenue) * 100).toFixed(2)
              : 0
          } : null
        };
      })
    );

    // Get territory-wide statistics
    const territoryStats = await Lead.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending_approval' THEN 1 END")), 'pendingApprovals'],
        [sequelize.fn('AVG', sequelize.literal('EXTRACT(EPOCH FROM (COALESCE("approved_at", NOW()) - "created_at")) / 86400')), 'avgDaysToClose']
      ],
      where: {
        agent_id: {
          [Op.in]: agentIds
        },
        created_at: dateFilter
      },
      raw: true
    });

    const totalTerritoryLeads = parseInt(territoryStats[0]?.totalLeads || 0);
    const totalApprovedLeads = parseInt(territoryStats[0]?.approvedLeads || 0);
    const totalPendingApprovals = parseInt(territoryStats[0]?.pendingApprovals || 0);
    const territoryAvgDaysToClose = parseFloat(territoryStats[0]?.avgDaysToClose || 0);

    // Get territory commission total
    const territoryCommission = await Commission.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
      ],
      where: {
        agent_id: {
          [Op.in]: agentIds
        },
        earned_date: dateFilter,
        status: {
          [Op.in]: ['earned', 'pending_payment', 'paid']
        }
      },
      raw: true
    });

    const totalTerritoryCommission = parseFloat(territoryCommission?.totalCommission || 0);

    // Get historical team performance (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const historicalTeamPerformance = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', l."createdAt") as month,
        COUNT(CASE WHEN l.status = 'approved' THEN 1 END) as properties_onboarded,
        COUNT(l.*) as total_leads,
        COALESCE(SUM(c.amount), 0) as commission_earned
      FROM leads l
      LEFT JOIN commissions c ON l.id = c."leadId" AND c.status != 'cancelled'
      WHERE l."agentId" = ANY(:agentIds)
        AND l."createdAt" >= :sixMonthsAgo
      GROUP BY DATE_TRUNC('month', l."createdAt")
      ORDER BY month DESC
    `, {
      replacements: { agentIds, sixMonthsAgo },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        territory: {
          id: territory.id,
          name: territory.name,
          description: territory.description,
          cities: territory.cities,
          states: territory.states,
          regionalManager: territory.regionalManager
        },
        period: {
          startDate: startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        },
        territoryStats: {
          totalAgents: agents.length,
          totalLeads: totalTerritoryLeads,
          approvedLeads: totalApprovedLeads,
          pendingApprovals: totalPendingApprovals,
          conversionRate: totalTerritoryLeads > 0 ? ((totalApprovedLeads / totalTerritoryLeads) * 100).toFixed(2) : 0,
          avgDaysToClose: territoryAvgDaysToClose,
          totalCommission: totalTerritoryCommission
        },
        teamPerformance: teamPerformance.sort((a, b) => b.performance.approvedLeads - a.performance.approvedLeads),
        historicalPerformance: historicalTeamPerformance.map(month => ({
          month: month.month,
          propertiesOnboarded: parseInt(month.properties_onboarded),
          totalLeads: parseInt(month.total_leads),
          commissionEarned: parseFloat(month.commission_earned),
          conversionRate: month.total_leads > 0 
            ? ((month.properties_onboarded / month.total_leads) * 100).toFixed(2)
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching team analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/analytics/platform
 * Get platform-wide analytics
 * Requirements: 5.2, 5.4, 13.3
 */
router.get('/platform', protectInternal, authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();

    // Set date range
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to current month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = {
        [Op.between]: [monthStart, monthEnd]
      };
    }

    // Platform user statistics
    const userStats = await User.findAll({
      attributes: [
        [sequelize.literal("CASE WHEN \"internal_role\" IS NOT NULL THEN 'internal' ELSE 'property_owner' END"), 'userType'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        is_active: true
      },
      group: [sequelize.literal("CASE WHEN \"internal_role\" IS NOT NULL THEN 'internal' ELSE 'property_owner' END")],
      raw: true
    });

    const userBreakdown = {
      internal: 0,
      property_owner: 0
    };

    userStats.forEach(stat => {
      userBreakdown[stat.userType] = parseInt(stat.count);
    });

    // Internal role breakdown
    const internalRoleStats = await User.findAll({
      attributes: [
        'internal_role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        internal_role: {
          [Op.ne]: null
        },
        is_active: true
      },
      group: ['internal_role'],
      raw: true
    });

    const roleBreakdown = {
      agent: 0,
      regional_manager: 0,
      operations_manager: 0,
      platform_admin: 0,
      superuser: 0
    };

    internalRoleStats.forEach(stat => {
      roleBreakdown[stat.internal_role] = parseInt(stat.count);
    });

    // Property onboarding statistics
    const onboardingStats = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        created_at: dateFilter
      },
      group: ['status'],
      raw: true
    });

    const onboardingBreakdown = {
      contacted: 0,
      in_progress: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      lost: 0
    };

    onboardingStats.forEach(stat => {
      onboardingBreakdown[stat.status] = parseInt(stat.count);
    });

    // Platform revenue and commission statistics
    const revenueStats = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalRevenue']
      ],
      where: {
        status: 'completed',
        paymentDate: dateFilter
      },
      raw: true
    });

    const commissionStats = await Commission.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommissions']
      ],
      where: {
        earnedDate: dateFilter,
        status: {
          [Op.in]: ['earned', 'pending_payment', 'paid']
        }
      },
      raw: true
    });

    // Platform capacity metrics
    const capacityStats = await Room.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalRooms'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"current_status\" = 'occupied' THEN 1 END")), 'occupiedRooms'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"current_status\" = 'vacant_clean' THEN 1 END")), 'vacantCleanRooms'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"current_status\" = 'vacant_dirty' THEN 1 END")), 'vacantDirtyRooms']
      ],
      where: {
        isActive: true
      },
      raw: true
    });

    const totalRooms = parseInt(capacityStats[0]?.totalRooms || 0);
    const occupiedRooms = parseInt(capacityStats[0]?.occupiedRooms || 0);
    const vacantCleanRooms = parseInt(capacityStats[0]?.vacantCleanRooms || 0);
    const vacantDirtyRooms = parseInt(capacityStats[0]?.vacantDirtyRooms || 0);
    const availableRooms = vacantCleanRooms + vacantDirtyRooms;
    const maintenanceRooms = parseInt(capacityStats[0]?.maintenanceRooms || 0);

    // Booking statistics
    const bookingStats = await Booking.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'confirmed' THEN 1 END")), 'confirmedBookings'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'cancelled' THEN 1 END")), 'cancelledBookings']
      ],
      where: {
        created_at: dateFilter
      },
      raw: true
    });

    const totalBookings = parseInt(bookingStats[0]?.totalBookings || 0);
    const confirmedBookings = parseInt(bookingStats[0]?.confirmedBookings || 0);
    const cancelledBookings = parseInt(bookingStats[0]?.cancelledBookings || 0);

    // Support ticket statistics
    const ticketStats = await SupportTicket.findAll({
      attributes: [
        'status',
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        created_at: dateFilter
      },
      group: ['status', 'priority'],
      raw: true
    });

    const ticketBreakdown = {
      byStatus: {
        new: 0,
        in_progress: 0,
        waiting_response: 0,
        resolved: 0,
        closed: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    };

    ticketStats.forEach(stat => {
      ticketBreakdown.byStatus[stat.status] = (ticketBreakdown.byStatus[stat.status] || 0) + parseInt(stat.count);
      ticketBreakdown.byPriority[stat.priority] = (ticketBreakdown.byPriority[stat.priority] || 0) + parseInt(stat.count);
    });

    // Regional performance comparison
    const regionalPerformance = await sequelize.query(`
      SELECT 
        t.id as territory_id,
        t.name as territory_name,
        COUNT(DISTINCT u.id) as agent_count,
        COUNT(l.*) as total_leads,
        COUNT(CASE WHEN l.status = 'approved' THEN 1 END) as approved_leads,
        COALESCE(SUM(c.amount), 0) as total_commission
      FROM territories t
      LEFT JOIN users u ON t.id = u."territory_id" AND u."internal_role" = 'agent' AND u."is_active" = true
      LEFT JOIN leads l ON u.id = l."agent_id" AND l."created_at" >= :startDate AND l."created_at" <= :endDate
      LEFT JOIN commissions c ON l.id = c."lead_id" AND c.status != 'cancelled'
      WHERE t."is_active" = true
      GROUP BY t.id, t.name
      ORDER BY approved_leads DESC
    `, {
      replacements: { 
        startDate: startDate || new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      },
      type: sequelize.QueryTypes.SELECT
    });

    // Historical platform trends (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const platformTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', date_series) as month,
        COALESCE(properties_onboarded, 0) as properties_onboarded,
        COALESCE(total_revenue, 0) as total_revenue,
        COALESCE(total_commissions, 0) as total_commissions,
        COALESCE(total_bookings, 0) as total_bookings
      FROM (
        SELECT generate_series(:twelveMonthsAgo, :now, '1 month'::interval) as date_series
      ) months
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('month', l."created_at") as month,
          COUNT(CASE WHEN l.status = 'approved' THEN 1 END) as properties_onboarded
        FROM leads l
        WHERE l."created_at" >= :twelveMonthsAgo
        GROUP BY DATE_TRUNC('month', l."created_at")
      ) leads_data ON DATE_TRUNC('month', date_series) = leads_data.month
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('month', p."payment_date") as month,
          SUM(p.amount) as total_revenue
        FROM payments p
        WHERE p.status = 'completed' AND p."payment_date" >= :twelveMonthsAgo
        GROUP BY DATE_TRUNC('month', p."payment_date")
      ) revenue_data ON DATE_TRUNC('month', date_series) = revenue_data.month
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('month', c."earned_date") as month,
          SUM(c.amount) as total_commissions
        FROM commissions c
        WHERE c.status != 'cancelled' AND c."earned_date" >= :twelveMonthsAgo
        GROUP BY DATE_TRUNC('month', c."earned_date")
      ) commission_data ON DATE_TRUNC('month', date_series) = commission_data.month
      LEFT JOIN (
        SELECT 
          DATE_TRUNC('month', b."created_at") as month,
          COUNT(*) as total_bookings
        FROM bookings b
        WHERE b."created_at" >= :twelveMonthsAgo
        GROUP BY DATE_TRUNC('month', b."created_at")
      ) booking_data ON DATE_TRUNC('month', date_series) = booking_data.month
      ORDER BY month DESC
    `, {
      replacements: { twelveMonthsAgo, now },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        },
        userStatistics: {
          breakdown: userBreakdown,
          roleBreakdown,
          totalUsers: userBreakdown.internal + userBreakdown.property_owner
        },
        onboardingStatistics: {
          breakdown: onboardingBreakdown,
          totalLeads: Object.values(onboardingBreakdown).reduce((sum, count) => sum + count, 0),
          conversionRate: onboardingBreakdown.contacted > 0 
            ? ((onboardingBreakdown.approved / (onboardingBreakdown.contacted + onboardingBreakdown.in_progress + onboardingBreakdown.approved + onboardingBreakdown.rejected + onboardingBreakdown.lost)) * 100).toFixed(2)
            : 0
        },
        financialStatistics: {
          totalRevenue: parseFloat(revenueStats?.totalRevenue || 0),
          totalCommissions: parseFloat(commissionStats?.totalCommissions || 0),
          commissionRate: revenueStats?.totalRevenue > 0 
            ? ((commissionStats?.totalCommissions / revenueStats?.totalRevenue) * 100).toFixed(2)
            : 0
        },
        capacityStatistics: {
          totalRooms,
          occupiedRooms,
          availableRooms,
          maintenanceRooms,
          occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0
        },
        bookingStatistics: {
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          confirmationRate: totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(2) : 0
        },
        supportStatistics: {
          breakdown: ticketBreakdown,
          totalTickets: Object.values(ticketBreakdown.byStatus).reduce((sum, count) => sum + count, 0),
          openTickets: ticketBreakdown.byStatus.new + ticketBreakdown.byStatus.in_progress + ticketBreakdown.byStatus.waiting_response
        },
        regionalPerformance: regionalPerformance.map(region => ({
          territoryId: region.territory_id,
          territoryName: region.territory_name,
          agentCount: parseInt(region.agent_count),
          totalLeads: parseInt(region.total_leads),
          approvedLeads: parseInt(region.approved_leads),
          totalCommission: parseFloat(region.total_commission),
          conversionRate: region.total_leads > 0 
            ? ((region.approved_leads / region.total_leads) * 100).toFixed(2)
            : 0
        })),
        platformTrends: platformTrends.map(trend => ({
          month: trend.month,
          propertiesOnboarded: parseInt(trend.properties_onboarded),
          totalRevenue: parseFloat(trend.total_revenue),
          totalCommissions: parseFloat(trend.total_commissions),
          totalBookings: parseInt(trend.total_bookings)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/analytics/regional/:territoryId
 * Get regional analytics for a specific territory
 * Requirements: 3.5, 13.4
 */
router.get('/regional/:territoryId', protectInternal, authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const { territoryId } = req.params;
    const { startDate, endDate, compareWith } = req.query;

    // Validate territory and permissions
    const territory = await Territory.findOne({
      where: {
        id: territoryId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'regionalManager',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!territory) {
      return res.status(404).json({
        success: false,
        message: 'Territory not found or inactive.'
      });
    }

    if (req.user.internal_role === 'regional_manager' && territory.regional_manager_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own territories.'
      });
    }

    const now = new Date();
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter = {
        [Op.between]: [monthStart, monthEnd]
      };
    }

    // Get agents in territory
    const agents = await User.findAll({
      where: {
        territory_id: territoryId,
        internal_role: 'agent',
        is_active: true
      }
    });

    const agentIds = agents.map(a => a.id);

    // Regional performance metrics
    const regionalMetrics = await Lead.findAll({
      attributes: [
        'property_type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.literal('EXTRACT(EPOCH FROM (COALESCE("approved_at", NOW()) - "created_at")) / 86400')), 'avgDaysToClose']
      ],
      where: {
        agent_id: {
          [Op.in]: agentIds
        },
        created_at: dateFilter
      },
      group: ['property_type', 'status'],
      raw: true
    });

    // Process metrics by property type
    const propertyTypeMetrics = {
      hotel: {
        contacted: 0, in_progress: 0, pending_approval: 0, 
        approved: 0, rejected: 0, lost: 0, avgDaysToClose: 0
      },
      pg: {
        contacted: 0, in_progress: 0, pending_approval: 0, 
        approved: 0, rejected: 0, lost: 0, avgDaysToClose: 0
      }
    };

    regionalMetrics.forEach(metric => {
      if (propertyTypeMetrics[metric.property_type]) {
        propertyTypeMetrics[metric.property_type][metric.status] = parseInt(metric.count);
        if (metric.status === 'approved') {
          propertyTypeMetrics[metric.property_type].avgDaysToClose = parseFloat(metric.avgDaysToClose || 0);
        }
      }
    });

    // Calculate conversion rates by property type
    Object.keys(propertyTypeMetrics).forEach(type => {
      const metrics = propertyTypeMetrics[type];
      const totalLeads = Object.values(metrics).reduce((sum, val) => 
        typeof val === 'number' && val !== metrics.avgDaysToClose ? sum + val : sum, 0
      );
      metrics.totalLeads = totalLeads;
      metrics.conversionRate = totalLeads > 0 ? ((metrics.approved / totalLeads) * 100).toFixed(2) : 0;
    });

    // Geographic distribution of leads
    const geographicDistribution = await Lead.findAll({
      attributes: [
        'city',
        'state',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedLeads']
      ],
      where: {
        agent_id: {
          [Op.in]: agentIds
        },
        created_at: dateFilter
      },
      group: ['city', 'state'],
      order: [[sequelize.literal('COUNT(id)'), 'DESC']],
      limit: 20,
      raw: true
    });

    // Agent performance ranking
    const agentRanking = await Promise.all(
      agents.map(async (agent) => {
        const performance = await Lead.findAll({
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
            [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedLeads']
          ],
          where: {
            agent_id: agent.id,
            created_at: dateFilter
          },
          raw: true
        });

        const commission = await Commission.findOne({
          attributes: [
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
          ],
          where: {
            agent_id: agent.id,
            earned_date: dateFilter,
            status: {
              [Op.in]: ['earned', 'pending_payment', 'paid']
            }
          },
          raw: true
        });

        const totalLeads = parseInt(performance[0]?.totalLeads || 0);
        const approvedLeads = parseInt(performance[0]?.approvedLeads || 0);

        return {
          agent: {
            id: agent.id,
            name: agent.name,
            email: agent.email
          },
          totalLeads,
          approvedLeads,
          conversionRate: totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(2) : 0,
          totalCommission: parseFloat(commission?.totalCommission || 0)
        };
      })
    );

    // Sort by approved leads
    agentRanking.sort((a, b) => b.approvedLeads - a.approvedLeads);

    // Comparison with other territories (if requested)
    let territoryComparison = null;
    if (compareWith) {
      const comparisonTerritories = await Territory.findAll({
        where: {
          id: {
            [Op.in]: compareWith.split(',')
          },
          is_active: true
        }
      });

      territoryComparison = await Promise.all(
        comparisonTerritories.map(async (compTerritory) => {
          const compAgents = await User.findAll({
            where: {
              territory_id: compTerritory.id,
              internal_role: 'agent',
              is_active: true
            }
          });

          const compAgentIds = compAgents.map(a => a.id);

          const compMetrics = await Lead.findAll({
            attributes: [
              [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
              [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedLeads']
            ],
            where: {
              agent_id: {
                [Op.in]: compAgentIds
              },
              created_at: dateFilter
            },
            raw: true
          });

          const compCommission = await Commission.findOne({
            attributes: [
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
            ],
            where: {
              agent_id: {
                [Op.in]: compAgentIds
              },
              earned_date: dateFilter,
              status: {
                [Op.in]: ['earned', 'pending_payment', 'paid']
              }
            },
            raw: true
          });

          const totalLeads = parseInt(compMetrics[0]?.totalLeads || 0);
          const approvedLeads = parseInt(compMetrics[0]?.approvedLeads || 0);

          return {
            territory: {
              id: compTerritory.id,
              name: compTerritory.name
            },
            agentCount: compAgents.length,
            totalLeads,
            approvedLeads,
            conversionRate: totalLeads > 0 ? ((approvedLeads / totalLeads) * 100).toFixed(2) : 0,
            totalCommission: parseFloat(compCommission?.totalCommission || 0)
          };
        })
      );
    }

    // Monthly trends for the territory (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const monthlyTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', l."createdAt") as month,
        COUNT(l.*) as total_leads,
        COUNT(CASE WHEN l.status = 'approved' THEN 1 END) as approved_leads,
        COALESCE(SUM(c.amount), 0) as commission_earned
      FROM leads l
      LEFT JOIN commissions c ON l.id = c."leadId" AND c.status != 'cancelled'
      WHERE l."agentId" = ANY(:agentIds)
        AND l."createdAt" >= :twelveMonthsAgo
      GROUP BY DATE_TRUNC('month', l."createdAt")
      ORDER BY month DESC
    `, {
      replacements: { agentIds, twelveMonthsAgo },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        territory: {
          id: territory.id,
          name: territory.name,
          description: territory.description,
          cities: territory.cities,
          states: territory.states,
          regionalManager: territory.regionalManager
        },
        period: {
          startDate: startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          endDate: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        },
        propertyTypeAnalysis: propertyTypeMetrics,
        geographicDistribution: geographicDistribution.map(geo => ({
          city: geo.city,
          state: geo.state,
          totalLeads: parseInt(geo.totalLeads),
          approvedLeads: parseInt(geo.approvedLeads),
          conversionRate: geo.totalLeads > 0 ? ((geo.approvedLeads / geo.totalLeads) * 100).toFixed(2) : 0
        })),
        agentRanking,
        territoryComparison,
        monthlyTrends: monthlyTrends.map(trend => ({
          month: trend.month,
          totalLeads: parseInt(trend.total_leads),
          approvedLeads: parseInt(trend.approved_leads),
          commissionEarned: parseFloat(trend.commission_earned),
          conversionRate: trend.total_leads > 0 
            ? ((trend.approved_leads / trend.total_leads) * 100).toFixed(2)
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching regional analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regional analytics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/internal/analytics/export
 * Export analytics report
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
router.post('/export', protectInternal, authorizeInternalRoles('regional_manager', 'operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const { reportType, startDate, endDate, territoryId, agentId, format = 'json' } = req.body;

    if (!reportType || !['agent', 'team', 'platform', 'regional'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Must be one of: agent, team, platform, regional'
      });
    }

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be json or csv'
      });
    }

    let reportData;
    let filename;

    // Generate report based on type
    switch (reportType) {
      case 'agent':
        if (!agentId) {
          return res.status(400).json({
            success: false,
            message: 'Agent ID is required for agent reports'
          });
        }
        
        // Call the agent analytics endpoint internally
        const agentReq = { 
          params: { agentId }, 
          query: { startDate, endDate },
          user: req.user 
        };
        const agentRes = { 
          json: (data) => { reportData = data; },
          status: () => ({ json: (data) => { reportData = data; } })
        };
        
        // This is a simplified approach - in production, you'd extract the logic to a service
        reportData = { message: 'Agent report generation not fully implemented in this endpoint' };
        filename = `agent_report_${agentId}_${Date.now()}`;
        break;

      case 'team':
        if (!territoryId) {
          return res.status(400).json({
            success: false,
            message: 'Territory ID is required for team reports'
          });
        }
        reportData = { message: 'Team report generation not fully implemented in this endpoint' };
        filename = `team_report_${territoryId}_${Date.now()}`;
        break;

      case 'platform':
        reportData = { message: 'Platform report generation not fully implemented in this endpoint' };
        filename = `platform_report_${Date.now()}`;
        break;

      case 'regional':
        if (!territoryId) {
          return res.status(400).json({
            success: false,
            message: 'Territory ID is required for regional reports'
          });
        }
        reportData = { message: 'Regional report generation not fully implemented in this endpoint' };
        filename = `regional_report_${territoryId}_${Date.now()}`;
        break;
    }

    // For now, return the report data directly
    // In production, you would:
    // 1. Generate the actual report by calling the respective analytics endpoints
    // 2. Format the data as CSV if requested
    // 3. Store the file temporarily or stream it directly
    // 4. Return a download link or stream the file

    if (format === 'csv') {
      // Convert to CSV format (simplified implementation)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('Report Type,Generated At,Status\n' + 
               `${reportType},${new Date().toISOString()},Generated`);
    } else {
      res.json({
        success: true,
        data: {
          reportType,
          filename: `${filename}.${format}`,
          generatedAt: new Date().toISOString(),
          parameters: {
            startDate,
            endDate,
            territoryId,
            agentId
          },
          reportData: reportData || { message: 'Report data would be generated here' }
        }
      });
    }
  } catch (error) {
    console.error('Error exporting analytics report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;