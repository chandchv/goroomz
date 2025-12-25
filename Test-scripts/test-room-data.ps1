# Test to see the actual room data structure
Write-Host "Getting room data structure..."
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'

if ($loginResponse.success) {
    $token = $loginResponse.token
    $roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
    
    # Find a double sharing room
    $doubleRoom = $roomsResponse.data | Where-Object { $_.sharingType -eq "2_sharing" } | Select-Object -First 1
    
    if ($doubleRoom) {
        Write-Host "Double sharing room found:"
        Write-Host "ID: $($doubleRoom.id)"
        Write-Host "Room Number: $($doubleRoom.roomNumber)"
        Write-Host "Sharing Type: $($doubleRoom.sharingType)"
        Write-Host "Total Beds: $($doubleRoom.totalBeds)"
        Write-Host "Current Status: $($doubleRoom.currentStatus)"
        Write-Host "Property ID: $($doubleRoom.propertyId)"
        
        # Convert to JSON to see full structure
        $doubleRoom | ConvertTo-Json -Depth 3
    } else {
        Write-Host "No double sharing rooms found"
        # Show first few rooms
        Write-Host "Available rooms:"
        $roomsResponse.data | Select-Object -First 5 | ForEach-Object {
            Write-Host "Room $($_.roomNumber): $($_.sharingType)"
        }
    }
}