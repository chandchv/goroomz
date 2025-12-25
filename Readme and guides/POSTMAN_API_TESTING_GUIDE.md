# Postman API Testing Guide - Bed Endpoints

## Overview
This guide will help you test the bed fetching API endpoints using Postman to verify the route fixes are working correctly.

## Prerequisites
- Postman installed
- Backend server running on `http://localhost:5000`
- Test user credentials

## Step-by-Step Testing

### Step 1: Test Health Endpoint (No Auth Required)

**Request:**
```
GET http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-20T02:29:36.139Z",
  "environment": "development"
}
```

### Step 2: Login to Get Authentication Token

**Request:**
```
POST http://localhost:5000/api/internal/auth/login
Content-Type: application/json

{
  "email": "amit.patel@example.com",
  "password": "Owner123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "15dc79c0-4629-4622-ae10-b771e1b6d706",
    "name": "Amit Patel",
    "email": "amit.patel@example.com",
    "role": "owner"
  }
}
```

**Important:** Copy the `token` value from the response - you'll need it for authenticated requests.

### Step 3: Test Bed Endpoint (Main Test)

**Request:**
```
GET http://localhost:5000/api/internal/rooms/610ba499-1376-4473-a476-e885d139c74d/beds
Authorization: Bearer YOUR_TOKEN_HERE
```

**Replace `YOUR_TOKEN_HERE` with the token from Step 2**

**Expected Response:**
```json
{
  "success": true,
  "roomId": "610ba499-1376-4473-a476-e885d139c74d",
  "roomNumber": "309",
  "sharingType": "double",
  "totalBeds": 2,
  "count": 2,
  "data": [
    {
      "id": "bed-uuid-1",
      "bedNumber": 1,
      "status": "vacant",
      "bookingId": null,
      "booking": null,
      "occupant": null,
      "createdAt": "2025-12-20T...",
      "updatedAt": "2025-12-20T..."
    },
    {
      "id": "bed-uuid-2",
      "bedNumber": 2,
      "status": "vacant",
      "bookingId": null,
      "booking": null,
      "occupant": null,
      "createdAt": "2025-12-20T...",
      "updatedAt": "2025-12-20T..."
    }
  ]
}
```

### Step 4: Test Other Double Sharing Rooms

Test these room IDs (all double sharing rooms 301-310):

**Room 301:**
```
GET http://localhost:5000/api/internal/rooms/ROOM_301_UUID/beds
Authorization: Bearer YOUR_TOKEN_HERE
```

**Room 302:**
```
GET http://localhost:5000/api/internal/rooms/ROOM_302_UUID/beds
Authorization: Bearer YOUR_TOKEN_HERE
```

*Continue for rooms 303-310...*

### Step 5: Test Error Cases

**Test with Invalid Room ID:**
```
GET http://localhost:5000/api/internal/rooms/invalid-room-id/beds
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Room not found or access denied."
}
```

**Test without Authentication:**
```
GET http://localhost:5000/api/internal/rooms/610ba499-1376-4473-a476-e885d139c74d/beds
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## Room IDs for Testing

Based on the previous context, here are the room IDs for double sharing rooms (301-310):

- **Room 309**: `610ba499-1376-4473-a476-e885d139c74d` (confirmed from context)
- **Other rooms**: You'll need to get these from the rooms endpoint first

### Get All Rooms First

**Request:**
```
GET http://localhost:5000/api/internal/rooms/status
Authorization: Bearer YOUR_TOKEN_HERE
```

This will return all rooms with their IDs, then you can test the bed endpoints for double sharing rooms.

## Troubleshooting

### Common Issues:

1. **401 Unauthorized**
   - Check if token is included in Authorization header
   - Verify token format: `Bearer YOUR_TOKEN_HERE`
   - Token might be expired - get a new one by logging in again

2. **404 Not Found**
   - ✅ This was the original issue - should be fixed now
   - Verify the URL is correct: `/api/internal/rooms/:id/beds`
   - Check if room ID exists

3. **403 Forbidden**
   - User doesn't have access to this room
   - Check data scoping - user can only access their own properties

4. **500 Internal Server Error**
   - Check backend logs
   - Database connection issues
   - Model association problems

## Success Criteria

✅ **Login works** - Returns token
✅ **Bed endpoint responds** - No 404 errors
✅ **Returns real bed data** - UUIDs instead of fake IDs
✅ **Authentication works** - Proper 401 when no token
✅ **Data scoping works** - User can access their rooms

## Alternative Test Users

If `amit.patel@example.com` doesn't work, try these:

1. **Create a test user first:**
```
POST http://localhost:5000/api/internal/auth/register
Content-Type: application/json

{
  "name": "Test Owner",
  "email": "test@example.com",
  "password": "password123",
  "role": "owner"
}
```

2. **Or check existing users:**
```
GET http://localhost:5000/api/internal/users
Authorization: Bearer YOUR_ADMIN_TOKEN
```

## Next Steps After Testing

1. If Postman tests pass ✅, the backend is working correctly
2. Test the frontend booking flow
3. Verify bed selection shows real UUIDs
4. Complete end-to-end booking creation
5. Remove debug logging once confirmed working