# Test the room endpoint fix
Write-Host "Logging in..."
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'

if ($loginResponse.success) {
    Write-Host "Login successful"
    $token = $loginResponse.token
    
    Write-Host "Testing rooms endpoint..."
    try {
        $roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
        
        Write-Host "Rooms endpoint successful"
        Write-Host "Found $($roomsResponse.count) rooms"
        
        if ($roomsResponse.data.Count -gt 0) {
            $firstRoom = $roomsResponse.data[0]
            Write-Host "First room: $($firstRoom.roomNumber) - $($firstRoom.sharingType)"
            
            # Test bed fetching for a room with sharing type
            $roomWithSharing = $roomsResponse.data | Where-Object { $_.sharingType -ne $null -and $_.sharingType -ne "single" } | Select-Object -First 1
            if ($roomWithSharing) {
                Write-Host "Testing bed fetching for room: $($roomWithSharing.roomNumber) (ID: $($roomWithSharing.id))"
                try {
                    $bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($roomWithSharing.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
                    Write-Host "Beds endpoint successful - Found $($bedsResponse.count) beds"
                } catch {
                    Write-Host "Beds endpoint failed: $($_.Exception.Message)"
                }
            } else {
                Write-Host "No shared rooms found to test bed fetching"
            }
        }
        
    } catch {
        Write-Host "Rooms endpoint failed: $($_.Exception.Message)"
    }
} else {
    Write-Host "Login failed: $($loginResponse.message)"
}