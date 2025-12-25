#!/usr/bin/env pwsh

Write-Host "Checking Room Types..." -ForegroundColor Green

$apiUrl = "http://localhost:5173/api"

# Login first
$loginData = @{
    email = "amit.patel@example.com"
    password = "Owner123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/internal/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Login successful: $($loginResponse.user.email)" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get all rooms and analyze sharing types
try {
    $roomsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/status" -Method GET -Headers $headers
    
    Write-Host "`nFound $($roomsResponse.count) total rooms" -ForegroundColor Cyan
    
    # Group by sharing type
    $sharingTypes = $roomsResponse.data | Group-Object sharingType
    
    Write-Host "`nRoom sharing types:" -ForegroundColor Yellow
    foreach ($group in $sharingTypes) {
        Write-Host "$($group.Name): $($group.Count) rooms" -ForegroundColor Green
        
        # Show first few rooms of each type
        $sampleRooms = $group.Group | Select-Object -First 3
        foreach ($room in $sampleRooms) {
            Write-Host "  - Room $($room.roomNumber) (ID: $($room.id)): $($room.totalBeds) beds" -ForegroundColor Cyan
        }
        if ($group.Count -gt 3) {
            Write-Host "  ... and $($group.Count - 3) more" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    # Test beds for a room with multiple beds
    $multiBedroomRooms = $roomsResponse.data | Where-Object { $_.totalBeds -gt 1 }
    if ($multiBedroomRooms.Count -gt 0) {
        Write-Host "Testing beds for multi-bed room..." -ForegroundColor Yellow
        $testRoom = $multiBedroomRooms[0]
        Write-Host "Testing Room $($testRoom.roomNumber) (ID: $($testRoom.id)): $($testRoom.totalBeds) beds" -ForegroundColor Cyan
        
        $bedsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/$($testRoom.id)/beds" -Method GET -Headers $headers
        
        Write-Host "✅ Room $($bedsResponse.roomNumber): $($bedsResponse.count) beds found" -ForegroundColor Green
        foreach ($bed in $bedsResponse.data) {
            Write-Host "  - Bed $($bed.bedNumber): $($bed.status)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Room type analysis complete!" -ForegroundColor Green