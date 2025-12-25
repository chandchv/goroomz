# Test booking with different dates to avoid conflicts
Write-Host "Testing booking creation with different dates..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Get room 307
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room307 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "307" }

# Get beds for room 307
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
$bed2 = $bedsResponse.data | Where-Object { $_.bedNumber -eq 2 }

# Try booking for next week to avoid date conflicts
$checkInDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
$checkOutDate = (Get-Date).AddDays(8).ToString("yyyy-MM-dd")

Write-Host "Booking dates: $checkInDate to $checkOutDate"

$bookingData = @{
    roomId = $room307.id
    bedId = $bed2.id
    guestName = "Future Test Guest"
    guestEmail = "future@example.com"
    guestPhone = "+91 9876543210"
    checkIn = $checkInDate
    checkOut = $checkOutDate
    guests = 1
    totalAmount = 1500
    paymentStatus = "pending"
} | ConvertTo-Json

try {
    $bookingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingData
    Write-Host "✅ Booking created successfully!"
    Write-Host "   Booking ID: $($bookingResponse.data.id)"
    Write-Host "   Room: $($bookingResponse.data.room.roomNumber)"
    Write-Host "   Guest: $($bookingResponse.data.user.name)"
    Write-Host "   Status: $($bookingResponse.data.status)"
    
    # Check bed status after booking
    $bedsResponseAfter = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}
    $bed2After = $bedsResponseAfter.data | Where-Object { $_.bedNumber -eq 2 }
    Write-Host "✅ Bed 2 status after booking: $($bed2After.status)"
    Write-Host "✅ Bed 2 booking ID: $($bed2After.bookingId)"
    
} catch {
    Write-Host "❌ Booking failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody"
    }
}