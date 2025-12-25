# Internal Payment Management API Documentation

This document describes the payment management endpoints for the internal management system.

## Overview

The payment management system handles:
- Recording and tracking payments for bookings
- Managing payment schedules for PG (monthly) bookings
- Handling security deposits with deductions and refunds
- Tracking overdue payments

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Payment Recording

#### GET /api/internal/payments
Get all payments for property with filtering options.

**Query Parameters:**
- `bookingId` (optional): Filter by booking ID
- `paymentType` (optional): Filter by payment type (booking, monthly_rent, security_deposit)
- `status` (optional): Filter by status (pending, completed, failed, refunded)
- `startDate` (optional): Filter by payment date (start)
- `endDate` (optional): Filter by payment date (end)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "amount": "1500.00",
      "paymentDate": "2024-01-15",
      "paymentMethod": "cash",
      "transactionReference": "TXN123",
      "paymentType": "booking",
      "status": "completed",
      "recordedBy": "uuid",
      "notes": "Payment received",
      "booking": {
        "id": "uuid",
        "checkIn": "2024-01-15",
        "checkOut": "2024-01-20",
        "totalAmount": "3000.00",
        "room": {
          "id": "uuid",
          "title": "Deluxe Room",
          "roomNumber": "101",
          "floorNumber": 1
        },
        "user": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "1234567890"
        }
      },
      "recorder": {
        "id": "uuid",
        "name": "Staff Member",
        "email": "staff@example.com"
      }
    }
  ]
}
```

#### POST /api/internal/payments
Record a new payment.

**Required Permission:** `canRecordPayments`

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 1500.00,
  "paymentMethod": "cash",
  "transactionReference": "TXN123",
  "paymentType": "booking",
  "notes": "Payment received"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": { /* payment object */ },
  "remainingBalance": 1500.00
}
```

#### PUT /api/internal/payments/:id
Update an existing payment.

**Required Permission:** `canRecordPayments`

**Request Body:**
```json
{
  "amount": 1600.00,
  "paymentMethod": "card",
  "transactionReference": "TXN124",
  "status": "completed",
  "notes": "Updated payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment updated successfully",
  "data": { /* updated payment object */ }
}
```

#### GET /api/internal/payments/overdue
Get all overdue payments.

**Query Parameters:**
- `floor` (optional): Filter by floor number
- `roomNumber` (optional): Filter by room number

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "bedId": "uuid",
      "dueDate": "2024-01-01",
      "amount": "5000.00",
      "status": "overdue",
      "daysOverdue": 15,
      "booking": {
        "id": "uuid",
        "checkIn": "2024-01-01",
        "checkOut": "2024-07-01",
        "room": {
          "roomNumber": "201",
          "floorNumber": 2
        },
        "user": {
          "name": "Jane Doe",
          "email": "jane@example.com",
          "phone": "9876543210"
        }
      },
      "bed": {
        "id": "uuid",
        "bedNumber": 1
      }
    }
  ]
}
```

### Payment Schedule Management (PG)

#### GET /api/internal/payments/schedule/:bookingId
Get payment schedule for a booking.

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "checkIn": "2024-01-01",
    "checkOut": "2024-07-01",
    "totalAmount": "30000.00",
    "room": { /* room details */ },
    "user": { /* user details */ }
  },
  "count": 6,
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "bedId": "uuid",
      "dueDate": "2024-01-01",
      "amount": "5000.00",
      "status": "paid",
      "paidDate": "2024-01-01",
      "paymentId": "uuid",
      "payment": {
        "id": "uuid",
        "amount": "5000.00",
        "paymentDate": "2024-01-01",
        "paymentMethod": "upi",
        "transactionReference": "UPI123"
      },
      "bed": {
        "id": "uuid",
        "bedNumber": 1
      }
    }
  ]
}
```

#### POST /api/internal/payments/schedule
Create payment schedule for a PG booking.

**Required Permission:** `canRecordPayments`

**Request Body:**
```json
{
  "bookingId": "uuid",
  "monthlyAmount": 5000.00,
  "numberOfMonths": 6,
  "startDate": "2024-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment schedule created successfully",
  "count": 6,
  "data": [ /* array of payment schedule objects */ ]
}
```

### Security Deposit Management

#### POST /api/internal/deposits
Record a security deposit.

**Required Permission:** `canRecordPayments`

**Request Body:**
```json
{
  "bookingId": "uuid",
  "amount": 5000.00,
  "paymentMethod": "cash",
  "notes": "Security deposit collected"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Security deposit recorded successfully",
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": "5000.00",
    "collectedDate": "2024-01-15",
    "paymentMethod": "cash",
    "status": "collected",
    "notes": "Security deposit collected",
    "booking": { /* booking details */ }
  }
}
```

#### PUT /api/internal/deposits/:id/refund
Process security deposit refund with deductions.

**Required Permission:** `canRecordPayments`

**Request Body:**
```json
{
  "deductions": [
    {
      "reason": "Damaged furniture",
      "amount": 500.00
    },
    {
      "reason": "Late checkout fee",
      "amount": 200.00
    }
  ],
  "notes": "Refund processed with deductions"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Security deposit refund processed successfully",
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": "5000.00",
    "status": "partially_refunded",
    "refundAmount": "4300.00",
    "refundDate": "2024-01-20",
    "deductions": [
      {
        "reason": "Damaged furniture",
        "amount": 500
      },
      {
        "reason": "Late checkout fee",
        "amount": 200
      }
    ],
    "refundedBy": "uuid",
    "booking": { /* booking details */ },
    "refunder": {
      "id": "uuid",
      "name": "Staff Member",
      "email": "staff@example.com"
    }
  },
  "summary": {
    "originalAmount": 5000.00,
    "totalDeductions": 700.00,
    "refundAmount": 4300.00
  }
}
```

#### GET /api/internal/deposits/:bookingId
Get security deposit information for a booking.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "amount": "5000.00",
    "collectedDate": "2024-01-15",
    "paymentMethod": "cash",
    "status": "collected",
    "refundAmount": null,
    "refundDate": null,
    "deductions": [],
    "notes": "Security deposit collected",
    "booking": { /* booking details */ }
  }
}
```

## Payment Methods

Valid payment methods:
- `cash`
- `card`
- `upi`
- `bank_transfer`

## Payment Types

Valid payment types:
- `booking` - One-time booking payment
- `monthly_rent` - Monthly rent for PG
- `security_deposit` - Security deposit payment

## Payment Status

Valid payment statuses:
- `pending` - Payment not yet received
- `completed` - Payment successfully received
- `failed` - Payment failed
- `refunded` - Payment refunded

## Payment Schedule Status

Valid payment schedule statuses:
- `pending` - Payment not yet due or not paid
- `paid` - Payment completed
- `overdue` - Payment past due date

## Security Deposit Status

Valid security deposit statuses:
- `collected` - Deposit collected, not yet refunded
- `refunded` - Deposit fully refunded
- `partially_refunded` - Deposit partially refunded with deductions

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "message": "Error message description",
  "error": "Detailed error information"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

## Requirements Validation

This implementation validates the following requirements:

### Payment Recording (Requirements 21.1-21.4, 22.1-22.2)
- ✅ 21.1: Record payment with amount, date, method, and transaction reference
- ✅ 21.2: Handle partial payments and calculate remaining balance
- ✅ 21.3: Update payment status when booking is fully paid
- ✅ 21.4: Display payment history in chronological order
- ✅ 22.1: Display overdue payments with resident details
- ✅ 22.2: Sort overdue payments by days overdue, amount, or name

### Payment Schedule (Requirements 20.1-20.5)
- ✅ 20.1: Create payment schedule with monthly due dates on check-in
- ✅ 20.2: Display payment status as pending for each bed
- ✅ 20.3: Update payment status to paid when payment recorded
- ✅ 20.4: Calculate days overdue for overdue payments
- ✅ 20.5: Display individual payment status for each occupied bed

### Security Deposits (Requirements 29.1-29.4)
- ✅ 29.1: Record security deposit amount and payment method
- ✅ 29.2: Display security deposit status (collected, pending, refunded)
- ✅ 29.3: Process refund with deduction reasons
- ✅ 29.4: Record deduction amount, reason, and remaining refund amount
