const express = require('express');
const router = express.Router();
const { 
  User, 
  Room,
  Booking,
  Payment,
  Lead,
  Commission,
  SupportTicket,
  MaintenanceRequest,
  HousekeepingLog,
  sequelize
} = require('../../models');
const { protectInternal, authorizeInternalRoles } = require('../../middleware/internalAuth');
const { Op } = require('sequelize');
const os = require('os');

/**
 * Internal Platform Health Monitoring Routes
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */

/**
 * GET /api/internal/health/metrics
 * Get platform health metrics
 * Requirements: 19.1
 */
router.get('/metrics', protectInternal, authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // API response time simulation (in production, this would come from monitoring tools)
    // For now, we'll calculate based on recent database query performance
    const startTime = Date.now();
    await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
    const dbResponseTime = Date.now() - startTime;

    // Error rate calculation - count failed operations in the last hour
    // In production, this would come from application logs or monitoring service
    const errorRate = 0.01; // Placeholder: 1% error rate

    // System uptime (in seconds)
    const systemUptime = os.uptime();

    // Database connection status
    let databaseStatus = 'healthy';
    let databaseResponseTime = dbResponseTime;
    try {
      const dbStart = Date.now();
      await sequelize.authenticate();
      databaseResponseTime = Date.now() - dbStart;
      if (databaseResponseTime > 1000) {
        databaseStatus = 'degraded';
      }
    } catch (error) {
      databaseStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Recent activity metrics
    const recentBookings = await Booking.count({
      where: {
        created_at: {
          [Op.gte]: oneHourAgo
        }
      }
    });

    const recentPayments = await Payment.count({
      where: {
        paymentDate: {
          [Op.gte]: oneHourAgo
        },
        status: 'completed'
      }
    });

    const recentLeads = await Lead.count({
      where: {
        created_at: {
          [Op.gte]: oneHourAgo
        }
      }
    });

    // Active sessions (users who logged in within last 24 hours)
    const activeSessions = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: oneDayAgo
        },
        isActive: true
      }
    });

    // Critical issues count
    const criticalTickets = await SupportTicket.count({
      where: {
        priority: 'urgent',
        status: {
          [Op.in]: ['new', 'in_progress']
        }
      }
    });

    const urgentMaintenance = await MaintenanceRequest.count({
      where: {
        priority: 'urgent',
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    // Overall health status
    let overallStatus = 'healthy';
    if (databaseStatus === 'unhealthy' || errorRate > 0.05 || dbResponseTime > 2000) {
      overallStatus = 'unhealthy';
    } else if (databaseStatus === 'degraded' || errorRate > 0.02 || dbResponseTime > 1000) {
      overallStatus = 'degraded';
    }

    res.json({
      success: true,
      data: {
        overallStatus,
        timestamp: now.toISOString(),
        metrics: {
          apiResponseTime: {
            value: dbResponseTime,
            unit: 'ms',
            status: dbResponseTime < 500 ? 'healthy' : dbResponseTime < 1000 ? 'degraded' : 'unhealthy',
            threshold: {
              healthy: 500,
              degraded: 1000
            }
          },
          errorRate: {
            value: (errorRate * 100).toFixed(2),
            unit: '%',
            status: errorRate < 0.01 ? 'healthy' : errorRate < 0.05 ? 'degraded' : 'unhealthy',
            threshold: {
              healthy: 1,
              degraded: 5
            }
          },
          systemUptime: {
            value: systemUptime,
            unit: 'seconds',
            formatted: formatUptime(systemUptime),
            status: 'healthy'
          },
          databaseStatus: {
            status: databaseStatus,
            responseTime: databaseResponseTime,
            unit: 'ms'
          }
        },
        recentActivity: {
          lastHour: {
            bookings: recentBookings,
            payments: recentPayments,
            leads: recentLeads
          },
          activeSessions: activeSessions
        },
        criticalIssues: {
          urgentTickets: criticalTickets,
          urgentMaintenance: urgentMaintenance,
          total: criticalTickets + urgentMaintenance
        }
      }
    });
  } catch (error) {
    console.error('Error fetching platform health metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform health metrics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/health/capacity
 * Get capacity metrics
 * Requirements: 19.2
 */
router.get('/capacity', protectInternal, authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    // Property and room capacity
    const propertyOwnerCount = await User.count({
      where: {
        internalRole: null,
        isActive: true
      }
    });

    const roomStats = await Room.findAll({
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

    const totalRooms = parseInt(roomStats[0]?.totalRooms || 0);
    const occupiedRooms = parseInt(roomStats[0]?.occupiedRooms || 0);
    const vacantCleanRooms = parseInt(roomStats[0]?.vacantCleanRooms || 0);
    const vacantDirtyRooms = parseInt(roomStats[0]?.vacantDirtyRooms || 0);
    const availableRooms = vacantCleanRooms + vacantDirtyRooms;

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;
    const availabilityRate = totalRooms > 0 ? ((availableRooms / totalRooms) * 100).toFixed(2) : 0;

    // Booking capacity
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const bookingStats = await Booking.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'confirmed' THEN 1 END")), 'confirmedBookings'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'checked_in' THEN 1 END")), 'checkedInBookings'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pendingBookings']
      ],
      where: {
        checkInDate: {
          [Op.between]: [currentMonthStart, currentMonthEnd]
        }
      },
      raw: true
    });

    const totalBookings = parseInt(bookingStats[0]?.totalBookings || 0);
    const confirmedBookings = parseInt(bookingStats[0]?.confirmedBookings || 0);
    const checkedInBookings = parseInt(bookingStats[0]?.checkedInBookings || 0);
    const pendingBookings = parseInt(bookingStats[0]?.pendingBookings || 0);

    // User capacity
    const internalUserCount = await User.count({
      where: {
        internalRole: {
          [Op.ne]: null
        },
        isActive: true
      }
    });

    const internalRoleBreakdown = await User.findAll({
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

    const roleCapacity = {};
    internalRoleBreakdown.forEach(role => {
      roleCapacity[role.internalRole] = parseInt(role.count);
    });

    // Lead pipeline capacity
    const leadStats = await Lead.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'contacted' THEN 1 END")), 'contactedLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'in_progress' THEN 1 END")), 'inProgressLeads'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'pending_approval' THEN 1 END")), 'pendingApprovalLeads']
      ],
      where: {
        status: {
          [Op.in]: ['contacted', 'in_progress', 'pending_approval']
        }
      },
      raw: true
    });

    const activeLeads = parseInt(leadStats[0]?.totalLeads || 0);
    const contactedLeads = parseInt(leadStats[0]?.contactedLeads || 0);
    const inProgressLeads = parseInt(leadStats[0]?.inProgressLeads || 0);
    const pendingApprovalLeads = parseInt(leadStats[0]?.pendingApprovalLeads || 0);

    // Capacity status assessment
    let capacityStatus = 'healthy';
    if (occupancyRate > 95 || availabilityRate < 5) {
      capacityStatus = 'critical';
    } else if (occupancyRate > 85 || availabilityRate < 10) {
      capacityStatus = 'warning';
    }

    res.json({
      success: true,
      data: {
        capacityStatus,
        timestamp: new Date().toISOString(),
        propertyCapacity: {
          totalProperties: propertyOwnerCount,
          totalRooms,
          occupiedRooms,
          vacantCleanRooms,
          vacantDirtyRooms,
          availableRooms,
          occupancyRate: parseFloat(occupancyRate),
          availabilityRate: parseFloat(availabilityRate)
        },
        bookingCapacity: {
          currentMonth: {
            totalBookings,
            confirmedBookings,
            checkedInBookings,
            pendingBookings
          },
          utilizationRate: totalRooms > 0 ? ((totalBookings / totalRooms) * 100).toFixed(2) : 0
        },
        userCapacity: {
          totalInternalUsers: internalUserCount,
          totalPropertyOwners: propertyOwnerCount,
          roleBreakdown: roleCapacity
        },
        leadPipelineCapacity: {
          activeLeads,
          breakdown: {
            contacted: contactedLeads,
            inProgress: inProgressLeads,
            pendingApproval: pendingApprovalLeads
          },
          averageLeadsPerAgent: roleCapacity.agent > 0 ? (activeLeads / roleCapacity.agent).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching capacity metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch capacity metrics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/health/activity
 * Get user activity metrics
 * Requirements: 19.3
 */
router.get('/activity', protectInternal, authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active users by time period
    const activeUsersLastHour = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: oneHourAgo
        },
        isActive: true
      }
    });

    const activeUsersLast24Hours = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: oneDayAgo
        },
        isActive: true
      }
    });

    const activeUsersLastWeek = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: oneWeekAgo
        },
        isActive: true
      }
    });

    // User type breakdown for active users
    const activeUsersByType = await User.findAll({
      attributes: [
        [sequelize.literal("CASE WHEN \"internalRole\" IS NOT NULL THEN 'internal' ELSE 'property_owner' END"), 'userType'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        lastLoginAt: {
          [Op.gte]: oneDayAgo
        },
        isActive: true
      },
      group: [sequelize.literal("CASE WHEN \"internalRole\" IS NOT NULL THEN 'internal' ELSE 'property_owner' END")],
      raw: true
    });

    const activeUserTypeBreakdown = {
      internal: 0,
      property_owner: 0
    };

    activeUsersByType.forEach(type => {
      activeUserTypeBreakdown[type.userType] = parseInt(type.count);
    });

    // Peak usage times (last 24 hours, grouped by hour)
    const hourlyActivity = await sequelize.query(`
      SELECT 
        EXTRACT(HOUR FROM "lastLoginAt") as hour,
        COUNT(*) as login_count
      FROM users
      WHERE "lastLoginAt" >= :oneDayAgo
        AND "isActive" = true
      GROUP BY EXTRACT(HOUR FROM "lastLoginAt")
      ORDER BY hour
    `, {
      replacements: { oneDayAgo },
      type: sequelize.QueryTypes.SELECT
    });

    const peakHours = hourlyActivity
      .sort((a, b) => parseInt(b.login_count) - parseInt(a.login_count))
      .slice(0, 3)
      .map(h => ({
        hour: parseInt(h.hour),
        loginCount: parseInt(h.login_count)
      }));

    // Activity by action type (last 24 hours)
    const bookingActivity = await Booking.count({
      where: {
        created_at: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    const paymentActivity = await Payment.count({
      where: {
        paymentDate: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    const leadActivity = await Lead.count({
      where: {
        created_at: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    const ticketActivity = await SupportTicket.count({
      where: {
        created_at: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    const maintenanceActivity = await MaintenanceRequest.count({
      where: {
        created_at: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    const housekeepingActivity = await HousekeepingLog.count({
      where: {
        created_at: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    // Concurrent sessions estimate (users active in last hour)
    const concurrentSessions = activeUsersLastHour;

    // Activity trend (comparing last 24h to previous 24h)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const previousDayActivity = await User.count({
      where: {
        lastLoginAt: {
          [Op.between]: [twoDaysAgo, oneDayAgo]
        },
        isActive: true
      }
    });

    const activityTrend = previousDayActivity > 0 
      ? (((activeUsersLast24Hours - previousDayActivity) / previousDayActivity) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        timestamp: now.toISOString(),
        activeUsers: {
          lastHour: activeUsersLastHour,
          last24Hours: activeUsersLast24Hours,
          lastWeek: activeUsersLastWeek,
          breakdown: activeUserTypeBreakdown
        },
        concurrentSessions: {
          current: concurrentSessions,
          estimated: concurrentSessions
        },
        peakUsageTimes: {
          last24Hours: peakHours,
          currentHour: now.getHours()
        },
        activityByType: {
          last24Hours: {
            bookings: bookingActivity,
            payments: paymentActivity,
            leads: leadActivity,
            supportTickets: ticketActivity,
            maintenance: maintenanceActivity,
            housekeeping: housekeepingActivity,
            total: bookingActivity + paymentActivity + leadActivity + ticketActivity + maintenanceActivity + housekeepingActivity
          }
        },
        activityTrend: {
          percentageChange: parseFloat(activityTrend),
          direction: activityTrend > 0 ? 'increasing' : activityTrend < 0 ? 'decreasing' : 'stable',
          comparison: {
            current: activeUsersLast24Hours,
            previous: previousDayActivity
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity metrics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/internal/health/infrastructure
 * Get infrastructure metrics
 * Requirements: 19.4, 19.5
 */
router.get('/infrastructure', protectInternal, authorizeInternalRoles('operations_manager', 'platform_admin', 'superuser'), async (req, res) => {
  try {
    // Database metrics
    const dbSizeQuery = await sequelize.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const databaseSize = parseInt(dbSizeQuery[0]?.database_size || 0);
    const databaseSizePretty = dbSizeQuery[0]?.database_size_pretty || '0 bytes';

    // Table sizes
    const tableSizes = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Connection pool status
    const poolStatus = {
      total: sequelize.connectionManager.pool.size,
      active: sequelize.connectionManager.pool.used,
      idle: sequelize.connectionManager.pool.available,
      waiting: sequelize.connectionManager.pool.pending
    };

    // System resources
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

    const cpuInfo = os.cpus();
    const cpuCount = cpuInfo.length;
    const cpuModel = cpuInfo[0]?.model || 'Unknown';

    // Load average (Unix-like systems only)
    const loadAverage = os.loadavg();

    // System uptime
    const systemUptime = os.uptime();

    // Process memory usage
    const processMemory = process.memoryUsage();

    // Storage usage (simplified - in production, use actual filesystem checks)
    const storageUsage = {
      total: 100 * 1024 * 1024 * 1024, // 100 GB placeholder
      used: databaseSize + (processMemory.heapUsed * 10), // Rough estimate
      available: 100 * 1024 * 1024 * 1024 - (databaseSize + (processMemory.heapUsed * 10))
    };
    storageUsage.usagePercent = ((storageUsage.used / storageUsage.total) * 100).toFixed(2);

    // Backup status (placeholder - in production, check actual backup system)
    const lastBackupTime = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago placeholder
    const backupStatus = {
      lastBackup: lastBackupTime.toISOString(),
      status: 'completed',
      nextScheduled: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
      backupSize: formatBytes(databaseSize * 0.7) // Compressed backup estimate
    };

    // Infrastructure health status
    let infrastructureStatus = 'healthy';
    if (memoryUsagePercent > 90 || storageUsage.usagePercent > 90 || poolStatus.waiting > 10) {
      infrastructureStatus = 'critical';
    } else if (memoryUsagePercent > 75 || storageUsage.usagePercent > 75 || poolStatus.waiting > 5) {
      infrastructureStatus = 'warning';
    }

    res.json({
      success: true,
      data: {
        infrastructureStatus,
        timestamp: new Date().toISOString(),
        database: {
          size: databaseSize,
          sizePretty: databaseSizePretty,
          topTables: tableSizes.map(table => ({
            name: table.tablename,
            size: table.size,
            sizeBytes: parseInt(table.size_bytes)
          })),
          connectionPool: poolStatus,
          status: poolStatus.waiting > 10 ? 'critical' : poolStatus.waiting > 5 ? 'warning' : 'healthy'
        },
        system: {
          memory: {
            total: totalMemory,
            totalPretty: formatBytes(totalMemory),
            used: usedMemory,
            usedPretty: formatBytes(usedMemory),
            free: freeMemory,
            freePretty: formatBytes(freeMemory),
            usagePercent: parseFloat(memoryUsagePercent),
            status: memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 75 ? 'warning' : 'healthy'
          },
          cpu: {
            count: cpuCount,
            model: cpuModel,
            loadAverage: {
              '1min': loadAverage[0]?.toFixed(2) || 0,
              '5min': loadAverage[1]?.toFixed(2) || 0,
              '15min': loadAverage[2]?.toFixed(2) || 0
            }
          },
          uptime: {
            seconds: systemUptime,
            formatted: formatUptime(systemUptime)
          },
          platform: os.platform(),
          architecture: os.arch()
        },
        process: {
          memory: {
            heapUsed: processMemory.heapUsed,
            heapUsedPretty: formatBytes(processMemory.heapUsed),
            heapTotal: processMemory.heapTotal,
            heapTotalPretty: formatBytes(processMemory.heapTotal),
            rss: processMemory.rss,
            rssPretty: formatBytes(processMemory.rss),
            external: processMemory.external,
            externalPretty: formatBytes(processMemory.external)
          },
          uptime: {
            seconds: process.uptime(),
            formatted: formatUptime(process.uptime())
          },
          nodeVersion: process.version
        },
        storage: {
          total: storageUsage.total,
          totalPretty: formatBytes(storageUsage.total),
          used: storageUsage.used,
          usedPretty: formatBytes(storageUsage.used),
          available: storageUsage.available,
          availablePretty: formatBytes(storageUsage.available),
          usagePercent: parseFloat(storageUsage.usagePercent),
          status: storageUsage.usagePercent > 90 ? 'critical' : storageUsage.usagePercent > 75 ? 'warning' : 'healthy'
        },
        backup: backupStatus
      }
    });
  } catch (error) {
    console.error('Error fetching infrastructure metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch infrastructure metrics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to format uptime to human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = router;
