# Test frontend room service
Write-Host "Testing frontend room service..."

# Test the frontend API endpoint that the CreateBookingModal uses
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'

if ($loginResponse.success) {
    $token = $loginResponse.token
    
    # Test the same endpoint the frontend uses
    $roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
    
    Write-Host "Total rooms returned: $($roomsResponse.count)"
    
    # Check how many rooms would be available after frontend filtering
    $vacantCleanRooms = $roomsResponse.data | Where-Object { $_.currentStatus -eq "vacant_clean" }
    $vacantDirtyRooms = $roomsResponse.data | Where-Object { $_.currentStatus -eq "vacant_dirty" }
    $allVacantRooms = $roomsResponse.data | Where-Object { $_.currentStatus -eq "vacant_clean" -or $_.currentStatus -eq "vacant_dirty" }
    
    Write-Host "Vacant clean rooms: $($vacantCleanRooms.Count)"
    Write-Host "Vacant dirty rooms: $($vacantDirtyRooms.Count)"
    Write-Host "Total vacant rooms (clean + dirty): $($allVacantRooms.Count)"
    
    # Check sharing types in vacant rooms
    $sharedRooms = $allVacantRooms | Where-Object { $_.sharingType -ne "single" -and $_.sharingType -ne $null }
    Write-Host "Shared rooms available: $($sharedRooms.Count)"
    
    if ($sharedRooms.Count -gt 0) {
        Write-Host "Shared rooms:"
        $sharedRooms | ForEach-Object {
            Write-Host "  Room $($_.roomNumber): $($_.sharingType) ($($_.totalBeds) beds) - $($_.currentStatus)"
        }
    }
}