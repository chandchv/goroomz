#!/usr/bin/env pwsh

Write-Host "Testing Check-in Functionality..." -ForegroundColor Green

$apiUrl = "http://localhost:5000/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful: $($loginResponse.user.email)" -ForegroundColor Green
    Write-Host "   User permissions updated: canCheckIn should be true" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get existing bookings to find one to check in
Write-Host "`nGetting existing bookings..." -ForegroundColor Yellow
try {
    $bookingsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/bookings?page=1&limit=20" -Method GET -Headers $headers
    
    if ($bookingsResponse.data.Count -gt 0) {
        $booking = $bookingsResponse.data[0]
        Write-Host "✅ Found booking to test check-in:" -ForegroundColor Green
        Write-Host "   Booking ID: $($booking.id)" -ForegroundColor Cyan
        Write-Host "   Room: $($booking.room.roomNumber)" -ForegroundColor Cyan
        Write-Host "   Guest: $($booking.user.name)" -ForegroundColor Cyan
        Write-Host "   Status: $($booking.status)" -ForegroundColor Cyan
        Write-Host "   Already checked in: $($booking.actualCheckInTime -ne $null)" -ForegroundColor Cyan
        
        # Try to check in the booking
        if ($booking.actualCheckInTime -eq $null) {
            Write-Host "`nTesting check-in..." -ForegroundColor Yellow
            
            $checkinData = @{
                securityDepositAmount = 1000
                securityDepositMethod = "cash"
                notes = "Test check-in from PowerShell"
            } | ConvertTo-Json
            
            try {
                $checkinResponse = Invoke-RestMethod -Uri "$apiUrl/internal/bookings/$($booking.id)/checkin" -Method POST -Body $checkinData -Headers $headers
                Write-Host "✅ Check-in successful!" -ForegroundColor Green
                Write-Host "   Booking ID: $($checkinResponse.data.id)" -ForegroundColor Cyan
                Write-Host "   Status: $($checkinResponse.data.status)" -ForegroundColor Cyan
                Write-Host "   Check-in time: $($checkinResponse.data.actualCheckInTime)" -ForegroundColor Cyan
                Write-Host "   Checked in by: $($checkinResponse.data.checkedInByUser.name)" -ForegroundColor Cyan
            } catch {
                Write-Host "❌ Check-in failed: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
                
                if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "   Response Body: $responseBody" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "   ⚠️ Booking already checked in, skipping check-in test" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️ No bookings found to test check-in" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get bookings: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Check-in functionality test complete!" -ForegroundColor Green