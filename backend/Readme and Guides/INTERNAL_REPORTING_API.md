# Internal Management Reporting API

This document describes the reporting endpoints for the Internal Management System.

## Overview

The reporting API provides comprehensive analytics and insights for property management, including:
- Occupancy reports
- Revenue reports
- Booking reports
- Housekeeping reports
- Payment collection reports (PG-specific)
- Export functionality (CSV format)

All endpoints require authentication via JWT token in the Authorization header.

## Endpoints

### 1. Occupancy Report

**GET** `/api/internal/reports/occupancy`

Generates an occupancy report showing room utilization for a specified date range.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "days": 31
    },
    "totalRooms": 50,
    "occupiedRooms": 35,
    "vacantRooms": 15,
    "occupancyPercentage": 70.00,
    "byCategory": [
      {
        "category": "Deluxe",
        "totalRooms": 20,
        "occupancyPercentage": 75.00
      }
    ],
    "byFloor": [
      {
        "floor": 1,
        "totalRooms": 10,
        "occupancyPercentage": 80.00
      }
    ]
  }
}
```

**Validates Requirements:** 23.1, 23.2, 23.3, 23.4

---

### 2. Revenue Report

**GET** `/api/internal/reports/revenue`

Generates a revenue report showing income from bookings and payments.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID
- `compareWithPrevious` (optional): Set to 'true' to include period comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totalRevenue": 150000.00,
    "totalPayments": 45,
    "byCategory": [
      {
        "category": "Deluxe",
        "revenue": 80000.00,
        "percentage": 53.33
      }
    ],
    "bySource": [
      {
        "source": "online",
        "revenue": 90000.00,
        "percentage": 60.00
      },
      {
        "source": "offline",
        "revenue": 60000.00,
        "percentage": 40.00
      }
    ],
    "byFloor": [
      {
        "floor": 1,
        "revenue": 50000.00
      }
    ],
    "paymentStatus": {
      "paid": 120000.00,
      "pending": 20000.00,
      "overdue": 10000.00
    },
    "comparison": {
      "previousPeriod": {
        "startDate": "2023-12-01",
        "endDate": "2023-12-31",
        "revenue": 140000.00
      },
      "change": 10000.00,
      "percentageChange": 7.14
    }
  }
}
```

**Validates Requirements:** 24.1, 24.2, 24.3, 24.4

---

### 3. Booking Report

**GET** `/api/internal/reports/bookings`

Generates a booking report showing booking statistics and trends.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totalBookings": 50,
    "statusBreakdown": {
      "pending": 5,
      "confirmed": 20,
      "completed": 20,
      "cancelled": 5,
      "completionRate": 40.00,
      "cancellationRate": 10.00
    },
    "sourceDistribution": {
      "online": 30,
      "offline": 20,
      "onlinePercentage": 60.00,
      "offlinePercentage": 40.00
    },
    "guestStatistics": {
      "totalGuests": 45,
      "repeatGuests": 10,
      "averageStayDuration": 3.5
    },
    "popularRoomTypes": [
      {
        "category": "Deluxe",
        "count": 25
      }
    ],
    "trends": [
      {
        "date": "2024-01-01",
        "count": 2
      }
    ]
  }
}
```

**Validates Requirements:** 25.1, 25.2, 25.3, 25.4

---

### 4. Housekeeping Report

**GET** `/api/internal/reports/housekeeping`

Generates a housekeeping report showing cleaning efficiency metrics.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totalRoomsCleaned": 150,
    "pendingTasks": 5,
    "averageCleaningTime": 35.5,
    "averageTurnoverTime": 120.0,
    "roomsCleanedPerDay": 4.8,
    "statusDistribution": [
      {
        "date": "2024-01-31",
        "occupied": 30,
        "vacant_clean": 15,
        "vacant_dirty": 5
      }
    ],
    "cleanerPerformance": [
      {
        "name": "John Doe",
        "roomsCleaned": 50,
        "averageTime": 32.0
      }
    ]
  }
}
```

**Validates Requirements:** 26.1, 26.2, 26.3, 26.4

---

### 5. Payment Collection Report (PG-specific)

**GET** `/api/internal/reports/payments`

Generates a payment collection report for PG properties showing collection efficiency and defaulters.

**Query Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "summary": {
      "totalCollected": 80000.00,
      "totalPending": 15000.00,
      "totalOverdue": 5000.00,
      "collectionEfficiency": 80.00
    },
    "paymentTiming": {
      "onTimePayments": 35,
      "latePayments": 10,
      "onTimePercentage": 77.78,
      "latePercentage": 22.22
    },
    "trends": [
      {
        "month": "2024-01",
        "collected": 80000.00,
        "count": 45
      }
    ],
    "defaulters": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "roomNumber": "101",
        "totalOverdue": 5000.00,
        "latePayments": 3,
        "totalPayments": 5,
        "latePaymentRate": 60.00
      }
    ]
  }
}
```

**Validates Requirements:** 27.1, 27.2, 27.3, 27.4

---

### 6. Export Report

**POST** `/api/internal/reports/export`

Exports a report to CSV format (PDF export not yet implemented).

**Request Body:**
```json
{
  "reportType": "occupancy",
  "format": "csv",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "propertyId": "uuid-here"
}
```

**Parameters:**
- `reportType` (required): One of: occupancy, revenue, bookings, housekeeping, payments
- `format` (required): csv or pdf (pdf returns 501 Not Implemented)
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `propertyId` (optional): Filter by specific property owner ID

**Response:**
- Content-Type: text/csv
- Content-Disposition: attachment; filename="[report-type]-report-[dates].csv"
- Body: CSV data

**CSV Formats:**

**Occupancy Report CSV:**
```csv
Room Number,Floor,Category,Status,Occupied Days
101,1,Deluxe,Occupied,15
102,1,Standard,Vacant,0
```

**Revenue Report CSV:**
```csv
Date,Room Number,Guest Name,Guest Email,Category,Booking Source,Amount,Payment Method
2024-01-15,101,"John Doe","john@example.com",Deluxe,online,5000,card
```

**Bookings Report CSV:**
```csv
Booking ID,Guest Name,Guest Email,Guest Phone,Room Number,Category,Check-In,Check-Out,Status,Source,Total Amount,Payment Status
uuid-1,"John Doe","john@example.com",1234567890,101,Deluxe,2024-01-01,2024-01-05,completed,online,10000,paid
```

**Housekeeping Report CSV:**
```csv
Date,Room Number,Floor,Cleaned By,Time Taken (minutes),Issues Found
2024-01-15,101,1,"Jane Smith",30,None
```

**Payments Report CSV:**
```csv
Resident Name,Email,Phone,Room Number,Bed Number,Due Date,Amount,Status,Payment Date,Payment Method,Days Overdue
"John Doe","john@example.com",1234567890,101,1,2024-01-15,5000,paid,2024-01-15,cash,0
```

**Validates Requirements:** 23.5, 24.5, 25.5, 26.5, 27.5

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Please provide startDate and endDate"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error generating report",
  "error": "Detailed error message"
}
```

**501 Not Implemented:**
```json
{
  "success": false,
  "message": "PDF export is not yet implemented. Please use CSV format."
}
```

---

## Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

The token must be obtained from the `/api/internal/auth/login` endpoint.

---

## Implementation Notes

1. **Occupancy Calculation**: Occupancy percentage is calculated as (occupied room-days / total available room-days) × 100
2. **Revenue Calculation**: Only includes completed payments in the specified date range
3. **Collection Efficiency**: Calculated as (total collected / total expected) × 100
4. **Defaulters**: Identified as residents with overdue amounts or late payment rate > 50%
5. **CSV Export**: All CSV files use UTF-8 encoding and include headers
6. **PDF Export**: Not yet implemented - returns 501 status code

---

## Future Enhancements

- PDF export functionality using pdfkit or puppeteer
- Custom date grouping (daily, weekly, monthly)
- Advanced filtering options
- Scheduled report generation
- Email report delivery
- Custom report builder

---

## Testing

The reporting endpoints have been implemented and integrated into the server. To test:

1. Start the server: `npm start`
2. Authenticate via `/api/internal/auth/login`
3. Use the JWT token to access reporting endpoints
4. Verify data is returned in the correct format

Example test with curl:
```bash
curl -X GET "http://localhost:5000/api/internal/reports/occupancy?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Related Files

- Implementation: `backend/routes/internal/reports.js`
- Server registration: `backend/server.js`
- Tests: `backend/tests/reports.test.js`
- Models: `backend/models/`
