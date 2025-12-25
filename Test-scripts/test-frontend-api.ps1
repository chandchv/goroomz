#!/usr/bin/env pwsh

Write-Host "Testing Frontend API Connection..." -ForegroundColor Green

# Test the frontend proxy to backend API
$frontendUrl = "http://localhost:5173"
$apiUrl = "$frontendUrl/api"

Write-Host "1. Testing Frontend Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$frontendUrl" -Method GET -TimeoutSec 10
    Write-Host "Frontend Status: Running" -ForegroundColor Green
} catch {
    Write-Host "Frontend Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "2. Testing API Proxy - Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET -TimeoutSec 10
    Write-Host "API Health Status: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "API Health Error: $($_.Exception.Message)" -ForegroundColor Red
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
    Write-Host "Login successful via proxy: $($loginResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "Login Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "4. Testing API Proxy - Bed Endpoint..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    # Test with a known room ID from our previous tests
    $roomId = "71a8a77d-a72e-4b8f-9c3d-8f2e1a5b6c7d"  # Room 301
    $bedsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/$roomId/beds" -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "Beds found via proxy: $($bedsResponse.count)" -ForegroundColor Green
    Write-Host "Room: $($bedsResponse.roomNumber) ($($bedsResponse.sharingType))" -ForegroundColor Cyan
} catch {
    Write-Host "Beds Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`nFRONTEND API TEST COMPLETE" -ForegroundColor Green
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "API Proxy URL: $apiUrl" -ForegroundColor Cyan