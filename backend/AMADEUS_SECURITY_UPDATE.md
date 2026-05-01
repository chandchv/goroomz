# Amadeus Integration - Security Update

**Date**: January 11, 2026  
**Update Type**: Security Enhancement  
**Status**: ✅ **COMPLETED**

---

## Summary

This document describes the security enhancements made to the Amadeus integration monitoring endpoints to protect sensitive operational data.

---

## Issue Description

### Original Problem

The Amadeus monitoring endpoints were publicly accessible without authentication:

- `/api/amadeus/metrics` - Exposed API usage statistics
- `/api/amadeus/requests` - Exposed request logs with parameters
- `/api/amadeus/config` - Exposed configuration details
- `/api/amadeus/clear-log` - Allowed anyone to clear logs

**Risk Level**: HIGH  
**Impact**: Sensitive operational data exposed to unauthorized users

---

## Solution Implemented

### Authentication Middleware Added

All monitoring endpoints now require authentication using the existing Firebase-based auth system.

#### Protected Endpoints

| Endpoint | Method | Required Roles | Description |
|----------|--------|----------------|-------------|
| `/api/amadeus/metrics` | GET | admin, superuser, internal_staff | API usage metrics |
| `/api/amadeus/requests` | GET | admin, superuser, internal_staff | Request log entries |
| `/api/amadeus/config` | GET | admin, superuser, internal_staff | Configuration summary |
| `/api/amadeus/clear-log` | POST | admin, superuser | Clear request log |

#### Public Endpoints (No Change)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/amadeus/health` | GET | Health check status |
| `/api/search/hotels` | GET | Unified hotel search |
| `/api/search/hotels/:id` | GET | Hotel details |

---

## Technical Changes

### Files Modified

#### 1. `projects/backend/routes/amadeus.js`

**Changes**:
- Added `protect` and `authorize` middleware imports
- Applied authentication to all monitoring endpoints
- Updated JSDoc comments to indicate access requirements

**Before**:
```javascript
router.get('/metrics', (req, res) => {
  // ... endpoint logic
});
```

**After**:
```javascript
router.get('/metrics', protect, authorize('admin', 'superuser', 'internal_staff'), (req, res) => {
  // ... endpoint logic
});
```

#### 2. `projects/backend/__tests__/routes/amadeus.test.js`

**Changes**:
- Added mock authentication middleware for testing
- All 27 tests updated and passing

---

## Authentication Flow

### How It Works

1. **Client Request**:
   ```bash
   curl -H "Authorization: Bearer <jwt_token>" \
     https://your-domain.com/api/amadeus/metrics
   ```

2. **Authentication Middleware** (`protect`):
   - Extracts JWT token from Authorization header
   - Verifies token with Firebase
   - Loads user from database
   - Attaches user to request object

3. **Authorization Middleware** (`authorize`):
   - Checks if user's role is in allowed roles list
   - Returns 403 if unauthorized
   - Proceeds to endpoint if authorized

4. **Endpoint Response**:
   - Returns requested data if authenticated and authorized
   - Returns 401 if not authenticated
   - Returns 403 if authenticated but not authorized

### Error Responses

#### 401 Unauthorized (No Token)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

#### 401 Unauthorized (Invalid Token)
```json
{
  "success": false,
  "message": "Token is not valid."
}
```

#### 403 Forbidden (Insufficient Permissions)
```json
{
  "success": false,
  "message": "User role user is not authorized to access this route"
}
```

---

## Testing

### Test Coverage

All 27 route tests passing with authentication:

```bash
npm test -- --run __tests__/routes/amadeus.test.js

Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

### Manual Testing

#### Test Authentication Required

```bash
# Without token (should fail with 401)
curl https://your-domain.com/api/amadeus/metrics

# Expected:
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

#### Test With Valid Token

```bash
# Get authentication token first
TOKEN=$(curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.token')

# Request with token (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics

# Expected: Metrics data returned
```

#### Test Authorization (Role Check)

```bash
# Login as regular user (not admin)
USER_TOKEN=$(curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.token')

# Try to access metrics (should fail with 403)
curl -H "Authorization: Bearer $USER_TOKEN" \
  https://your-domain.com/api/amadeus/metrics

# Expected:
{
  "success": false,
  "message": "User role user is not authorized to access this route"
}
```

---

## Deployment Impact

### Breaking Changes

**YES** - This is a breaking change for any clients currently accessing monitoring endpoints.

### Migration Required

If you have monitoring scripts or dashboards accessing these endpoints, you must update them to include authentication:

#### Before (No Auth)
```bash
curl https://your-domain.com/api/amadeus/metrics
```

#### After (With Auth)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics
```

### Affected Endpoints

- `/api/amadeus/metrics`
- `/api/amadeus/requests`
- `/api/amadeus/config`
- `/api/amadeus/clear-log`

### Not Affected

- `/api/amadeus/health` - Still public
- `/api/search/hotels` - Still public
- `/api/search/hotels/:id` - Still public

---

## Rollout Plan

### Phase 1: Update Code (Completed)

- [x] Add authentication middleware to routes
- [x] Update tests
- [x] Verify all tests passing
- [x] Update documentation

### Phase 2: Deploy to Staging

- [ ] Deploy updated code to staging
- [ ] Test authentication flow
- [ ] Update monitoring scripts with auth tokens
- [ ] Verify no regressions

### Phase 3: Deploy to Production

- [ ] Deploy updated code to production
- [ ] Update production monitoring scripts
- [ ] Verify authentication working
- [ ] Monitor for any issues

### Phase 4: Update Documentation

- [ ] Update API documentation
- [ ] Notify team of changes
- [ ] Update monitoring dashboards
- [ ] Update runbooks

---

## Security Considerations

### Improvements

✅ **Monitoring endpoints now protected**  
✅ **Role-based access control implemented**  
✅ **Sensitive data only accessible to authorized users**  
✅ **Audit trail via authentication logs**

### Remaining Considerations

1. **Token Expiration**: Ensure monitoring scripts handle token refresh
2. **Service Accounts**: Consider creating dedicated service accounts for monitoring
3. **Rate Limiting**: Consider adding rate limiting to monitoring endpoints
4. **IP Whitelisting**: Consider additional IP-based restrictions for production

---

## Monitoring Script Updates

### Example: Metrics Collection Script

**Before**:
```bash
#!/bin/bash
METRICS_URL="https://your-domain.com/api/amadeus/metrics"
curl -s "$METRICS_URL" > /var/log/amadeus-metrics.log
```

**After**:
```bash
#!/bin/bash
METRICS_URL="https://your-domain.com/api/amadeus/metrics"
AUTH_TOKEN="your_service_account_token_here"

curl -s -H "Authorization: Bearer $AUTH_TOKEN" "$METRICS_URL" \
  > /var/log/amadeus-metrics.log
```

### Example: Monitoring Dashboard

**Before**:
```javascript
fetch('https://your-domain.com/api/amadeus/metrics')
  .then(res => res.json())
  .then(data => updateDashboard(data));
```

**After**:
```javascript
const token = getAuthToken(); // Get from auth service

fetch('https://your-domain.com/api/amadeus/metrics', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => updateDashboard(data));
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (Remove Auth)

```javascript
// In routes/amadeus.js, temporarily remove auth middleware

// Before (with auth)
router.get('/metrics', protect, authorize('admin', 'superuser', 'internal_staff'), (req, res) => {

// After (without auth - temporary)
router.get('/metrics', (req, res) => {
```

**Note**: This should only be used as a temporary measure. The proper fix is to update monitoring scripts with authentication.

---

## Support

### Questions or Issues?

- **Backend Team**: backend@your-domain.com
- **Security Team**: security@your-domain.com
- **DevOps Team**: devops@your-domain.com

### Documentation

- **Authentication Guide**: `projects/backend/docs/AUTHENTICATION.md`
- **API Reference**: `projects/backend/docs/AMADEUS_API.md`
- **Deployment Guide**: `projects/backend/AMADEUS_DEPLOYMENT_GUIDE.md`

---

## Checklist

### Pre-Deployment

- [x] Code changes implemented
- [x] Tests updated and passing
- [x] Documentation updated
- [ ] Staging deployment tested
- [ ] Monitoring scripts updated
- [ ] Team notified of changes

### Post-Deployment

- [ ] Production deployment successful
- [ ] Authentication working correctly
- [ ] Monitoring scripts functioning
- [ ] No unauthorized access attempts
- [ ] Team trained on new auth requirements

---

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Status**: Security enhancement completed, ready for deployment
