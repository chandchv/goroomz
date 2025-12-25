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
 * Internal User Role Dashboard Routes
 * Requirements: 2.1, 3.1, 5.1, 10.1, 10.2, 10.3, 10.4, 10.5
 */

/**
 * GET /api/internal/dashboard/agent
 * Get agent dashboard data
 * Requirements: 2.1, 10.1
 */
router.get('/agent', protectInternal, authorizeInternalRoles('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total properties onboarded by this agent
    const totalPropertiesOnboarded = await Lead.count({
      where: {
        agentId,
        status: 'approved'
      }
    });

    // Get pending leads count
    const pendingLeads = await Lead.count({
      where: {
        agentId,
        status: {
          [Op.in]: ['contacted', 'in_progress', 'pending_approval']
        }
      }
    });

    // Get commission earned this month
    const commissionThisMonth = await Commission.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
      ],
      where: {
        agentId,
        earnedDate: {
          [Op.between]: [monthStart, monthEnd]
        },
        status: {
          [Op.in]: ['earned', 'pending_payment', 'paid']
        }
      },
      raw: true
    });

    const commissionEarned = parseFloat(commissionThisMonth?.totalCommission || 0);

    // Get total commission earned (all time)
    const totalCommissionResult = await Commission.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalCommission']
      ],
      where: {
        agentId,
        status: {
          [Op.in]: ['earned', 'pending_payment', 'paid']
        }
      },
      raw: true
    });

    const totalCommissionEarned = parseFloat(totalCommissionResult?.totalCommission || 0);

    // Get lead pipeline breakdown
    const leadPipeline = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        agentId
      },
      group: ['status'],
      raw: true
    });

    const pipelineBreakdown = {
      contacted: 0,
      in_progress: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      lost: 0
    };

    leadPipeline.forEach(item => {
      pipelineBreakdown[item.status] = parseInt(item.count);
    });

    // Get recent leads (last 10)
    const recentLeads = await Lead.findAll({
      where: {
        agentId
      },
      order: [['updated_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'propertyOwnerName', 'businessName', 'city', 'status', 'updated_at']
    });

    // Get current month target
    const currentTarget = await AgentTarget.findOne({
      where: {
        agentId,
        startDate: {
          [Op.lte]: now
        },
        endDate: {
          [Op.gte]: now
        }
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalPropertiesOnboarded,
          pendingLeads,
          commissionEarnedThisMonth: commissionEarned,
          totalCommissionEarned
        },
        pipeline: pipelineBreakdown,
        recentLeads: recentLeads.map(lead => ({
          id: lead.id,
          propertyOwnerName: lead.propertyOwnerName,
          businessName: lead.businessName,
          city: lead.city,
          status: lead.status,
          lastUpdated: lead.updatedAt
        })),
        target: currentTarget ? {
          targetProperties: currentTarget.targetProperties,
          actualProperties: currentTarget.actualProperties,
          targetRevenue: currentTarget.targetRevenue,
          actualRevenue: currentTarget.actualRevenue,
          period: currentTarget.period,
          startDate: currentTarget.startDate,
          endDate: currentTarget.endDate,
          progressPercentage: currentTarget.targetProperties > 0 
            ? ((currentTarget.actualProperties / currentTarget.targetProperties) * 100).toFixed(2)
            : 0
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching agent dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent dashboard data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/dashboard/regional-manager
 * Get regional manager dashboard data
 * Requirements: 3.1, 10.2
 */
router.get('/regional-manager', protectInternal, authorizeInternalRoles('regional_manager'), async (req, res) => {
  try {
    const managerId = req.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get territories managed by this regional manager
    const territories = await Territory.findAll({
      where: {
        regionalManagerId: managerId,
        isActive: true
      }
    });

    const territoryIds = territories.map(t => t.id);

    // Get agents in this manager's territories
    const agents = await User.findAll({
      where: {
        internalRole: 'agent',
        territoryId: {
          [Op.in]: territoryIds
        },
        isActive: true
      },
      attributes: ['id', 'name', 'email', 'territoryId', 'commissionRate', 'last_login_at']
    });

    const agentIds = agents.map(a => a.id);

    // Get total properties onboarded in region this month
    const propertiesThisMonth = await Lead.count({
      where: {
        agentId: {
          [Op.in]: agentIds
        },
        status: 'approved',
        approvedAt: {
          [Op.gte]: monthStart
        }
      }
    });

    // Get total properties in region (all time)
    const totalProperties = await Lead.count({
      where: {
        agentId: {
          [Op.in]: agentIds
        },
        status: 'approved'
      }
    });

    // Get pending approvals
    const pendingApprovals = await Lead.count({
      where: {
        agentId: {
          [Op.in]: agentIds
        },
        status: 'pending_approval'
      }
    });

    // Get team performance summary
    const teamPerformance = await Promise.all(
      agents.map(async (agent) => {
        const propertiesOnboarded = await Lead.count({
          where: {
            agentId: agent.id,
            status: 'approved'
          }
        });

        const commissionEarned = await Commission.findOne({
          attributes: [
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
          ],
          where: {
            agentId: agent.id,
            status: {
              [Op.in]: ['earned', 'pending_payment', 'paid']
            }
          },
          raw: true
        });

        const currentTarget = await AgentTarget.findOne({
          where: {
            agentId: agent.id,
            startDate: {
              [Op.lte]: now
            },
            endDate: {
              [Op.gte]: now
            }
          }
        });

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          territoryId: agent.territoryId,
          propertiesOnboarded,
          commissionEarned: parseFloat(commissionEarned?.total || 0),
          target: currentTarget ? {
            targetProperties: currentTarget.targetProperties,
            actualProperties: currentTarget.actualProperties,
            progressPercentage: currentTarget.targetProperties > 0 
              ? ((currentTarget.actualProperties / currentTarget.targetProperties) * 100).toFixed(2)
              : 0
          } : null,
          lastLoginAt: agent.lastLoginAt
        };
      })
    );

    // Get regional statistics
    const regionalStats = {
      totalTerritories: territories.length,
      totalAgents: agents.length,
      totalProperties,
      propertiesThisMonth,
      pendingApprovals
    };

    // Get recent activities (recent approvals needed)
    const recentApprovals = await Lead.findAll({
      where: {
        agentId: {
          [Op.in]: agentIds
        },
        status: 'pending_approval'
      },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['name', 'email']
        }
      ],
      order: [['updated_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        regionalStats,
        territories: territories.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          cities: t.cities,
          states: t.states,
          agentCount: agents.filter(a => a.territoryId === t.id).length
        })),
        teamPerformance,
        pendingApprovals: recentApprovals.map(lead => ({
          id: lead.id,
          propertyOwnerName: lead.propertyOwnerName,
          businessName: lead.businessName,
          city: lead.city,
          agentName: lead.agent?.name,
          submittedAt: lead.updatedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching regional manager dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regional manager dashboard data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/dashboard/operations-manager
 * Get operations manager dashboard data
 * Requirements: 5.1, 10.3
 */
router.get('/operations-manager', protectInternal, authorizeInternalRoles('operations_manager'), async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get platform-wide statistics
    const totalProperties = await User.count({
      where: {
        role: {
          [Op.in]: ['owner', 'category_owner']
        },
        isActive: true
      }
    });

    // Get total bookings this month (from existing booking system)
    const totalBookingsThisMonth = await Booking.count({
      where: {
        createdAt: {
          [Op.gte]: monthStart
        }
      }
    });

    // Get platform occupancy rate
    const totalRooms = await Room.count({
      where: {
        isActive: true
      }
    });

    const occupiedRooms = await Room.count({
      where: {
        isActive: true,
        currentStatus: 'occupied'
      }
    });

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

    // Get support tickets summary
    const ticketsSummary = await SupportTicket.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const ticketsBreakdown = {
      new: 0,
      in_progress: 0,
      waiting_response: 0,
      resolved: 0,
      closed: 0
    };

    ticketsSummary.forEach(item => {
      ticketsBreakdown[item.status] = parseInt(item.count);
    });

    // Get high priority tickets
    const highPriorityTickets = await SupportTicket.findAll({
      where: {
        priority: {
          [Op.in]: ['high', 'urgent']
        },
        status: {
          [Op.in]: ['new', 'in_progress']
        }
      },
      include: [
        {
          model: User,
          as: 'propertyOwner',
          attributes: ['name', 'email']
        }
      ],
      order: [
        [sequelize.literal("CASE WHEN priority = 'urgent' THEN 1 WHEN priority = 'high' THEN 2 ELSE 3 END"), 'ASC'],
        ['created_at', 'ASC']
      ],
      limit: 10
    });

    // Get properties with issues (low occupancy)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Properties with zero occupancy for more than 7 days
    const lowOccupancyProperties = await Room.findAll({
      attributes: [
        'ownerId',
        [sequelize.fn('COUNT', sequelize.col('Room.id')), 'totalRooms'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN current_status = 'occupied' THEN 1 ELSE 0 END")), 'occupiedRooms']
      ],
      where: {
        isActive: true
      },
      group: ['ownerId'],
      having: sequelize.literal("SUM(CASE WHEN current_status = 'occupied' THEN 1 ELSE 0 END) = 0"),
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email'],
          where: {
            role: {
              [Op.in]: ['owner', 'category_owner']
            }
          }
        }
      ],
      limit: 10,
      raw: true
    });

    // Get platform trends (revenue this month vs last month)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const revenueThisMonth = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
      ],
      where: {
        status: 'completed',
        paymentDate: {
          [Op.between]: [monthStart, now]
        }
      },
      raw: true
    });

    const revenueLastMonth = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
      ],
      where: {
        status: 'completed',
        paymentDate: {
          [Op.between]: [lastMonthStart, lastMonthEnd]
        }
      },
      raw: true
    });

    const currentRevenue = parseFloat(revenueThisMonth?.total || 0);
    const lastRevenue = parseFloat(revenueLastMonth?.total || 0);
    const revenueGrowth = lastRevenue > 0 ? (((currentRevenue - lastRevenue) / lastRevenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        platformHealth: {
          totalProperties,
          totalBookingsThisMonth,
          occupancyRate: parseFloat(occupancyRate),
          totalRooms,
          occupiedRooms
        },
        supportTickets: {
          breakdown: ticketsBreakdown,
          totalOpen: ticketsBreakdown.new + ticketsBreakdown.in_progress + ticketsBreakdown.waiting_response,
          highPriorityTickets: highPriorityTickets.map(ticket => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            propertyOwnerName: ticket.propertyOwner?.name,
            createdAt: ticket.createdAt
          }))
        },
        propertyAlerts: {
          lowOccupancyCount: lowOccupancyProperties.length,
          lowOccupancyProperties: lowOccupancyProperties.map(prop => ({
            ownerId: prop.ownerId,
            ownerName: prop['owner.name'],
            ownerEmail: prop['owner.email'],
            totalRooms: parseInt(prop.totalRooms),
            occupiedRooms: parseInt(prop.occupiedRooms)
          }))
        },
        platformTrends: {
          revenueThisMonth: currentRevenue,
          revenueLastMonth: lastRevenue,
          revenueGrowth: parseFloat(revenueGrowth)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching operations manager dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch operations manager dashboard data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});/**
 * G
ET /api/internal/dashboard/platform-admin
 * Get platform administrator dashboard data
 * Requirements: 7.1, 8.1, 15.1, 20.1, 10.4
 */
router.get('/platform-admin', protectInternal, authorizeInternalRoles('platform_admin'), async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get internal users summary
    const internalUsersSummary = await User.findAll({
      attributes: [
        'internalRole',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        internalRole: {
          [Op.ne]: null
        },
        isActive: true
      },
      group: ['internalRole'],
      raw: true
    });

    const internalUsersBreakdown = {
      agent: 0,
      regional_manager: 0,
      operations_manager: 0,
      platform_admin: 0,
      superuser: 0
    };

    internalUsersSummary.forEach(item => {
      internalUsersBreakdown[item.internalRole] = parseInt(item.count);
    });

    // Get property owners count
    const totalPropertyOwners = await User.count({
      where: {
        role: {
          [Op.in]: ['owner', 'category_owner']
        },
        isActive: true
      }
    });

    // Get new property owners this month
    const newPropertyOwnersThisMonth = await User.count({
      where: {
        role: {
          [Op.in]: ['owner', 'category_owner']
        },
        createdAt: {
          [Op.gte]: monthStart
        }
      }
    });

    // Get commission statistics
    const commissionStats = await Commission.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    });

    const commissionBreakdown = {
      earned: { count: 0, amount: 0 },
      pending_payment: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    };

    commissionStats.forEach(item => {
      commissionBreakdown[item.status] = {
        count: parseInt(item.count),
        amount: parseFloat(item.totalAmount)
      };
    });

    // Get system configuration info
    const totalTerritories = await Territory.count({
      where: {
        isActive: true
      }
    });

    // Get recent internal user activities (last logins)
    const recentInternalUsers = await User.findAll({
      where: {
        internalRole: {
          [Op.ne]: null
        },
        isActive: true,
        lastLoginAt: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'name', 'email', 'internalRole', 'last_login_at'],
      order: [['last_login_at', 'DESC']],
      limit: 10
    });

    // Get subscription overview (property owners)
    const activeSubscriptions = await User.count({
      where: {
        role: {
          [Op.in]: ['owner', 'category_owner']
        },
        isActive: true
      }
    });

    res.json({
      success: true,
      data: {
        userManagement: {
          internalUsers: internalUsersBreakdown,
          totalInternalUsers: Object.values(internalUsersBreakdown).reduce((sum, count) => sum + count, 0),
          totalPropertyOwners,
          newPropertyOwnersThisMonth,
          activeSubscriptions
        },
        systemConfiguration: {
          totalTerritories,
          commissionBreakdown
        },
        recentActivity: {
          recentInternalUsers: recentInternalUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.internalRole,
            lastLoginAt: user.lastLoginAt
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching platform admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform admin dashboard data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/dashboard/superuser
 * Get superuser dashboard data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 10.5
 */
router.get('/superuser', protectInternal, authorizeInternalRoles('superuser'), async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get complete platform overview
    const totalUsers = await User.count({
      where: {
        isActive: true
      }
    });

    const totalProperties = await User.count({
      where: {
        role: {
          [Op.in]: ['owner', 'category_owner']
        },
        isActive: true
      }
    });

    const totalRooms = await Room.count({
      where: {
        isActive: true
      }
    });

    const totalBookings = await Booking.count();

    // Get financial summary
    const totalRevenue = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
      ],
      where: {
        status: 'completed'
      },
      raw: true
    });

    const totalCommissions = await Commission.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
      ],
      where: {
        status: {
          [Op.in]: ['earned', 'pending_payment', 'paid']
        }
      },
      raw: true
    });

    const revenueThisMonth = await Payment.findOne({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'total']
      ],
      where: {
        status: 'completed',
        paymentDate: {
          [Op.gte]: monthStart
        }
      },
      raw: true
    });

    // Get system health metrics
    const activeInternalUsers = await User.count({
      where: {
        internalRole: {
          [Op.ne]: null
        },
        isActive: true
      }
    });

    const openTickets = await SupportTicket.count({
      where: {
        status: {
          [Op.in]: ['new', 'in_progress', 'waiting_response']
        }
      }
    });

    const pendingApprovals = await Lead.count({
      where: {
        status: 'pending_approval'
      }
    });

    // Get critical alerts
    const urgentTickets = await SupportTicket.count({
      where: {
        priority: 'urgent',
        status: {
          [Op.in]: ['new', 'in_progress']
        }
      }
    });

    // Get recent critical actions (would need audit log)
    // For now, we'll get recent high-value commissions and urgent tickets
    const recentHighValueCommissions = await Commission.findAll({
      where: {
        amount: {
          [Op.gte]: 10000 // High value threshold
        },
        createdAt: {
          [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const recentUrgentTickets = await SupportTicket.findAll({
      where: {
        priority: 'urgent',
        createdAt: {
          [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: [
        {
          model: User,
          as: 'propertyOwner',
          attributes: ['name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        platformOverview: {
          totalUsers,
          totalProperties,
          totalRooms,
          totalBookings,
          activeInternalUsers
        },
        financialSummary: {
          totalRevenue: parseFloat(totalRevenue?.total || 0),
          totalCommissions: parseFloat(totalCommissions?.total || 0),
          revenueThisMonth: parseFloat(revenueThisMonth?.total || 0)
        },
        systemHealth: {
          openTickets,
          pendingApprovals,
          urgentTickets
        },
        criticalAlerts: {
          urgentTicketsCount: urgentTickets,
          recentHighValueCommissions: recentHighValueCommissions.map(commission => ({
            id: commission.id,
            amount: commission.amount,
            agentName: commission.agent?.name,
            earnedDate: commission.earnedDate,
            status: commission.status
          })),
          recentUrgentTickets: recentUrgentTickets.map(ticket => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            propertyOwnerName: ticket.propertyOwner?.name,
            createdAt: ticket.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching superuser dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch superuser dashboard data.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
