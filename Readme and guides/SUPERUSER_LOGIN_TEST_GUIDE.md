# Superuser Login Test Guide

## Issue Fixed
The backend was not returning the `internalRole` field in the login response, causing superusers to be redirected to the wrong dashboard.

## What Was Changed

### Backend (`backend/routes/internal/auth.js`)
- ✅ Added `internalRole` to login response
- ✅ Added `internalPermissions` to login response
- ✅ Added internal role fields (territoryId, managerId, commissionRate)
- ✅ Updated `/me` and `/verify` endpoints

### Frontend (Already Fixed)
- ✅ Login redirects based on `internalRole`
- ✅ Dashboard menu item is role-aware
- ✅ Sidebar shows correct items based on role

## Testing Steps

### Step 1: Restart Backend
```bash
cd backend
npm start
```

### Step 2: Check User Role
```bash
cd backend
node scripts/checkSuperuserRole.js <your-email>
```

**Expected Output:**
```
✅ User IS a Superuser
✅ Should have access to Superuser Dashboard
```

**If you see "User does NOT have an internal role":**
```bash
node scripts/setSuperuserRole.js <your-email>
```

### Step 3: Clear Browser Data
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Close all tabs for the app

### Step 4: Test Login
1. Go to login page
2. Login with superuser credentials
3. **Expected:** Redirect to `/superuser-dashboard`
4. **Check:** Browser console should show user object with `internalRole: "superuser"`

### Step 5: Test Navigation
1. Click "Dashboard" in sidebar
2. **Expected:** Stay on `/superuser-dashboard`
3. Navigate to other pages
4. Click "Dashboard" again
5. **Expected:** Return to `/superuser-dashboard`

### Step 6: Verify Menu Items
Check that sidebar shows:
- ✅ Property section (Dashboard, Floor View, etc.)
- ✅ Financial section
- ✅ Operations section
- ✅ Management section (including Property Owners)
- ✅ Internal Operations section (Leads, Commissions, etc.)
- ✅ Administration section (with Superuser Dashboard at top)

## Troubleshooting

### Problem: Still redirecting to `/dashboard`

**Check 1: Verify backend is returning internalRole**
```bash
# In browser console after login:
console.log(localStorage.getItem('auth_token'));

# Then make a request to /me endpoint
fetch('http://localhost:5000/api/internal/auth/me', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
}).then(r => r.json()).then(console.log);
```

Look for `internalRole: "superuser"` in the response.

**Check 2: Verify database has correct role**
```bash
cd backend
node scripts/checkSuperuserRole.js <your-email>
```

**Check 3: Clear everything and try again**
1. Logout
2. Clear localStorage
3. Clear cookies
4. Close browser
5. Restart backend
6. Login again

### Problem: Menu items not showing

**Check:** User object in React DevTools
1. Install React DevTools extension
2. Open DevTools → Components tab
3. Find AuthContext
4. Check user object has `internalRole: "superuser"`

### Problem: Backend not starting

**Check:** Environment variables
```bash
cd backend
cat .env | grep JWT_SECRET
```

Should have `JWT_SECRET` set.

## Success Criteria

✅ Login redirects to `/superuser-dashboard`
✅ Dashboard menu item points to `/superuser-dashboard`
✅ All superuser menu items visible
✅ Property Owners menu item visible
✅ Superuser Dashboard menu item visible in Administration section
✅ No need to logout/login to access correct dashboard

## API Response Verification

After login, the response should include:

```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "admin",
    "staffRole": null,
    "internalRole": "superuser",  // ← This is the key field
    "permissions": {},
    "internalPermissions": {
      "canManageInternalUsers": true,
      "canManageRoles": true,
      "canViewAuditLogs": true,
      ...
    }
  }
}
```

## Need Help?

Run the diagnostic script:
```bash
cd backend
node scripts/checkSuperuserRole.js <your-email>
```

This will show you exactly what's in the database and what should be returned by the API.
