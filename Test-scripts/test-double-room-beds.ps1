#!/usr/bin/env pwsh

Write-Host "Testing Double Sharing Room Beds via Frontend Proxy..." -ForegroundColor Green

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

# Test double sharing rooms (301-310)
$doubleRoomIds = @(
    "71a8a77d-a72e-4b8f-9c3d-8f2e1a5b6c7d",  # Room 301
    "82b9b88e-b83f-5c9g-ad4e-9g3f2b6c7d8e",  # Room 302
    "93cac99f-c94g-6dah-be5f-ah4g3c7d8e9f"   # Room 303
)

foreach ($roomId in $doubleRoomIds) {
    try {
        Write-Host "`nTesting room: $roomId" -ForegroundColor Yellow
        $bedsResponse = Invoke-RestMethod -Uri "$apiUrl/internal/rooms/$roomId/beds" -Method GET -Headers $headers
        
        Write-Host "✅ Room $($bedsResponse.roomNumber): $($bedsResponse.count) beds ($($bedsResponse.sharingType))" -ForegroundColor Green
        
        if ($bedsResponse.data -and $bedsResponse.data.Count -gt 0) {
            foreach ($bed in $bedsResponse.data) {
                $statusColor = if ($bed.status -eq "vacant") { "Green" } else { "Yellow" }
                Write-Host "  - Bed $($bed.bedNumber): $($bed.status)" -ForegroundColor $statusColor
            }
        }
    } catch {
        Write-Host "❌ Error testing room $roomId`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Double sharing room bed test complete!" -ForegroundColor Green