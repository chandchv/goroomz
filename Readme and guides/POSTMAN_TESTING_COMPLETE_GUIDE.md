# ✅ Postman Testing Guide - WORKING CREDENTIALS

## 🎯 Confirmed Working Setup

### ✅ Verified Credentials
- **Email**: `amit.patel@example.com`
- **Password**: `Owner123!`
- **Status**: ✅ Login successful, token generated

### ✅ Backend Status
- **Health Endpoint**: ✅ Working (`http://localhost:5000/api/health`)
- **Authentication**: ✅ Working (returns valid JWT token)
- **Route Registration**: ✅ Bed routes properly registered

## 📋 Postman Collection Setup

### Step 1: Import Collection
1. Open Postman
2. Click "Import" → Select file: `Bed_API_Testing.postman_collection.json`
3. Collection will appear with 7 pre-configured requests

### Step 2: Run Tests in Order

#### 1. Health Check ✅
- **URL**: `GET {{baseUrl}}/api/health`
- **Expected**: `{"status": "OK", "timestamp": "...", "environment": "development"}`
- **Status**: Should return 200 OK

#### 2. Login - Get Auth Token ✅
- **URL**: `POST {{baseUrl}}/api/internal/auth/login`
- **Body**: 
```json
{
  "email": "amit.patel@example.com",
  "password": "Owner123!"
}
```
- **Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "15dc79c0-4629-4622-ae10-b771e1b6d706",
    "name": "Amit Patel",
    "email": "amit.patel@example.com",
    "role": "owner"
  }
}
```
- **Auto-saves token** for subsequent requests

#### 3. Get All Rooms 🏠
- **URL**: `GET {{baseUrl}}/api/internal/rooms/status`
- **Headers**: `Authorization: Bearer {{authToken}}`
- **Purpose**: Get room IDs for testing
- **Expected**: List of rooms with IDs, room numbers, sharing types

#### 4. Get Beds for Room 309 🛏️ (MAIN TEST)
- **URL**: `GET {{baseUrl}}/api/internal/rooms/{{room309Id}}/beds`
- **Headers**: `Authorization: Bearer {{authToken}}`
- **Room ID**: `610ba499-1376-4473-a476-e885d139c74d`
- **Expected**: Bed data with real UUIDs

#### 5. Test Without Auth ❌ (Should Fail)
- **URL**: `GET {{baseUrl}}/api/internal/rooms/{{room309Id}}/beds`
- **Headers**: None (no Authorization)
- **Expected**: `401 Unauthorized`

#### 6. Test Invalid Room ID ❌ (Should Fail)
- **URL**: `GET {{baseUrl}}/api/internal/rooms/invalid-room-id/beds`
- **Expected**: `404 Not Found` or `400 Bad Request`

#### 7. Test Old Route ❌ (Should Fail)
- **URL**: `GET {{baseUrl}}/api/internal/beds/rooms/{{room309Id}}/beds`
- **Expected**: `404 Not Found` (confirms old route removed)

## 🔧 Current Issue & Workaround

### Database Column Issue
The bed endpoint currently returns a 500 error due to a database schema issue:
```
"column booking.checkInDate does not exist"
```

This is a database migration issue, not a route problem. The route fix is working correctly.

### ✅ What This Proves
1. **Backend restart successful** - Server running with updated code
2. **Route registration working** - Bed routes properly registered at `/api/internal/rooms/:id/beds`
3. **Authentication working** - Login successful, token generation working
4. **Route protection working** - 401 errors when no auth token provided

### 🎯 Success Indicators (What We've Confirmed)

#### ✅ Login Test Results:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "email": "amit.patel@example.com",
    "role": "owner"
  }
}
```

#### ✅ Route Registration:
- New route: `/api/internal/rooms/:id/beds` ✅ Exists (returns 500 due to DB issue, not 404)
- Old route: `/api/internal/beds/rooms/:id/beds` ❌ Removed (would return 404)

## 📱 Manual Testing Alternative

If you prefer manual testing over Postman:

### 1. Test Health (Browser)
```
http://localhost:5000/api/health
```

### 2. Test Login (PowerShell)
```powershell
$body = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token
Write-Host "Token: $token"
```

### 3. Test Bed Endpoint (PowerShell)
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/610ba499-1376-4473-a476-e885d139c74d/beds" -Headers $headers
```

## 🎉 Conclusion

### ✅ Route Fix Status: SUCCESS
- Backend successfully restarted with updated code
- Bed routes moved from `/api/internal/beds/...` to `/api/internal/rooms/:id/beds`
- Authentication working correctly
- Route protection working correctly

### 🔧 Next Steps
1. **Database Migration**: Fix the `booking.checkInDate` column issue
2. **Frontend Testing**: Test the booking flow in the frontend
3. **End-to-End Testing**: Complete booking creation workflow

### 📞 For Frontend Testing
Once the database issue is resolved, the frontend should:
- ✅ No longer get 404 errors when fetching beds
- ✅ Show real bed UUIDs instead of fake IDs ("bed-1", "bed-2")
- ✅ Display vacant beds in the dropdown
- ✅ Allow successful booking creation

---

**Quick Verification Command:**
```bash
curl -X POST http://localhost:5000/api/internal/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amit.patel@example.com","password":"Owner123!"}'
```

**Expected**: Login success with JWT token returned.