# Login Troubleshooting Guide

## Issue: Unable to Login to Internal Management Dashboard

If you've created a superuser but can't log in, follow these steps to diagnose and fix the issue.

## ⚠️ IMPORTANT FIX APPLIED - Email Dot Removal Issue

**Issue:** The `express-validator` middleware was removing dots from Gmail addresses during validation, causing login failures when the database stored emails with dots.

**Example:**
- Database: `chandchv.gsr@gmail.com` (with dot)
- User enters: `chandchv.gsr@gmail.com` (with dot)  
- Middleware normalized to: `chandchvgsr@gmail.com` (without dot)
- Result: No match found ❌

**Fix Applied:** Updated `backend/middleware/validation.js` to preserve dots:
```javascript
.normalizeEmail({ gmail_remove_dots: false })
```

**Action Required:** Restart your backend server for the fix to take effect:
```bash
cd backend
npm run dev
```

## Quick Diagnosis

### Step 1: Check Your User Account

Run this command to see your user details:

```bash
cd backend
npm run checkuser chandchvgsr@gmail.com
```

This will show you:
- ✅ If the user exists
- ✅ User's role and permissions
- ✅ Whether they have a password set
- ✅ If they have internal management access
- ✅ Option to test your password

### Step 2: Fix Permissions (If Needed)

If the user exists but doesn't have proper permissions:

```bash
npm run fix-permissions chandchvgsr@gmail.com
```

This will:
- Set role to `admin`
- Set staff role to `manager`
- Grant all permissions
- Enable full internal management access

## Common Issues & Solutions

### Issue 1: "Invalid credentials"

**Possible Causes:**
- Wrong email or password
- Email case mismatch
- Password not set

**Solutions:**

1. **Verify your email:**
   ```bash
   npm run checkuser your-email@example.com
   ```

2. **Test your password:**
   The checkuser script will let you test if your password is correct

3. **Create a new superuser:**
   ```bash
   npm run createsuperuser
   ```

### Issue 2: "Access denied. This login is for internal management staff only."

**Cause:** User doesn't have the right role or staff role

**Solution:**
```bash
npm run fix-permissions your-email@example.com
```

This updates the user to have admin access.

### Issue 3: "This account uses social login"

**Cause:** User was created via Firebase/Google login and has no password

**Solution:**

You need to set a password for this user. Run this SQL query:

```sql
-- First, hash a password using bcrypt (use an online tool or Node.js)
-- Then update the user:
UPDATE users 
SET password = '$2a$10$YOUR_HASHED_PASSWORD_HERE',
    role = 'admin',
    staff_role = 'manager',
    permissions = '{"canCheckIn":true,"canCheckOut":true,"canManageRooms":true,"canRecordPayments":true,"canViewReports":true,"canManageStaff":true,"canUpdateRoomStatus":true,"canManageMaintenance":true}'
WHERE email = 'your-email@example.com';
```

Or create a new superuser with a different email:
```bash
npm run createsuperuser
```

### Issue 4: User Not Found

**Cause:** User doesn't exist in database

**Solution:**
```bash
npm run createsuperuser
```

### Issue 5: Database Connection Error

**Cause:** PostgreSQL not running or wrong credentials

**Solutions:**

1. **Check PostgreSQL is running:**
   ```bash
   # Windows
   services.msc  # Look for PostgreSQL service
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. **Verify .env file:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=goroomz
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

3. **Test database connection:**
   ```bash
   npm run setup
   ```

## Detailed Diagnostic Steps

### 1. Check User Exists and Has Correct Setup

```bash
npm run checkuser chandchvgsr@gmail.com
```

**Expected Output:**
```
✓ Database connection established

✅ User found!

=== User Details ===
ID:           abc-123-def
Name:         Your Name
Email:        chandchvgsr@gmail.com
Role:         admin
Staff Role:   manager
Has Password: Yes

=== Permissions ===
  canCheckIn: true
  canCheckOut: true
  canManageRooms: true
  canRecordPayments: true
  canViewReports: true
  canManageStaff: true
  canUpdateRoomStatus: true
  canManageMaintenance: true

=== Internal Management Access ===
✅ User HAS access to internal management system
```

### 2. Test Password

When prompted by the checkuser script, enter your password to verify it's correct.

### 3. Fix Permissions

If permissions are wrong:

```bash
npm run fix-permissions chandchvgsr@gmail.com
```

### 4. Try Logging In Again

1. Go to your internal management system URL
2. Navigate to `/login`
3. Enter your email: `chandchvgsr@gmail.com`
4. Enter your password
5. Click "Login"

## Manual Database Check

If scripts don't work, check the database directly:

```sql
-- Connect to PostgreSQL
psql -U postgres -d goroomz

-- Check user
SELECT 
  id, 
  name, 
  email, 
  role, 
  staff_role, 
  permissions,
  password IS NOT NULL as has_password
FROM users 
WHERE email = 'chandchvgsr@gmail.com';
```

**What to look for:**
- `role` should be `admin`
- `staff_role` should be `manager`
- `has_password` should be `true`
- `permissions` should have all values set to `true`

## Still Having Issues?

### Check Backend Logs

Start the backend with logging:

```bash
cd backend
npm run dev
```

Try to log in and watch the console for errors.

### Check Frontend Console

Open browser DevTools (F12) and check:
1. **Network tab:** Look for the login request
2. **Console tab:** Look for JavaScript errors
3. **Application tab:** Check if token is being stored

### Verify API Endpoint

Test the login endpoint directly:

```bash
curl -X POST http://localhost:5000/api/internal/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "chandchvgsr@gmail.com",
    "password": "your-password"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc-123",
    "name": "Your Name",
    "email": "chandchvgsr@gmail.com",
    "role": "admin",
    "staffRole": "manager",
    "permissions": { ... }
  }
}
```

## Prevention

To avoid these issues in the future:

1. **Always use the createsuperuser script:**
   ```bash
   npm run createsuperuser
   ```

2. **Keep track of your credentials** in a secure password manager

3. **Test login immediately** after creating the account

4. **Use strong, memorable passwords** (minimum 8 characters)

## Quick Reference Commands

```bash
# Check user details
npm run checkuser <email>

# Fix user permissions
npm run fix-permissions <email>

# Create new superuser
npm run createsuperuser

# Quick superuser creation
npm run createsuperuser:quick <email> <password> <name>

# Reset database (⚠️ deletes all data)
npm run reset
npm run setup
npm run createsuperuser
```

## Need More Help?

1. Check the backend console for error messages
2. Check the browser console for frontend errors
3. Verify your `.env` file has correct settings
4. Make sure PostgreSQL is running
5. Try creating a new superuser with a different email
