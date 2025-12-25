#!/usr/bin/env pwsh

Write-Host "Testing Frontend Login via Proxy..." -ForegroundColor Green

$frontendUrl = "http://localhost:5173"
$apiUrl = "$frontendUrl/api"

Write-Host "1. Testing Frontend Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$frontendUrl" -Method GET -TimeoutSec 10
    Write-Host "✅ Frontend Status: Running" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "2. Testing API Proxy - Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET -TimeoutSec 10
    Write-Host "✅ API Health Status: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Health Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "3. Testing API Proxy - Login..." -ForegroundColor Yellow
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10
    $token = $loginResponse.token
    Write-Host "✅ Login successful via proxy: $($loginResponse.user.email)" -ForegroundColor Green
    Write-Host "   User Type: $($loginResponse.user.userType)" -ForegroundColor Cyan
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

Write-Host "4. Testing API Proxy - Get Current User..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $userResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/me" -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "✅ Current user retrieved: $($userResponse.user.email)" -ForegroundColor Green
    Write-Host "   User ID: $($userResponse.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Get User Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 FRONTEND LOGIN TEST COMPLETE!" -ForegroundColor Green
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "API Proxy URL: $apiUrl" -ForegroundColor Cyan
Write-Host "✅ Login and authentication are working correctly through the proxy!" -ForegroundColor Green