# Platform Health Monitoring API

## Overview

This document describes the platform health monitoring endpoints that provide real-time insights into system performance, capacity, user activity, and infrastructure metrics for Operations Managers, Platform Administrators, and Superusers.

## Endpoints

### 1. GET /api/internal/health/metrics

**Description:** Returns overall platform health metrics including API response times, error rates, system uptime, and database status.

**Authorization:** Operations Manager, Platform Administrator, Superuser

**Response:**
```json
{
  "success": true,
  "data": {
    "overallStatus": "healthy|degraded|unhealthy",
    "timestamp": "2025-11-20T10:30:00.000Z",
    "metrics": {
      "apiResponseTime": {
        "value": 45,
        "unit": "ms",
        "status": "healthy",
        "threshold": {
          "healthy": 500,
          "degraded": 1000
        }
      },
      "errorRate": {
        "value": "0.50",
        "unit": "%",
        "status": "healthy",
        "threshold": {
          "healthy": 1,
          "degraded": 5
        }
      },
      "systemUptime": {
        "value": 86400,
        "unit": "seconds",
        "formatted": "1d 0h 0m 0s",
        "status": "healthy"
      },
      "databaseStatus": {
        "status": "healthy",
        "responseTime": 12,
        "unit": "ms"
      }
    },
    "recentActivity": {
      "lastHour": {
        "bookings": 15,
        "payments": 12,
        "leads": 5
      },
      "activeSessions": 45
    },
    "criticalIssues": {
      "urgentTickets": 2,
      "urgentMaintenance": 1,
      "total": 3
    }
  }
}
```

**Status Thresholds:**
- **Healthy:** API response < 500ms, error rate < 1%, database responsive
- **Degraded:** API response 500-1000ms, error rate 1-5%, database slow
- **Unhealthy:** API response > 1000ms, error rate > 5%, database unresponsive

---

### 2. GET /api/internal/health/capacity

**Description:** Returns capacity metrics for properties, rooms, bookings, users, and lead pipeline.

**Authorization:** Operations Manager, Platform Administrator, Superuser

**Response:**
```json
{
  "success": true,
  "data": {
    "capacityStatus": "healthy|warning|critical",
    "timestamp": "2025-11-20T10:30:00.000Z",
    "propertyCapacity": {
      "totalProperties": 150,
      "totalRooms": 1200,
      "occupiedRooms": 900,
      "availableRooms": 250,
      "maintenanceRooms": 30,
      "reservedRooms": 20,
      "occupancyRate": 75.00,
      "availabilityRate": 20.83
    },
    "bookingCapacity": {
      "currentMonth": {
        "totalBookings": 450,
        "confirmedBookings": 420,
        "checkedInBookings": 300,
        "pendingBookings": 30
      },
      "utilizationRate": "37.50"
    },
    "userCapacity": {
      "totalInternalUsers": 25,
      "totalPropertyOwners": 150,
      "roleBreakdown": {
        "agent": 15,
        "regional_manager": 5,
        "operations_manager": 3,
        "platform_admin": 1,
        "superuser": 1
      }
    },
    "leadPipelineCapacity": {
      "activeLeads": 45,
      "breakdown": {
        "contacted": 10,
        "inProgress": 25,
        "pendingApproval": 10
      },
      "averageLeadsPerAgent": "3.00"
    }
  }
}
```

**Capacity Status:**
- **Healthy:** Occupancy < 85%, availability > 10%
- **Warning:** Occupancy 85-95%, availability 5-10%
- **Critical:** Occupancy > 95%, availability < 5%

---

### 3. GET /api/internal/health/activity

**Description:** Returns user activity metrics including active users, concurrent sessions, peak usage times, and activity breakdown by type.

**Authorization:** Operations Manager, Platform Administrator, Superuser

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-11-20T10:30:00.000Z",
    "activeUsers": {
      "lastHour": 25,
      "last24Hours": 120,
      "lastWeek": 350,
      "breakdown": {
        "internal": 15,
        "property_owner": 105
      }
    },
    "concurrentSessions": {
      "current": 25,
      "estimated": 25
    },
    "peakUsageTimes": {
      "last24Hours": [
        { "hour": 14, "loginCount": 45 },
        { "hour": 10, "loginCount": 38 },
        { "hour": 16, "loginCount": 35 }
      ],
      "currentHour": 10
    },
    "activityByType": {
      "last24Hours": {
        "bookings": 85,
        "payments": 72,
        "leads": 15,
        "supportTickets": 8,
        "maintenance": 12,
        "housekeeping": 45,
        "total": 237
      }
    },
    "activityTrend": {
      "percentageChange": 12.50,
      "direction": "increasing",
      "comparison": {
        "current": 120,
        "previous": 107
      }
    }
  }
}
```

---

### 4. GET /api/internal/health/infrastructure

**Description:** Returns infrastructure metrics including database size, system resources, process memory, storage usage, and backup status.

**Authorization:** Operations Manager, Platform Administrator, Superuser

**Response:**
```json
{
  "success": true,
  "data": {
    "infrastructureStatus": "healthy|warning|critical",
    "timestamp": "2025-11-20T10:30:00.000Z",
    "database": {
      "size": 524288000,
      "sizePretty": "500 MB",
      "topTables": [
        {
          "name": "bookings",
          "size": "150 MB",
          "sizeBytes": 157286400
        },
        {
          "name": "rooms",
          "size": "80 MB",
          "sizeBytes": 83886080
        }
      ],
      "connectionPool": {
        "total": 10,
        "active": 3,
        "idle": 7,
        "waiting": 0
      },
      "status": "healthy"
    },
    "system": {
      "memory": {
        "total": 17179869184,
        "totalPretty": "16 GB",
        "used": 8589934592,
        "usedPretty": "8 GB",
        "free": 8589934592,
        "freePretty": "8 GB",
        "usagePercent": 50.00,
        "status": "healthy"
      },
      "cpu": {
        "count": 8,
        "model": "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz",
        "loadAverage": {
          "1min": "2.15",
          "5min": "1.98",
          "15min": "1.75"
        }
      },
      "uptime": {
        "seconds": 259200,
        "formatted": "3d 0h 0m 0s"
      },
      "platform": "linux",
      "architecture": "x64"
    },
    "process": {
      "memory": {
        "heapUsed": 52428800,
        "heapUsedPretty": "50 MB",
        "heapTotal": 104857600,
        "heapTotalPretty": "100 MB",
        "rss": 157286400,
        "rssPretty": "150 MB",
        "external": 2097152,
        "externalPretty": "2 MB"
      },
      "uptime": {
        "seconds": 86400,
        "formatted": "1d 0h 0m 0s"
      },
      "nodeVersion": "v18.17.0"
    },
    "storage": {
      "total": 107374182400,
      "totalPretty": "100 GB",
      "used": 53687091200,
      "usedPretty": "50 GB",
      "available": 53687091200,
      "availablePretty": "50 GB",
      "usagePercent": 50.00,
      "status": "healthy"
    },
    "backup": {
      "lastBackup": "2025-11-20T04:00:00.000Z",
      "status": "completed",
      "nextScheduled": "2025-11-21T04:00:00.000Z",
      "backupSize": "350 MB"
    }
  }
}
```

**Infrastructure Status:**
- **Healthy:** Memory < 75%, storage < 75%, no connection pool issues
- **Warning:** Memory 75-90%, storage 75-90%, connection pool waiting 5-10
- **Critical:** Memory > 90%, storage > 90%, connection pool waiting > 10

---

## Use Cases

### Operations Manager Dashboard
- Monitor overall platform health status
- Track capacity and identify properties at risk (low occupancy, high maintenance)
- View real-time activity metrics
- Receive alerts for critical issues

### Platform Administrator
- Monitor infrastructure metrics for capacity planning
- Track database growth and performance
- Monitor system resources and plan upgrades
- Review backup status and ensure data protection

### Superuser
- Complete visibility into all health metrics
- Infrastructure monitoring for technical decisions
- Performance optimization based on metrics
- System troubleshooting and diagnostics

---

## Implementation Details

### File Location
- **Route Handler:** `backend/routes/internal/health.js`
- **Server Registration:** `backend/server.js`
- **Tests:** `backend/tests/health.test.js`

### Dependencies
- Express.js for routing
- Sequelize for database queries
- Node.js `os` module for system metrics
- PostgreSQL for database metrics

### Authentication & Authorization
All endpoints require:
1. Valid JWT token (via `protectInternal` middleware)
2. Internal role of Operations Manager, Platform Administrator, or Superuser

### Performance Considerations
- Metrics are calculated on-demand (no caching)
- Database queries are optimized with aggregations
- System metrics use native Node.js APIs (minimal overhead)
- Response times typically < 500ms

### Future Enhancements
1. Add caching for frequently accessed metrics (Redis)
2. Implement historical trend storage
3. Add alerting thresholds configuration
4. Integrate with external monitoring tools (Prometheus, Grafana)
5. Add real-time WebSocket updates for critical metrics
6. Implement metric export for analysis (CSV, JSON)

---

## Testing

Run the test suite:
```bash
cd backend
npm test health.test.js
```

All tests should pass, covering:
- Platform health metrics endpoint
- Capacity metrics endpoint
- Activity metrics endpoint
- Infrastructure metrics endpoint
- Response structure validation
- Data type validation

---

## Requirements Satisfied

This implementation satisfies the following requirements from the Internal User Roles specification:

- **Requirement 19.1:** Platform health metrics (API response times, error rates, system uptime)
- **Requirement 19.2:** Capacity metrics (properties, rooms, bookings, users)
- **Requirement 19.3:** User activity metrics (active users, concurrent sessions, peak times)
- **Requirement 19.4:** Infrastructure metrics (database, system resources, storage)
- **Requirement 19.5:** Backup status and monitoring

---

## Error Handling

All endpoints include comprehensive error handling:
- Database connection failures
- Query execution errors
- Invalid data scenarios
- Permission denied errors

Error responses follow the standard format:
```json
{
  "success": false,
  "message": "Failed to fetch platform health metrics.",
  "error": "Detailed error message (development only)"
}
```
