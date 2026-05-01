# Amadeus Integration - Production Deployment Guide

**Version**: 1.0  
**Last Updated**: January 11, 2026  
**Feature**: Amadeus Hotel API Integration

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Support and Contacts](#support-and-contacts)

---

## Overview

This guide provides step-by-step instructions for deploying the Amadeus Hotel API integration to production. The integration enables unified hotel search combining local properties with Amadeus's global hotel inventory.

### What This Deployment Includes

- ✅ Amadeus API authentication (OAuth2)
- ✅ Hotel search by city and coordinates
- ✅ Hotel details retrieval
- ✅ Unified search controller (local + Amadeus)
- ✅ Result merging, filtering, and sorting
- ✅ Caching layer (tokens, hotels, searches)
- ✅ Error handling with retry logic
- ✅ Monitoring and metrics endpoints
- ✅ Health check endpoint

### What This Deployment Does NOT Include

- ❌ Booking creation (Phase 2)
- ❌ Real-time availability checking (Phase 2)
- ❌ Pricing information (Phase 2)

---

## Prerequisites

### Required Before Starting

#### 1. Amadeus Production Credentials

**CRITICAL**: You must obtain production credentials from Amadeus before deployment.

**Steps to Obtain Credentials**:

1. **Visit Amadeus Developer Portal**
   - URL: https://developers.amadeus.com
   - Sign in or create an account

2. **Create Production Application**
   - Navigate to "My Apps"
   - Click "Create New App"
   - Select "Production" environment
   - Fill in application details:
     - App Name: "GoRoomz Production"
     - Description: "Hotel search integration for GoRoomz platform"
     - APIs: Select "Hotel List API"

3. **Get API Credentials**
   - After approval, you'll receive:
     - API Key (Client ID)
     - API Secret (Client Secret)
   - **IMPORTANT**: Store these securely - they cannot be retrieved later

4. **Note Production Endpoint**
   - Production URL: `https://api.amadeus.com`
   - Test URL: `https://test.api.amadeus.com` (current)

**Timeline**: Amadeus approval typically takes 1-3 business days.

#### 2. System Requirements

- **Node.js**: v14.x or higher
- **PostgreSQL**: v12.x or higher
- **Memory**: Minimum 512MB RAM for Amadeus service
- **Network**: Outbound HTTPS access to api.amadeus.com

#### 3. Access Requirements

- Production server SSH/deployment access
- Database admin access
- Environment variable configuration access
- Monitoring/logging system access

#### 4. Completed Tasks

Before deploying, ensure these tasks are complete:

- [ ] All critical test failures fixed (Property 12 & 13)
- [ ] Production credentials obtained from Amadeus
- [ ] Monitoring endpoints secured (authentication added)
- [ ] This deployment guide reviewed
- [ ] Rollback plan understood by team

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All unit tests passing (730/730)
- [ ] All property tests passing (25/25)
- [ ] Integration tests passing
- [ ] No console.log statements in production code
- [ ] Error handling covers all scenarios

### Configuration

- [ ] Production environment variables prepared
- [ ] Amadeus production credentials obtained
- [ ] Database connection tested
- [ ] Cache TTL values reviewed and approved
- [ ] Rate limiting configuration reviewed

### Security

- [ ] API credentials stored securely
- [ ] Monitoring endpoints protected with authentication
- [ ] No sensitive data in logs
- [ ] HTTPS enforced for all API calls
- [ ] Input validation implemented

### Documentation

- [ ] API documentation reviewed
- [ ] Team trained on new endpoints
- [ ] Support team briefed on integration
- [ ] Rollback procedures documented

### Monitoring

- [ ] Logging configured
- [ ] Metrics collection enabled
- [ ] Alert thresholds defined
- [ ] On-call rotation updated

---

## Environment Configuration

### Production Environment Variables

Create or update your production `.env` file with these variables:

```bash
# ============================================
# AMADEUS INTEGRATION CONFIGURATION
# ============================================

# Enable/Disable Integration
AMADEUS_ENABLED=true

# Production API Credentials (REQUIRED)
# Obtain from: https://developers.amadeus.com
AMADEUS_API_KEY=your_production_api_key_here
AMADEUS_API_SECRET=your_production_api_secret_here

# Production API Endpoint
AMADEUS_API_BASE_URL=https://api.amadeus.com

# Cache Configuration (in seconds)
# Token cache: 25 minutes (tokens valid for 30 min)
AMADEUS_TOKEN_CACHE_TTL=1500

# Hotel details cache: 24 hours
AMADEUS_HOTEL_CACHE_TTL=86400

# Search results cache: 5 minutes
AMADEUS_SEARCH_CACHE_TTL=300

# Search Defaults
AMADEUS_DEFAULT_RADIUS=5
AMADEUS_DEFAULT_RADIUS_UNIT=KM

# Rate Limiting (requests per second)
AMADEUS_RATE_LIMIT_PER_SECOND=10
```

### Environment-Specific Settings

#### Development
```bash
AMADEUS_ENABLED=true
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
AMADEUS_API_KEY=test_key
AMADEUS_API_SECRET=test_secret
```

#### Staging
```bash
AMADEUS_ENABLED=true
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
AMADEUS_API_KEY=test_key
AMADEUS_API_SECRET=test_secret
```

#### Production
```bash
AMADEUS_ENABLED=true
AMADEUS_API_BASE_URL=https://api.amadeus.com
AMADEUS_API_KEY=<production_key>
AMADEUS_API_SECRET=<production_secret>
```

### Configuration Validation

The system validates configuration on startup. If validation fails:

- **Development Mode**: Logs warning, continues with integration disabled
- **Production Mode**: Logs error and exits (fail-fast)

---

## Deployment Steps

### Step 1: Backup Current System

**CRITICAL**: Always backup before deployment.

```bash
# 1. Backup database
pg_dump -U postgres -d goroomz > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup current code
cd /path/to/goroomz
tar -czf backup_code_$(date +%Y%m%d_%H%M%S).tar.gz .

# 3. Document current version
git rev-parse HEAD > deployment_version.txt
```

### Step 2: Update Code

```bash
# 1. Navigate to project directory
cd /path/to/goroomz/projects/backend

# 2. Pull latest code
git fetch origin
git checkout main
git pull origin main

# 3. Verify correct branch/commit
git log -1
```

### Step 3: Install Dependencies

```bash
# Install/update npm packages
npm install

# Verify no vulnerabilities
npm audit

# If vulnerabilities found, fix them
npm audit fix
```

### Step 4: Configure Environment

```bash
# 1. Backup existing .env
cp .env .env.backup

# 2. Update .env with production values
nano .env

# 3. Verify required variables are set
grep AMADEUS .env

# Expected output:
# AMADEUS_ENABLED=true
# AMADEUS_API_KEY=<your_key>
# AMADEUS_API_SECRET=<your_secret>
# AMADEUS_API_BASE_URL=https://api.amadeus.com
# ... (other AMADEUS variables)
```

### Step 5: Run Tests

```bash
# Run full test suite
npm test -- --run

# Expected output:
# Test Suites: X passed, X total
# Tests: 793 passed, 793 total

# If tests fail, DO NOT proceed with deployment
# Investigate and fix failures first
```

### Step 6: Database Migration

```bash
# Run Amadeus booking fields migration (if not already run)
node migrations/20260109_add_amadeus_booking_fields.js

# Verify migration
psql -U postgres -d goroomz -c "SELECT column_name FROM information_schema.columns WHERE table_name='bookings' AND column_name IN ('externalBookingId', 'externalHotelId', 'bookingProvider', 'externalBookingData');"

# Expected: 4 rows returned
```

### Step 7: Start Application

```bash
# Option A: Using PM2 (recommended for production)
pm2 start server.js --name goroomz-backend

# Option B: Using systemd
sudo systemctl restart goroomz-backend

# Option C: Direct start (for testing)
NODE_ENV=production node server.js
```

### Step 8: Verify Startup

```bash
# Check application logs
pm2 logs goroomz-backend --lines 50

# Look for these success messages:
# ✅ Amadeus integration initialized successfully
# ✅ Configuration: enabled=true, baseUrl=https://api.amadeus.com
# ✅ Server running on port 5000
```

---

## Post-Deployment Verification

### Automated Verification Script

Create a file `verify-amadeus-deployment.sh`:

```bash
#!/bin/bash

# Amadeus Integration Deployment Verification Script
# Usage: ./verify-amadeus-deployment.sh <base_url> <auth_token>

BASE_URL=${1:-"http://localhost:5000"}
AUTH_TOKEN=$2

echo "========================================="
echo "Amadeus Integration Verification"
echo "========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    local auth_required=$4
    
    echo -n "Testing $name... "
    
    if [ "$auth_required" = "true" ]; then
        if [ -z "$AUTH_TOKEN" ]; then
            echo -e "${RED}SKIPPED${NC} (no auth token provided)"
            return
        fi
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $AUTH_TOKEN" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $status)"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} (Expected HTTP $expected_status, got $status)"
        echo "Response: $body"
        ((FAILED++))
    fi
}

# 1. Health Check (Public)
test_endpoint "Health Check" "$BASE_URL/api/amadeus/health" "200" "false"

# 2. Unified Search - All Sources (Public)
test_endpoint "Unified Search (All)" "$BASE_URL/api/search/hotels?cityCode=PAR&source=all" "200" "false"

# 3. Unified Search - Local Only (Public)
test_endpoint "Unified Search (Local)" "$BASE_URL/api/search/hotels?cityCode=PAR&source=local" "200" "false"

# 4. Unified Search - Amadeus Only (Public)
test_endpoint "Unified Search (Amadeus)" "$BASE_URL/api/search/hotels?cityCode=PAR&source=amadeus" "200" "false"

# 5. Metrics Endpoint (Protected)
test_endpoint "Metrics Endpoint" "$BASE_URL/api/amadeus/metrics" "200" "true"

# 6. Config Endpoint (Protected)
test_endpoint "Config Endpoint" "$BASE_URL/api/amadeus/config" "200" "true"

# 7. Requests Log (Protected)
test_endpoint "Requests Log" "$BASE_URL/api/amadeus/requests?limit=10" "200" "true"

echo ""
echo "========================================="
echo "Verification Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please investigate.${NC}"
    exit 1
fi
```

Make it executable and run:

```bash
chmod +x verify-amadeus-deployment.sh

# Without authentication (tests public endpoints only)
./verify-amadeus-deployment.sh https://your-domain.com

# With authentication (tests all endpoints)
./verify-amadeus-deployment.sh https://your-domain.com "your_jwt_token"
```

### Manual Verification Steps

#### 1. Health Check

```bash
curl https://your-domain.com/api/amadeus/health

# Expected Response:
{
  "success": true,
  "status": "healthy",
  "integration": "enabled",
  "apiEndpoint": "https://api.amadeus.com",
  "cacheStatus": "operational",
  "lastSuccessfulRequest": "2026-01-11T08:00:00.000Z",
  "timestamp": "2026-01-11T08:05:00.000Z"
}
```

#### 2. Unified Search Test

```bash
# Search for hotels in Paris
curl "https://your-domain.com/api/search/hotels?cityCode=PAR&source=all&limit=10"

# Expected Response:
{
  "success": true,
  "data": [
    {
      "id": "amadeus_ACPAR419",
      "title": "LE NOTRE DAME",
      "source": "amadeus",
      "isExternal": true,
      ...
    },
    {
      "id": "local-uuid-here",
      "title": "Local Property Name",
      "source": "local",
      "isExternal": false,
      ...
    }
  ],
  "meta": {
    "total": 50,
    "localCount": 25,
    "amadeusCount": 25,
    "page": 1,
    "limit": 10
  }
}
```

#### 3. Metrics Endpoint (Requires Authentication)

```bash
# Get authentication token first
TOKEN="your_jwt_token_here"

# Request metrics
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics

# Expected Response:
{
  "success": true,
  "data": {
    "metrics": {
      "requestCount": 15,
      "successCount": 14,
      "errorCount": 1,
      "averageResponseTime": 450,
      "cacheHitRate": 0.6
    },
    "configuration": {
      "enabled": true,
      "baseUrl": "https://api.amadeus.com",
      "cacheEnabled": true
    },
    "timestamp": "2026-01-11T08:10:00.000Z"
  }
}
```

#### 4. Verify Graceful Degradation

```bash
# Temporarily disable Amadeus (for testing)
# Set AMADEUS_ENABLED=false and restart

# Search should still work with local results only
curl "https://your-domain.com/api/search/hotels?cityCode=PAR&source=all"

# Expected: Only local results returned, no errors

# Re-enable Amadeus
# Set AMADEUS_ENABLED=true and restart
```

### Performance Verification

#### Response Time Test

```bash
# Test response times
for i in {1..10}; do
  echo "Request $i:"
  curl -w "\nTime: %{time_total}s\n" -o /dev/null -s \
    "https://your-domain.com/api/search/hotels?cityCode=PAR&source=all"
done

# Expected: Most requests < 2 seconds
# First request may be slower (cache warming)
```

#### Cache Effectiveness Test

```bash
# Make same request twice
echo "First request (cache miss):"
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s \
  "https://your-domain.com/api/search/hotels?cityCode=LON&source=amadeus"

echo "Second request (cache hit):"
curl -w "\nTime: %{time_total}s\n" -o /dev/null -s \
  "https://your-domain.com/api/search/hotels?cityCode=LON&source=amadeus"

# Expected: Second request significantly faster (< 100ms)
```

---

## Monitoring Setup

### Log Monitoring

#### Application Logs

```bash
# Using PM2
pm2 logs goroomz-backend --lines 100

# Using systemd
journalctl -u goroomz-backend -f

# Look for these patterns:
# ✅ [AmadeusService] API Request { ... }
# ✅ [AmadeusService] API Response { statusCode: 200, duration: '450ms' }
# ⚠️  [AmadeusService] Rate limit warning
# ❌ [AmadeusService] API Error { statusCode: 500, ... }
```

#### Error Monitoring

```bash
# Filter for errors
pm2 logs goroomz-backend | grep -i error

# Filter for Amadeus-specific errors
pm2 logs goroomz-backend | grep -i amadeus | grep -i error
```

### Metrics Collection

#### Set Up Periodic Metrics Collection

Create a cron job to collect metrics:

```bash
# Create metrics collection script
cat > /usr/local/bin/collect-amadeus-metrics.sh << 'EOF'
#!/bin/bash
TOKEN="your_admin_jwt_token"
METRICS_URL="https://your-domain.com/api/amadeus/metrics"
LOG_FILE="/var/log/amadeus-metrics.log"

response=$(curl -s -H "Authorization: Bearer $TOKEN" "$METRICS_URL")
echo "$(date -Iseconds) $response" >> "$LOG_FILE"
EOF

chmod +x /usr/local/bin/collect-amadeus-metrics.sh

# Add to crontab (every 5 minutes)
crontab -e
# Add line:
*/5 * * * * /usr/local/bin/collect-amadeus-metrics.sh
```

### Alert Configuration

#### Set Up Alerts (Example using email)

```bash
# Create alert script
cat > /usr/local/bin/amadeus-alerts.sh << 'EOF'
#!/bin/bash
TOKEN="your_admin_jwt_token"
METRICS_URL="https://your-domain.com/api/amadeus/metrics"
ALERT_EMAIL="ops@your-domain.com"

response=$(curl -s -H "Authorization: Bearer $TOKEN" "$METRICS_URL")
error_rate=$(echo "$response" | jq -r '.data.metrics.errorCount / .data.metrics.requestCount')

# Alert if error rate > 10%
if (( $(echo "$error_rate > 0.1" | bc -l) )); then
    echo "Amadeus error rate is $error_rate" | \
    mail -s "ALERT: High Amadeus Error Rate" "$ALERT_EMAIL"
fi
EOF

chmod +x /usr/local/bin/amadeus-alerts.sh

# Add to crontab (every 15 minutes)
crontab -e
# Add line:
*/15 * * * * /usr/local/bin/amadeus-alerts.sh
```

### Recommended Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 5% | > 10% |
| Response Time | > 3s | > 5s |
| Cache Hit Rate | < 40% | < 20% |
| Auth Failures | > 5/hour | > 10/hour |
| Rate Limit Hits | > 1/hour | > 5/hour |

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Authentication Failures

**Symptoms**:
```
[AmadeusService] Authentication failed: Invalid credentials
```

**Solutions**:
1. Verify API key and secret are correct
2. Check if using production credentials with production URL
3. Verify credentials haven't expired
4. Check Amadeus developer portal for account status

```bash
# Test credentials manually
curl -X POST https://api.amadeus.com/v1/security/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_KEY&client_secret=YOUR_SECRET"
```

#### Issue 2: No Results from Amadeus

**Symptoms**:
```json
{
  "success": true,
  "data": [],
  "meta": {
    "amadeusCount": 0
  }
}
```

**Solutions**:
1. Check if Amadeus integration is enabled
2. Verify API endpoint is correct (production vs test)
3. Check if city code is valid
4. Review Amadeus API logs for errors

```bash
# Check configuration
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/config

# Check recent requests
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/requests?limit=10
```

#### Issue 3: Slow Response Times

**Symptoms**:
- Search requests taking > 5 seconds
- Timeout errors

**Solutions**:
1. Check cache hit rate
2. Verify network connectivity to Amadeus
3. Check if rate limiting is causing delays
4. Review concurrent request handling

```bash
# Check cache statistics
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics | jq '.data.metrics.cacheHitRate'

# Test network latency
ping api.amadeus.com
```

#### Issue 4: Rate Limiting

**Symptoms**:
```
[AmadeusService] Rate limit exceeded (429)
```

**Solutions**:
1. Implement request queuing
2. Increase cache TTL values
3. Review usage patterns
4. Contact Amadeus for limit increase

```bash
# Check request rate
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics | jq '.data.metrics.requestCount'
```

#### Issue 5: Integration Disabled

**Symptoms**:
```json
{
  "success": false,
  "status": "unavailable",
  "message": "Amadeus integration is not enabled"
}
```

**Solutions**:
1. Check AMADEUS_ENABLED environment variable
2. Verify configuration validation passed
3. Check startup logs for errors

```bash
# Check environment variable
echo $AMADEUS_ENABLED

# Check startup logs
pm2 logs goroomz-backend --lines 100 | grep -i amadeus
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Add to .env
DEBUG=amadeus:*
LOG_LEVEL=debug

# Restart application
pm2 restart goroomz-backend

# View detailed logs
pm2 logs goroomz-backend
```

---

## Rollback Procedures

### Quick Disable (No Code Rollback)

If issues occur, quickly disable Amadeus integration:

```bash
# 1. Update environment variable
echo "AMADEUS_ENABLED=false" >> .env

# 2. Restart application
pm2 restart goroomz-backend

# 3. Verify unified search returns local results only
curl "https://your-domain.com/api/search/hotels?cityCode=PAR&source=all"

# Expected: Only local results, no Amadeus results
```

**Impact**: Unified search will return local properties only. No errors or downtime.

### Full Code Rollback

If code changes need to be reverted:

```bash
# 1. Stop application
pm2 stop goroomz-backend

# 2. Restore code from backup
cd /path/to/goroomz/projects/backend
rm -rf *
tar -xzf /path/to/backup_code_YYYYMMDD_HHMMSS.tar.gz

# 3. Restore database (if migration was run)
psql -U postgres -d goroomz < /path/to/backup_YYYYMMDD_HHMMSS.sql

# 4. Restore environment variables
cp .env.backup .env

# 5. Reinstall dependencies
npm install

# 6. Start application
pm2 start server.js --name goroomz-backend

# 7. Verify application is working
curl https://your-domain.com/api/health
```

### Partial Rollback (Keep Integration, Fix Issues)

If only specific issues need fixing:

```bash
# 1. Identify problematic commit
git log --oneline

# 2. Revert specific commit
git revert <commit-hash>

# 3. Test locally
npm test -- --run

# 4. Deploy fix
git push origin main
pm2 restart goroomz-backend
```

### Rollback Decision Matrix

| Issue | Severity | Recommended Action |
|-------|----------|-------------------|
| Authentication failures | High | Quick disable |
| Slow response times | Medium | Adjust cache TTL, monitor |
| No Amadeus results | Low | Investigate, keep enabled |
| Application crashes | Critical | Full rollback |
| Rate limiting | Medium | Adjust configuration |
| Security vulnerability | Critical | Full rollback |

---

## Support and Contacts

### Internal Team

**Backend Team**:
- Lead: [Your Name]
- Email: backend@your-domain.com
- Slack: #backend-team

**DevOps Team**:
- Lead: [DevOps Lead]
- Email: devops@your-domain.com
- Slack: #devops

**On-Call**:
- Phone: [On-Call Number]
- PagerDuty: [PagerDuty Link]

### External Support

**Amadeus Support**:
- Developer Portal: https://developers.amadeus.com
- Support Portal: https://developers.amadeus.com/support
- Email: developers@amadeus.com
- API Status: https://developers.amadeus.com/status

**Documentation**:
- API Reference: https://developers.amadeus.com/self-service/category/hotels
- Authentication: https://developers.amadeus.com/self-service/apis-docs/guides/authorization-262

### Escalation Path

1. **Level 1**: Backend developer on-call
2. **Level 2**: Backend team lead
3. **Level 3**: CTO / Engineering manager
4. **External**: Amadeus support (for API issues)

---

## Post-Deployment Tasks

### Immediate (Within 24 Hours)

- [ ] Monitor error rates every hour
- [ ] Monitor response times every hour
- [ ] Review logs for unexpected errors
- [ ] Verify cache hit rates improving
- [ ] Check Amadeus API usage dashboard

### Short-Term (Within 1 Week)

- [ ] Analyze usage patterns
- [ ] Optimize cache TTL values if needed
- [ ] Review and adjust alert thresholds
- [ ] Gather user feedback
- [ ] Document any issues encountered

### Long-Term (Within 1 Month)

- [ ] Review API costs and usage
- [ ] Analyze performance metrics
- [ ] Plan Phase 2 features (booking, availability)
- [ ] Consider Redis for distributed caching
- [ ] Evaluate need for rate limit increases

---

## Appendix A: Quick Reference Commands

### Health Checks
```bash
# Application health
curl https://your-domain.com/api/health

# Amadeus integration health
curl https://your-domain.com/api/amadeus/health

# Unified search test
curl "https://your-domain.com/api/search/hotels?cityCode=PAR&source=all"
```

### Monitoring
```bash
# View logs
pm2 logs goroomz-backend

# View metrics (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/metrics

# View recent requests (requires auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/amadeus/requests?limit=10
```

### Troubleshooting
```bash
# Check environment variables
env | grep AMADEUS

# Test Amadeus API directly
curl -X POST https://api.amadeus.com/v1/security/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$AMADEUS_API_KEY&client_secret=$AMADEUS_API_SECRET"

# Check application status
pm2 status goroomz-backend

# Restart application
pm2 restart goroomz-backend
```

### Emergency Actions
```bash
# Quick disable
echo "AMADEUS_ENABLED=false" >> .env && pm2 restart goroomz-backend

# Full rollback
pm2 stop goroomz-backend && \
  cd /path/to/goroomz/projects/backend && \
  git checkout <previous-commit> && \
  npm install && \
  pm2 start server.js --name goroomz-backend
```

---

## Appendix B: Environment Variable Reference

```bash
# Required
AMADEUS_ENABLED=true
AMADEUS_API_KEY=<production_key>
AMADEUS_API_SECRET=<production_secret>
AMADEUS_API_BASE_URL=https://api.amadeus.com

# Cache Configuration (seconds)
AMADEUS_TOKEN_CACHE_TTL=1500        # 25 minutes
AMADEUS_HOTEL_CACHE_TTL=86400       # 24 hours
AMADEUS_SEARCH_CACHE_TTL=300        # 5 minutes

# Search Defaults
AMADEUS_DEFAULT_RADIUS=5
AMADEUS_DEFAULT_RADIUS_UNIT=KM

# Rate Limiting
AMADEUS_RATE_LIMIT_PER_SECOND=10
```

---

## Appendix C: API Endpoint Reference

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/amadeus/health` | GET | Health check |
| `/api/search/hotels` | GET | Unified hotel search |
| `/api/search/hotels/:id` | GET | Hotel details |

### Protected Endpoints (Require Authentication)

| Endpoint | Method | Roles | Description |
|----------|--------|-------|-------------|
| `/api/amadeus/metrics` | GET | admin, superuser, internal_staff | API metrics |
| `/api/amadeus/requests` | GET | admin, superuser, internal_staff | Request log |
| `/api/amadeus/config` | GET | admin, superuser, internal_staff | Configuration |
| `/api/amadeus/clear-log` | POST | admin, superuser | Clear request log |

---

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Next Review**: After first production deployment

---

## Deployment Sign-Off

**Deployment Date**: _______________

**Deployed By**: _______________

**Verified By**: _______________

**Issues Encountered**: _______________

**Notes**: _______________
