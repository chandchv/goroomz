#!/usr/bin/env pwsh

Write-Host "Getting Double Sharing Rooms..." -ForegroundColor Green

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

# Get all rooms and filter for double sharing
try {
    $roomsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/status" -Method GET -Headers $headers
    
    Write-Host "`nFound $($roomsResponse.count) total rooms" -ForegroundColor Cyan
    
    $doubleRooms = $roomsResponse.data | Where-Object { $_.sharingType -eq "double_sharing" }
    
    Write-Host "Double sharing rooms found: $($doubleRooms.Count)" -ForegroundColor Yellow
    
    foreach ($room in $doubleRooms) {
        Write-Host "Room $($room.roomNumber) (ID: $($room.id)): $($room.sharingType), $($room.totalBeds) beds" -ForegroundColor Green
    }
    
    if ($doubleRooms.Count -gt 0) {
        Write-Host "`nTesting first double room beds..." -ForegroundColor Yellow
        $firstRoom = $doubleRooms[0]
        $bedsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/$($firstRoom.id)/beds" -Method GET -Headers $headers
        
        Write-Host "✅ Room $($bedsResponse.roomNumber): $($bedsResponse.count) beds" -ForegroundColor Green
        foreach ($bed in $bedsResponse.data) {
            Write-Host "  - Bed $($bed.bedNumber): $($bed.status)" -ForegroundColor Cyan
        }
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Room discovery complete!" -ForegroundColor Green