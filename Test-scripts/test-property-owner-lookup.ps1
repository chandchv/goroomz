#!/usr/bin/env pwsh

Write-Host "Testing Property Owner Lookup..." -ForegroundColor Green

$apiUrl = "http://localhost:5174/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful: $($loginResponse.user.email)" -ForegroundColor Green
    Write-Host "   Current User ID: $($loginResponse.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get room details to check propertyId
Write-Host "`nChecking room details..." -ForegroundColor Yellow
try {
    $roomsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/status" -Method GET -Headers $headers
    $doubleRooms = $roomsResponse.data | Where-Object { $_.sharingType -eq "double" }
    
    if ($doubleRooms.Count -gt 0) {
        $testRoom = $doubleRooms[0]
        Write-Host "✅ Room found: $($testRoom.roomNumber) (ID: $($testRoom.id))" -ForegroundColor Green
        Write-Host "   Property ID: $($testRoom.propertyId)" -ForegroundColor Cyan
        
        if ($testRoom.propertyId) {
            Write-Host "   ✅ Room has propertyId" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Room missing propertyId - this is the problem!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ No double rooms found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error getting rooms: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Property owner lookup test complete!" -ForegroundColor Green