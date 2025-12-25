# Postman Quick Start Guide - Bed API Testing

## 🚀 Quick Setup (5 minutes)

### Step 1: Import Collection
1. Open Postman
2. Click "Import" button
3. Select the file: `Bed_API_Testing.postman_collection.json`
4. Collection will appear in your sidebar

### Step 2: Test Credentials
Try these login credentials in order:

**Option 1 (Correct credentials):**
- Email: `amit.patel@example.com`
- Password: `Owner123!`

**Option 2 (Alternative):**
- Email: `test@goroomz.com`
- Password: `test123`

**Option 3 (If others fail):**
- Email: `admin@goroomz.com`
- Password: `admin123`

### Step 3: Run Tests in Order

**1. Health Check** ✅
- Should return: `{"status": "OK"}`
- No authentication needed

**2. Login - Get Auth Token** 🔑
- Use one of the credential sets above
- Token will be automatically saved for other requests
- Look for: `"success": true` and a long token string

**3. Get All Rooms** 🏠
- This will show you available room IDs
- Look for rooms with `"sharingType": "double"`
- Copy room IDs for testing

**4. Get Beds for Room 309** 🛏️ (MAIN TEST)
- This is the key test - should return bed data
- Look for: `"success": true` and bed array with UUIDs
- **If this works, the fix is successful!**

**5. Test Without Auth** ❌
- Should fail with 401 error
- Confirms authentication is working

**6. Test Invalid Room ID** ❌
- Should fail with 404 or "Room not found"
- Confirms validation is working

**7. Test Old Route** ❌
- Should fail with 404
- Confirms old route is removed

## 🎯 Success Indicators

### ✅ What Success Looks Like:

**Login Response:**
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

**Bed Endpoint Response:**
```json
{
  "success": true,
  "roomId": "610ba499-1376-4473-a476-e885d139c74d",
  "roomNumber": "309",
  "sharingType": "double",
  "count": 2,
  "data": [
    {
      "id": "real-uuid-here",
      "bedNumber": 1,
      "status": "vacant"
    }
  ]
}
```

### ❌ What Failure Looks Like:

**404 Error (Original Problem):**
```json
{
  "success": false,
  "message": "Route not found"
}
```

**401 Error (Expected for auth tests):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

## 🔧 Troubleshooting

### Problem: Login fails (401)
**Solutions:**
1. Try different email/password combinations above
2. Check if backend is running on port 5000
3. Verify request body format is JSON

### Problem: Bed endpoint returns 404
**This was the original issue - if still happening:**
1. Check URL is: `/api/internal/rooms/:id/beds` (not `/api/internal/beds/...`)
2. Verify backend was restarted with new code
3. Check room ID is valid

### Problem: Empty bed data
**Solutions:**
1. Room might not have beds created yet
2. Try different room IDs from the rooms list
3. Check if room is double sharing type

### Problem: 403 Forbidden
**Solutions:**
1. User doesn't own this property
2. Try different room IDs
3. Check user role and permissions

## 📋 Manual Testing Steps

If Postman isn't working, test manually:

### 1. Test Health (Browser)
Open: `http://localhost:5000/api/health`

### 2. Test Login (Command Line)
```bash
curl -X POST http://localhost:5000/api/internal/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"amit.patel@example.com","password":"Owner123!"}'
```

### 3. Test Bed Endpoint (Command Line)
```bash
curl -X GET http://localhost:5000/api/internal/rooms/610ba499-1376-4473-a476-e885d139c74d/beds \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎉 Expected Results

If the bed endpoint fix is working:
- ✅ Login succeeds and returns token
- ✅ Bed endpoint returns 200 status
- ✅ Response contains real bed UUIDs (not "bed-1", "bed-2")
- ✅ Beds show "vacant" status
- ✅ Room information is included

This confirms the backend restart was successful and the route fixes are working!

## 📞 Next Steps

Once Postman tests pass:
1. Test the frontend booking flow
2. Verify bed selection dropdown works
3. Complete a test booking
4. Remove debug logging

---

**Quick Test Command:**
```bash
# Test if backend is responding
curl http://localhost:5000/api/health
```

**Expected:** `{"status":"OK",...}`