# Amadeus API - Manual Testing Guide

**Version**: 1.0  
**Last Updated**: January 11, 2026  
**Purpose**: Step-by-step guide to manually test Amadeus API connection

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test 1: Direct Amadeus API Authentication](#test-1-direct-amadeus-api-authentication)
3. [Test 2: GoRoomz Server Health Check](#test-2-goroomz-server-health-check)
4. [Test 3: Unified Search (Public)](#test-3-unified-search-public)
5. [Test 4: Monitoring Endpoints (Protected)](#test-4-monitoring-endpoints-protected)
6. [Test 5: Cache Verification](#test-5-cache-verification)
7. [Test 6: Error Handling](#test-6-error-handling)
8. [Test 7: Performance Testing](#test-7-performance-testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **curl** (command-line HTTP client)
- **jq** (JSON processor - optional but recommended)
- **Postman** or **Insomnia** (optional, for GUI testing)

### Install Tools (Windows)

```powershell
# Install curl (usually pre-installed on Windows 10+)
# Check if installed:
curl --version

# Install jq (optional)
# Download from: https://stedolan.github.io/jq/download/
# Or use chocolatey:
choco install jq
```

### Required Information

Before starting, gather:

1. **Amadeus Credentials**:
   - API Key: `lkqWoWGSo2Jf8G7j8u0puOngW6tjmy3N` (test)
   - API Secret: `9U3emqqEfxytFR3V` (test)
   - Base URL: `https://test.api.amadeus.com`

2. **GoRoomz Server**:
   - Local: `http://localhost:5000`
   - Staging: `https://staging.your-domain.com`
   - Production: `https://your-domain.com`

3. **Authentication Token** (for protected endpoints):
   - Admin user credentials
   - JWT token

---

## Test 1: Direct Amadeus API Authentication

**Purpose**: Verify your Amadeus credentials work directly with Amadeus API.

### Step 1.1: Test Authentication Endpoint

```bash
# Windows PowerShell
curl -X POST https://test.api.amadeus.com/v1/security/oauth2/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=client_credentials&client_id=lkqWoWGSo2Jf8G7j8u0puOngW6tjmy3N&client_secret=9U3emqqEfxytFR3V"
```

```bash
# Windows CMD
curl -X POST https://test.api.amadeus.com/v1/security/oauth2/token ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "grant_type=client_credentials&client_id=lkqWoWGSo2Jf8G7j8u0puOngW6tjmy3N&client_secret=9U3emqqEfxytFR3V"
```

**Expected Response** (Success):
```json
{
  "type": "amadeusOAuth2Token",
  "username": "your_username",
  "application_name": "your_app_name",
  "client_id": "lkqWoWGSo2Jf8G7j8u0puOngW6tjmy3N",
  "token_type": "Bearer",
  "access_token": "AnLkj3jfkd9f...",
  "expires_in": 1799,
  "state": "approved",
  "scope": ""
}
```

**What to Check**:
- ✅ Status code: 200
- ✅ `access_token` is present
- ✅ `expires_in` is 1799 (30 minutes)
- ✅ `token_type` is "Bearer"

**Common Errors**:

❌ **Invalid Credentials** (401):
```json
{
  "error": "invalid_client",
  "error_description": "Client credentials are invalid"
}
```
**Solution**: Check API key and secret are correct.

❌ **Network Error**:
```
Could not resolve host: test.api.amadeus.com
```
**Solution**: Check internet connection, firewall, or proxy settings.

### Step 1.2: Test Hotel Search with Token

```bash
# First, get the token (save it to a variable)
# PowerShell:
$TOKEN = (curl -X POST https://test.api.amadeus.com/v1/security/oauth2/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=client_credentials&client_id=lkqWoWGSo2Jf8G7j8u0puOngW6tjmy3N&client_secret=9U3emqqEfxytFR3V" | ConvertFrom-Json).access_token

# Then use it to search hotels
curl -H "Authorization: Bearer $TOKEN" `
  "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=PAR"
```

**Expected Response** (Success):
```json
{
  "data": [
    {
      "chainCode": "AC",
      "iataCode": "PAR",
      "dupeId": 700140792,
      "name": "LE NOTRE DAME",
      "hotelId": "ACPAR419",
      "geoCode": {
        "latitude": 48.85341,
        "longitude": 2.34843
      },
      "address": {
        "countryCode": "FR"
      },
      "distance": {
        "value": 0.92,
        "unit": "KM"
      }
    },
    ...
  ]
}
```

**What to Check**:
- ✅ Status code: 200
- ✅ `data` array contains hotels
- ✅ Each hotel has `hotelId`, `name`, `geoCode`
- ✅ Hotels are in Paris (PAR)

---

## Test 2: GoRoomz Server Health Check

**Purpose**: Verify GoRoomz server is running and Amadeus integration is enabled.

### Step 2.1: Server Health

```bash
# Check if server is running
curl http://localhost:5000/api/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

### Step 2.2: Amadeus Integration Health

```bash
# Check Amadeus integration status
curl http://localhost:5000/api/amadeus/health
```

**Expected Response** (Healthy):
```json
{
  "success": true,
  "status": "healthy",
  "integration": "enabled",
  "apiEndpoint": "https://test.api.amadeus.com",
  "cacheStatus": "operational",
  "lastSuccessfulRequest": "2026-01-11T09:55:00.000Z",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

**What to Check**:
- ✅ `status`: "healthy"
- ✅ `integration`: "enabled"
- ✅ `apiEndpoint`: correct URL
- ✅ `cacheStatus`: "operational"

**Common Issues**:

❌ **Integration Disabled** (503):
```json
{
  "success": false,
  "status": "unavailable",
  "message": "Amadeus integration is not enabled or not configured"
}
```
**Solution**: Check `AMADEUS_ENABLED=true` in `.env` file.

❌ **Configuration Error**:
```json
{
  "success": false,
  "status": "error",
  "message": "Amadeus API credentials not configured"
}
```
**Solution**: Check `AMADEUS_API_KEY` and `AMADEUS_API_SECRET` in `.env`.

---

## Test 3: Unified Search (Public)

**Purpose**: Test the unified search that combines local and Amadeus results.

### Step 3.1: Search All Sources

```bash
# Search hotels in Paris from all sources
curl "http://localhost:5000/api/search/hotels?cityCode=PAR&source=all&limit=10"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_ACPAR419",
      "title": "LE NOTRE DAME",
      "source": "amadeus",
      "isExternal": true,
      "location": {
        "latitude": 48.85341,
        "longitude": 2.34843
      },
      "metadata": {
        "chainCode": "AC",
        "cityCode": "PAR",
        "distance": {
          "value": 0.92,
          "unit": "KM"
        }
      }
    },
    {
      "id": "local-property-uuid",
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

**What to Check**:
- ✅ `success`: true
- ✅ `data` contains hotels from both sources
- ✅ Amadeus hotels have `source`: "amadeus"
- ✅ Local hotels have `source`: "local"
- ✅ `meta.amadeusCount` > 0
- ✅ `meta.localCount` >= 0

### Step 3.2: Search Amadeus Only

```bash
# Search only Amadeus hotels
curl "http://localhost:5000/api/search/hotels?cityCode=PAR&source=amadeus&limit=10"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_ACPAR419",
      "source": "amadeus",
      ...
    }
  ],
  "meta": {
    "total": 25,
    "localCount": 0,
    "amadeusCount": 25,
    "page": 1,
    "limit": 10
  }
}
```

**What to Check**:
- ✅ All results have `source`: "amadeus"
- ✅ `meta.localCount`: 0
- ✅ `meta.amadeusCount` > 0

### Step 3.3: Search by Coordinates

```bash
# Search hotels near Eiffel Tower
curl "http://localhost:5000/api/search/hotels?latitude=48.8584&longitude=2.2945&radius=5&source=all"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_...",
      "title": "Hotel near Eiffel Tower",
      "source": "amadeus",
      "location": {
        "latitude": 48.8600,
        "longitude": 2.2950
      },
      "metadata": {
        "distance": {
          "value": 0.5,
          "unit": "KM"
        }
      }
    }
  ],
  "meta": {
    "total": 30,
    "amadeusCount": 30
  }
}
```

**What to Check**:
- ✅ Results are near the specified coordinates
- ✅ Distance information is included
- ✅ Hotels are within specified radius

### Step 3.4: Search with Filters

```bash
# Search with amenities filter
curl "http://localhost:5000/api/search/hotels?cityCode=LON&source=all&amenities=WIFI,PARKING"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_...",
      "amenities": ["WIFI", "PARKING", "POOL"],
      ...
    }
  ]
}
```

**What to Check**:
- ✅ All results have requested amenities
- ✅ Filtering works across both sources

---

## Test 4: Monitoring Endpoints (Protected)

**Purpose**: Test monitoring endpoints that require authentication.

### Step 4.1: Get Authentication Token

First, you need to authenticate to get a JWT token:

```bash
# Login as admin user
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"your_password\"}'
```

**Expected Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Save the token**:
```powershell
# PowerShell
$TOKEN = (curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"your_password\"}' | ConvertFrom-Json).token
```

### Step 4.2: Test Metrics Endpoint

```bash
# Get Amadeus metrics (requires authentication)
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:5000/api/amadeus/metrics
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "requestCount": 150,
      "successCount": 145,
      "errorCount": 5,
      "errorRate": "3.33%",
      "averageResponseTime": "245ms",
      "cacheStats": {
        "hits": 80,
        "misses": 70,
        "hitRate": "53.33%",
        "size": 45
      },
      "authStats": {
        "tokenRefreshCount": 3,
        "lastRefresh": "2026-01-11T09:00:00.000Z"
      }
    },
    "configuration": {
      "enabled": true,
      "baseUrl": "https://test.api.amadeus.com",
      "cacheEnabled": true
    },
    "timestamp": "2026-01-11T10:00:00.000Z"
  }
}
```

**What to Check**:
- ✅ `requestCount` > 0 (if you've made searches)
- ✅ `errorRate` < 10%
- ✅ `cacheStats.hitRate` > 0% (after multiple requests)
- ✅ `configuration.enabled`: true

### Step 4.3: Test Without Authentication

```bash
# Try to access metrics without token (should fail)
curl http://localhost:5000/api/amadeus/metrics
```

**Expected Response** (401 Unauthorized):
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**What to Check**:
- ✅ Status code: 401
- ✅ Access denied message

### Step 4.4: Test Request Log

```bash
# Get recent request log
curl -H "Authorization: Bearer $TOKEN" `
  "http://localhost:5000/api/amadeus/requests?limit=5"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "req_1768118046751_ms9k5wu7g",
        "endpoint": "/v1/reference-data/locations/hotels/by-city",
        "params": {
          "cityCode": "PAR"
        },
        "statusCode": 200,
        "duration": 450,
        "timestamp": "2026-01-11T09:55:00.000Z"
      }
    ],
    "count": 5,
    "limit": 5,
    "timestamp": "2026-01-11T10:00:00.000Z"
  }
}
```

**What to Check**:
- ✅ Recent requests are listed
- ✅ Each request has `requestId`, `endpoint`, `statusCode`
- ✅ Timestamps are recent

### Step 4.5: Test Configuration Endpoint

```bash
# Get configuration summary
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:5000/api/amadeus/config
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "baseUrl": "https://test.api.amadeus.com",
    "tokenCacheTTL": 1500,
    "hotelCacheTTL": 86400,
    "searchCacheTTL": 300,
    "defaultRadius": 5,
    "defaultRadiusUnit": "KM",
    "rateLimitPerSecond": 10,
    "hasApiKey": true,
    "hasApiSecret": true
  },
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

**What to Check**:
- ✅ `enabled`: true
- ✅ `hasApiKey`: true
- ✅ `hasApiSecret`: true
- ✅ API key/secret values are NOT exposed

---

## Test 5: Cache Verification

**Purpose**: Verify caching is working to reduce API calls.

### Step 5.1: First Request (Cache Miss)

```bash
# Make a search request and note the response time
curl -w "\nTime: %{time_total}s\n" `
  "http://localhost:5000/api/search/hotels?cityCode=NYC&source=amadeus"
```

**Expected**:
- Response time: 500ms - 2s (first request, cache miss)

### Step 5.2: Second Request (Cache Hit)

```bash
# Make the SAME request again immediately
curl -w "\nTime: %{time_total}s\n" `
  "http://localhost:5000/api/search/hotels?cityCode=NYC&source=amadeus"
```

**Expected**:
- Response time: < 100ms (cached response)
- Same results as first request

### Step 5.3: Verify Cache Statistics

```bash
# Check cache hit rate
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:5000/api/amadeus/metrics | jq '.data.metrics.cacheStats'
```

**Expected Response**:
```json
{
  "hits": 1,
  "misses": 1,
  "hitRate": "50.00%",
  "size": 1
}
```

**What to Check**:
- ✅ `hits` increases on second request
- ✅ `hitRate` > 0% after multiple requests
- ✅ Second request is significantly faster

---

## Test 6: Error Handling

**Purpose**: Verify the system handles errors gracefully.

### Step 6.1: Invalid City Code

```bash
# Search with invalid city code
curl "http://localhost:5000/api/search/hotels?cityCode=INVALID&source=amadeus"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "amadeusCount": 0
  }
}
```

**What to Check**:
- ✅ No error thrown
- ✅ Empty results returned
- ✅ Status code: 200

### Step 6.2: Invalid Coordinates

```bash
# Search with invalid latitude
curl "http://localhost:5000/api/search/hotels?latitude=999&longitude=2.3522&source=amadeus"
```

**Expected Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Latitude must be between -90 and 90"
  }
}
```

**What to Check**:
- ✅ Status code: 400
- ✅ Clear error message
- ✅ No server crash

### Step 6.3: Amadeus API Down (Simulation)

```bash
# Temporarily disable Amadeus in .env
# Set AMADEUS_ENABLED=false
# Restart server

# Try unified search
curl "http://localhost:5000/api/search/hotels?cityCode=PAR&source=all"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "local-property-uuid",
      "source": "local",
      ...
    }
  ],
  "meta": {
    "total": 10,
    "localCount": 10,
    "amadeusCount": 0
  }
}
```

**What to Check**:
- ✅ Local results still returned
- ✅ No error thrown
- ✅ Graceful degradation working

---

## Test 7: Performance Testing

**Purpose**: Verify performance under load.

### Step 7.1: Response Time Test

```bash
# Test response times for 10 requests
for ($i=1; $i -le 10; $i++) {
  Write-Host "Request $i:"
  curl -w "Time: %{time_total}s`n" -o $null -s `
    "http://localhost:5000/api/search/hotels?cityCode=PAR&source=all"
}
```

**Expected**:
- First request: 500ms - 2s (cache miss)
- Subsequent requests: < 500ms (cache hits)
- Average: < 1s

### Step 7.2: Concurrent Requests

```bash
# Make 5 concurrent requests
1..5 | ForEach-Object -Parallel {
  curl -s "http://localhost:5000/api/search/hotels?cityCode=LON&source=all"
}
```

**What to Check**:
- ✅ All requests complete successfully
- ✅ No timeout errors
- ✅ No rate limiting errors

### Step 7.3: Cache Effectiveness

```bash
# Make 20 requests to same endpoint
for ($i=1; $i -le 20; $i++) {
  curl -s "http://localhost:5000/api/search/hotels?cityCode=PAR&source=amadeus" > $null
}

# Check cache hit rate
curl -H "Authorization: Bearer $TOKEN" `
  http://localhost:5000/api/amadeus/metrics | jq '.data.metrics.cacheStats.hitRate'
```

**Expected**:
- Cache hit rate: > 90% (19 hits, 1 miss)

---

## Troubleshooting

### Issue: "Connection Refused"

**Symptoms**:
```
curl: (7) Failed to connect to localhost port 5000: Connection refused
```

**Solutions**:
1. Check if server is running: `ps aux | grep node`
2. Start server: `cd projects/backend && npm start`
3. Check port: `netstat -an | findstr 5000`

### Issue: "Amadeus Integration Unavailable"

**Symptoms**:
```json
{
  "status": "unavailable",
  "message": "Amadeus integration is not enabled"
}
```

**Solutions**:
1. Check `.env` file: `AMADEUS_ENABLED=true`
2. Check credentials are set: `AMADEUS_API_KEY` and `AMADEUS_API_SECRET`
3. Restart server after changing `.env`

### Issue: "Authentication Failed"

**Symptoms**:
```json
{
  "error": "invalid_client",
  "error_description": "Client credentials are invalid"
}
```

**Solutions**:
1. Verify API key and secret are correct
2. Check for extra spaces or quotes in `.env`
3. Test credentials directly with Amadeus API (Test 1.1)

### Issue: "No Results from Amadeus"

**Symptoms**:
```json
{
  "amadeusCount": 0
}
```

**Solutions**:
1. Check if city code is valid (use IATA codes: PAR, LON, NYC)
2. Check Amadeus API status: https://developers.amadeus.com/status
3. Check server logs for errors: `pm2 logs goroomz-backend`

### Issue: "Slow Response Times"

**Symptoms**:
- Requests taking > 5 seconds

**Solutions**:
1. Check cache hit rate (should be > 50%)
2. Check network latency: `ping test.api.amadeus.com`
3. Check server resources: CPU, memory usage
4. Review cache TTL settings

---

## Quick Test Script

Save this as `test-amadeus.ps1`:

```powershell
# Amadeus Integration Quick Test Script
$BASE_URL = "http://localhost:5000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Amadeus Integration Quick Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Server Health
Write-Host "Test 1: Server Health..." -NoNewline
try {
    $response = curl -s "$BASE_URL/api/health" | ConvertFrom-Json
    if ($response.success) {
        Write-Host " PASSED" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host " FAILED (Server not running)" -ForegroundColor Red
}

# Test 2: Amadeus Health
Write-Host "Test 2: Amadeus Health..." -NoNewline
try {
    $response = curl -s "$BASE_URL/api/amadeus/health" | ConvertFrom-Json
    if ($response.status -eq "healthy") {
        Write-Host " PASSED" -ForegroundColor Green
    } else {
        Write-Host " FAILED ($($response.status))" -ForegroundColor Red
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test 3: Unified Search
Write-Host "Test 3: Unified Search..." -NoNewline
try {
    $response = curl -s "$BASE_URL/api/search/hotels?cityCode=PAR&source=all&limit=5" | ConvertFrom-Json
    if ($response.success -and $response.meta.amadeusCount -gt 0) {
        Write-Host " PASSED ($($response.meta.amadeusCount) Amadeus hotels)" -ForegroundColor Green
    } else {
        Write-Host " FAILED (No Amadeus results)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
}

# Test 4: Cache Test
Write-Host "Test 4: Cache Test..." -NoNewline
$time1 = Measure-Command { curl -s "$BASE_URL/api/search/hotels?cityCode=LON&source=amadeus" > $null }
$time2 = Measure-Command { curl -s "$BASE_URL/api/search/hotels?cityCode=LON&source=amadeus" > $null }
if ($time2.TotalMilliseconds -lt $time1.TotalMilliseconds) {
    Write-Host " PASSED (Cache working: $([math]::Round($time1.TotalMilliseconds))ms -> $([math]::Round($time2.TotalMilliseconds))ms)" -ForegroundColor Green
} else {
    Write-Host " WARNING (Cache may not be working)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
```

Run it:
```powershell
.\test-amadeus.ps1
```

---

## Summary Checklist

Use this checklist to verify all tests:

- [ ] Test 1.1: Direct Amadeus authentication works
- [ ] Test 1.2: Direct Amadeus hotel search works
- [ ] Test 2.1: GoRoomz server is running
- [ ] Test 2.2: Amadeus integration health is "healthy"
- [ ] Test 3.1: Unified search returns both sources
- [ ] Test 3.2: Amadeus-only search works
- [ ] Test 3.3: Geocode search works
- [ ] Test 3.4: Filtering works
- [ ] Test 4.1: Authentication token obtained
- [ ] Test 4.2: Metrics endpoint works (with auth)
- [ ] Test 4.3: Metrics endpoint blocked (without auth)
- [ ] Test 4.4: Request log works
- [ ] Test 4.5: Config endpoint works
- [ ] Test 5.1: First request (cache miss)
- [ ] Test 5.2: Second request (cache hit) is faster
- [ ] Test 5.3: Cache statistics show hits
- [ ] Test 6.1: Invalid city code handled gracefully
- [ ] Test 6.2: Invalid coordinates rejected
- [ ] Test 6.3: Graceful degradation works
- [ ] Test 7.1: Response times acceptable
- [ ] Test 7.2: Concurrent requests work
- [ ] Test 7.3: Cache effectiveness > 50%

---

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Next Review**: After any configuration changes
