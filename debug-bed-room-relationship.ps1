# Debug bed-room relationship
Write-Host "Debugging bed-room relationship..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Get room 307
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room307 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "307" }

Write-Host "Room 307 ID: $($room307.id)"

# Get beds for room 307
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Host "Beds in room 307:"
$bedsResponse.data | ForEach-Object {
    Write-Host "  Bed $($_.bedNumber): ID=$($_.id), Status=$($_.status)"
    # Note: The bed object might not have roomId in the response, but it should match the room
}

# Try a simple booking without bed ID first
Write-Host "Testing booking without bed ID (room-only booking)..."

$simpleBookingData = @{
    roomId = $room307.id
    guestName = "Simple Test Guest"
    guestEmail = "simple@example.com"
    guestPhone = "+91 9876543210"
    checkIn = (Get-Date).AddDays(10).ToString("yyyy-MM-dd")
    checkOut = (Get-Date).AddDays(11).ToString("yyyy-MM-dd")
    guests = 1
    totalAmount = 1500
    paymentStatus = "pending"
} | ConvertTo-Json

try {
    $simpleBookingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $simpleBookingData
    Write-Host "✅ Simple booking (no bed) created successfully!"
    Write-Host "   Booking ID: $($simpleBookingResponse.data.id)"
} catch {
    Write-Host "❌ Simple booking failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Simple booking error details: $errorBody"
    }
}