# Check rooms 301-310 specifically
Write-Host "Checking rooms 301-310..."
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'

if ($loginResponse.success) {
    $token = $loginResponse.token
    $roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
    
    # Find rooms 301-310
    $targetRooms = $roomsResponse.data | Where-Object { $_.roomNumber -match "^30[1-9]$|^310$" }
    
    if ($targetRooms) {
        Write-Host "Found $($targetRooms.Count) rooms in 301-310 range:"
        $targetRooms | ForEach-Object {
            Write-Host "Room $($_.roomNumber): sharingType=$($_.sharingType), totalBeds=$($_.totalBeds), status=$($_.currentStatus)"
        }
        
        # Test bed fetching for room 301
        $room301 = $targetRooms | Where-Object { $_.roomNumber -eq "301" } | Select-Object -First 1
        if ($room301) {
            Write-Host "`nTesting bed fetching for room 301..."
            try {
                $bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room301.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
                Write-Host "Room 301 has $($bedsResponse.count) beds:"
                $bedsResponse.data | ForEach-Object {
                    Write-Host "  Bed $($_.bedNumber): $($_.status)"
                }
            } catch {
                Write-Host "Failed to get beds: $($_.Exception.Message)"
            }
        }
    } else {
        Write-Host "No rooms found in 301-310 range"
        Write-Host "All available rooms:"
        $roomsResponse.data | ForEach-Object {
            Write-Host "Room $($_.roomNumber): $($_.sharingType)"
        }
    }
}