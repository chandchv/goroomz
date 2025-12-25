# Check if there are existing bookings for bed 1 in room 307
Write-Host "Checking existing bookings for bed 1 in room 307..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Get room 307
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room307 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "307" }

# Get beds for room 307
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
$bed1 = $bedsResponse.data | Where-Object { $_.bedNumber -eq 1 }

Write-Host "Bed 1 details:"
Write-Host "  ID: $($bed1.id)"
Write-Host "  Status: $($bed1.status)"
Write-Host "  Booking ID: $($bed1.bookingId)"

if ($bed1.booking) {
    Write-Host "  Existing booking:"
    Write-Host "    Booking ID: $($bed1.booking.id)"
    Write-Host "    Check-in: $($bed1.booking.checkInDate)"
    Write-Host "    Check-out: $($bed1.booking.checkOutDate)"
    Write-Host "    Status: $($bed1.booking.status)"
}

# Try to get all bookings to see if there are any for this bed
try {
    $bookingsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method GET -Headers @{"Authorization"="Bearer $token"}
    $bedBookings = $bookingsResponse.data | Where-Object { $_.bedId -eq $bed1.id }
    
    if ($bedBookings) {
        Write-Host "Found $($bedBookings.Count) existing bookings for this bed:"
        $bedBookings | ForEach-Object {
            Write-Host "  Booking $($_.id): $($_.checkIn) to $($_.checkOut) - Status: $($_.status)"
        }
    } else {
        Write-Host "No existing bookings found for this bed"
    }
} catch {
    Write-Host "Could not fetch bookings: $($_.Exception.Message)"
}