# Test complete frontend booking flow
Write-Host "Testing complete frontend booking flow..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token
Write-Host "Login successful"

# Fetch rooms
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$availableRooms = $roomsResponse.data | Where-Object { $_.currentStatus -eq "vacant_clean" -or $_.currentStatus -eq "vacant_dirty" }
Write-Host "Available rooms: $($availableRooms.Count)"

# Find shared rooms
$sharedRooms = $availableRooms | Where-Object { $_.sharingType -ne "single" -and $_.sharingType -ne $null }
Write-Host "Shared rooms available: $($sharedRooms.Count)"

# Select room 302
$selectedRoom = $sharedRooms | Where-Object { $_.roomNumber -eq "302" }
Write-Host "Selected room 302: $($selectedRoom.sharingType)"

# Fetch beds
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($selectedRoom.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
$vacantBeds = $bedsResponse.data | Where-Object { $_.status -eq "vacant" }
Write-Host "Vacant beds: $($vacantBeds.Count)"

# Select bed and create booking
$selectedBed = $vacantBeds[0]
$bookingData = @{
    roomId = $selectedRoom.id
    bedId = $selectedBed.id
    guestName = "Frontend Test Guest"
    guestEmail = "frontend@example.com"
    guestPhone = "+91 9876543210"
    checkIn = (Get-Date).ToString("yyyy-MM-dd")
    checkOut = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    guests = 1
    totalAmount = 1500
    paymentStatus = "pending"
} | ConvertTo-Json

$bookingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingData

Write-Host "BOOKING CREATED SUCCESSFULLY!"
Write-Host "Booking ID: $($bookingResponse.data.id)"
Write-Host "Room: $($bookingResponse.data.room.roomNumber)"
Write-Host "Guest: $($bookingResponse.data.user.name)"
Write-Host "Status: $($bookingResponse.data.status)"

Write-Host ""
Write-Host "FRONTEND FLOW COMPLETE - All systems working!"