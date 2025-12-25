# Test Login Response

## Quick Test Steps

### 1. Make sure backend is running
```bash
cd backend
npm start
```

### 2. Test the login endpoint directly

Open your browser console (F12) and run:

```javascript
fetch('http://localhost:5000/api/internal/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'sekhar.iw@gmail.com',  // Replace with your email
    password: 'your-password'       // Replace with your password
  })
})
.then(r => r.json())
.then(data => {
  console.log('=== LOGIN RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n=== USER DATA ===');
  console.log('Internal Role:', data.user?.internalRole);
  console.log('Staff Role:', data.user?.staffRole);
  console.log('Role:', data.user?.role);
});
```

### 3. Check the response

You should see something like:

```json
{
  "success": true,
  "message": "Login successful",
  "token": "...",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "phone": null,
    "role": "admin",
    "staffRole": null,
    "internalRole": "superuser",  // ← THIS IS THE KEY FIELD
    "permissions": {},
    "internalPermissions": {
      "canManageInternalUsers": true,
      ...
    },
    "avatar": null,
    "territoryId": null,
    "managerId": null,
    "commissionRate": null
  }
}
```

### 4. What to check:

✅ `internalRole` field exists
✅ `internalRole` value is `"superuser"`
✅ `internalPermissions` object exists

### 5. If `internalRole` is null or missing:

The user doesn't have the superuser role set in the database. Run:

```bash
cd backend
node scripts/setSuperuserRole.js sekhar.iw@gmail.com
```

Then test the login endpoint again.

### 6. Test in the app

1. Clear browser localStorage
2. Login with your credentials
3. Open browser console
4. You should see logs:
   ```
   Login successful, user data: {...}
   Internal Role: superuser
   Redirecting to: /superuser-dashboard
   ```

### 7. If still redirecting to /dashboard:

Check the console logs. If you see:
```
Internal Role: null
Redirecting to: /dashboard
```

Then the backend is not returning the `internalRole` field, or the user doesn't have it set in the database.

## Common Issues

### Issue 1: Backend not returning internalRole

**Symptom:** Login response doesn't include `internalRole` field

**Solution:** 
1. Make sure you restarted the backend after the code changes
2. Check `backend/routes/internal/auth.js` includes `internalRole` in the response

### Issue 2: User doesn't have internalRole in database

**Symptom:** `internalRole` is `null` in the response

**Solution:**
```bash
cd backend
node scripts/setSuperuserRole.js <your-email>
```

### Issue 3: Frontend not reading internalRole

**Symptom:** Console shows `Internal Role: undefined`

**Solution:**
1. Clear browser cache
2. Make sure `authService.ts` interface includes `internalRole`
3. Make sure `AuthContext.tsx` User interface includes `internalRole`

## Debug Checklist

- [ ] Backend is running
- [ ] Backend code includes `internalRole` in auth response
- [ ] User has `internalRole` set in database
- [ ] Frontend interfaces include `internalRole`
- [ ] Browser localStorage is cleared
- [ ] Browser console shows correct `internalRole` value
- [ ] Redirect goes to `/superuser-dashboard`
