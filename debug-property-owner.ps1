#!/usr/bin/env pwsh

Write-Host "Debugging Property Owner Lookup..." -ForegroundColor Green

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
    Write-Host "   User ID: $($loginResponse.user.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get a room and check its property
try {
    $roomsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/status" -Method GET -Headers $headers
    $doubleRooms = $roomsResponse.data | Where-Object { $_.sharingType -eq "double" }
    
    if ($doubleRooms.Count -gt 0) {
        $testRoom = $doubleRooms[0]
        Write-Host "`nRoom Details:" -ForegroundColor Yellow
        Write-Host "   Room Number: $($testRoom.roomNumber)" -ForegroundColor Cyan
        Write-Host "   Room ID: $($testRoom.id)" -ForegroundColor Cyan
        Write-Host "   Property ID: $($testRoom.propertyId)" -ForegroundColor Cyan
        
        # Try to get property details
        if ($testRoom.propertyId) {
            try {
                $propertyResponse = Invoke-RestMethod -Uri "$apiUrl/internal/properties/$($testRoom.propertyId)" -Method GET -Headers $headers
                Write-Host "`nProperty Details:" -ForegroundColor Yellow
                Write-Host "   Property Name: $($propertyResponse.data.name)" -ForegroundColor Cyan
                Write-Host "   Property ID: $($propertyResponse.data.id)" -ForegroundColor Cyan
                Write-Host "   Owner ID: $($propertyResponse.data.ownerId)" -ForegroundColor Cyan
            } catch {
                Write-Host "   ❌ Failed to get property details: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "   ⚠️ Room has no propertyId!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️ No double rooms found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get rooms: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Debug complete!" -ForegroundColor Green