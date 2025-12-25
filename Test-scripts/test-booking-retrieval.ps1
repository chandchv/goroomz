#!/usr/bin/env pwsh

Write-Host "Testing Booking Retrieval..." -ForegroundColor Green

$apiUrl = "http://localhost:5000/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login successful: $($loginResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test getting bookings
Write-Host "`nTesting GET /api/internal/bookings..." -ForegroundColor Yellow
try {
    $bookingsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/bookings?page=1&limit=20" -Method GET -Headers $headers
    Write-Host "Bookings retrieved successfully" -ForegroundColor Green
    Write-Host "   Total bookings: $($bookingsResponse.total)" -ForegroundColor Cyan
    Write-Host "   Current page: $($bookingsResponse.page)" -ForegroundColor Cyan
    
    if ($bookingsResponse.data.Count -gt 0) {
        Write-Host "`nBooking Details:" -ForegroundColor Yellow
        $booking = $bookingsResponse.data[0]
        Write-Host "   ID: $($booking.id)" -ForegroundColor Cyan
        Write-Host "   Room: $($booking.room.roomNumber)" -ForegroundColor Cyan
        Write-Host "   Guest: $($booking.user.name)" -ForegroundColor Cyan
        Write-Host "   Status: $($booking.status)" -ForegroundColor Cyan
        Write-Host "   Check-in: $($booking.checkIn)" -ForegroundColor Cyan
        Write-Host "   Check-out: $($booking.checkOut)" -ForegroundColor Cyan
        Write-Host "   Bed: $($booking.bed.bedNumber)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Get bookings failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`nBooking retrieval test complete!" -ForegroundColor Green