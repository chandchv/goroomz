# Session Cookie and Auto-Redirect Implementation

## Overview

Implemented HTTP-only session cookies for persistent authentication and automatic role-based dashboard redirection for the GoRoomz Internal Management System.

## Changes Made

### Backend Changes

#### 1. Cookie Parser Installation
- Installed `cookie-parser` package
- Added cookie parser middleware to `backend/server.js`

#### 2. Authentication Routes (`backend/routes/internal/auth.js`)
- **Login Route**: Now sets HTTP-only cookie with JWT token
  - Cookie name: `auth_token`
  - Security features:
    - `httpOnly: true` - Prevents XSS attacks
    - `secure: true` (production only) - HTTPS only
    - `sameSite: 'strict'` - CSRF protection
    - `maxAge: 7 days` - Session duration
- **Logout Route**: Clears the session cookie
- **Last Login Tracking**: Updates `lastLoginAt` timestamp on successful login

#### 3. Authentication Middleware (`backend/middleware/internalAuth.js`)
- Updated `protectInternal` middleware to check for tokens in:
  1. Authorization header (Bearer token) - for API calls
  2. HTTP-only cookie - for browser sessions
- Maintains backward compatibility with existing token-based auth

### Frontend Changes

#### 1. Auth Context (`internal-management/app/contexts/AuthContext.tsx`)
- Enhanced to check for both localStorage tokens and cookie sessions
- Automatically verifies session on app load
- Maintains user state across page refreshes

#### 2. Auth Service (`internal-management/app/services/authService.ts`)
- Updated `getCurrentUser()` to properly parse backend response format
- Handles both `{ user: {...} }` and direct user object responses

#### 3. Role Redirect Utility (`internal-management/app/utils/roleRedirect.ts`)
- New utility file with centralized role-to-dashboard mapping
- Functions:
  - `getRoleDashboardPath(internalRole)` - Returns dashboard path for role
  - `isOnCorrectDashboard(currentPath, internalRole)` - Validates current location

#### 4. Login Page (`internal-management/app/pages/LoginPage.tsx`)
- Uses `getRoleDashboardPath()` utility for consistent redirection
- Redirects to role-specific dashboard after successful login

#### 5. Home Route (`internal-management/app/routes/home.tsx`)
- Automatically redirects authenticated users to their assigned dashboard
- Redirects unauthenticated users to login page
- Uses `replace: true` to prevent back button issues

## Role-Based Dashboard Mapping

| Internal Role | Dashboard Path |
|--------------|----------------|
| `agent` | `/agent-dashboard` |
| `regional_manager` | `/regional-manager-dashboard` |
| `operations_manager` | `/operations-manager-dashboard` |
| `platform_admin` | `/platform-admin-dashboard` |
| `superuser` | `/superuser-dashboard` |
| None (property owners/staff) | `/dashboard` |

## Security Features

### HTTP-Only Cookies
- Cookies are not accessible via JavaScript
- Prevents XSS attacks from stealing tokens
- Automatically sent with every request to the backend

### CSRF Protection
- `sameSite: 'strict'` prevents cross-site request forgery
- Cookies only sent to same-origin requests

### Secure Transmission
- In production, cookies are only sent over HTTPS
- Prevents man-in-the-middle attacks

### Token Expiration
- Tokens expire after 7 days
- Users must re-authenticate after expiration
- Expired tokens are automatically cleared

## User Experience Improvements

### Persistent Sessions
- Users remain logged in across browser sessions
- No need to re-enter credentials on every visit
- Session persists for 7 days

### Automatic Redirection
- Users are automatically redirected to their assigned dashboard
- No manual navigation required after login
- Consistent experience across all entry points

### Seamless Navigation
- Visiting root URL (`/`) automatically redirects to appropriate dashboard
- Back button works correctly (uses `replace: true`)
- No intermediate loading screens

## Testing

### Test Scenarios

1. **Login Flow**
   - Login with valid credentials
   - Verify cookie is set in browser
   - Verify redirect to correct dashboard
   - Check `lastLoginAt` is updated in database

2. **Session Persistence**
   - Login and close browser
   - Reopen browser and visit site
   - Verify automatic login and redirect

3. **Logout Flow**
   - Click logout
   - Verify cookie is cleared
   - Verify redirect to login page
   - Verify cannot access protected routes

4. **Role-Based Redirection**
   - Test each role (agent, regional_manager, etc.)
   - Verify correct dashboard is loaded
   - Verify appropriate permissions are enforced

5. **Token Expiration**
   - Wait for token to expire (or manually expire)
   - Verify user is redirected to login
   - Verify cookie is cleared

## Backward Compatibility

- Existing localStorage token authentication still works
- API calls can still use Bearer token in headers
- No breaking changes to existing functionality
- Gradual migration path for existing sessions

## Environment Variables

No new environment variables required. Uses existing:
- `JWT_SECRET` - For token signing
- `JWT_EXPIRE` - Token expiration time (default: 7d)
- `NODE_ENV` - Determines cookie security settings

## Browser Support

HTTP-only cookies are supported by all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅

## Future Enhancements

1. **Remember Me Option**
   - Allow users to choose session duration
   - Shorter sessions for shared devices

2. **Multi-Device Management**
   - Track active sessions per user
   - Allow users to revoke sessions from other devices

3. **Token Refresh**
   - Implement refresh tokens for extended sessions
   - Automatic token renewal before expiration

4. **Session Activity Tracking**
   - Log all session activities
   - Alert on suspicious login patterns

## Deployment Notes

### Production Checklist
- [ ] Ensure `NODE_ENV=production` is set
- [ ] Verify HTTPS is enabled
- [ ] Test cookie functionality in production environment
- [ ] Monitor session-related errors in logs
- [ ] Verify CORS settings allow credentials

### CORS Configuration
Ensure backend CORS is configured with:
```javascript
cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true // Required for cookies
})
```

## Troubleshooting

### Cookies Not Being Set
- Check CORS `credentials: true` is set
- Verify frontend and backend are on same domain (or proper CORS setup)
- Check browser console for cookie errors

### Automatic Login Not Working
- Verify cookie is present in browser DevTools
- Check token hasn't expired
- Verify `/api/internal/auth/me` endpoint is accessible

### Redirect Loop
- Check role mapping in `getRoleDashboardPath()`
- Verify user has valid `internalRole` in database
- Check for conflicting route guards

## Files Modified

### Backend
- `backend/package.json` - Added cookie-parser dependency
- `backend/server.js` - Added cookie parser middleware
- `backend/routes/internal/auth.js` - Cookie management in login/logout
- `backend/middleware/internalAuth.js` - Cookie token extraction

### Frontend
- `internal-management/app/contexts/AuthContext.tsx` - Cookie session detection
- `internal-management/app/services/authService.ts` - Response parsing
- `internal-management/app/pages/LoginPage.tsx` - Role-based redirect
- `internal-management/app/routes/home.tsx` - Auto-redirect logic
- `internal-management/app/utils/roleRedirect.ts` - New utility file

## Conclusion

The session cookie implementation provides a secure, user-friendly authentication experience with automatic role-based redirection. Users can now stay logged in across browser sessions and are automatically directed to their appropriate dashboard based on their role.
