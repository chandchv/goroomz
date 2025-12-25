# Debug booking creation errors
Write-Host "Debugging booking creation errors..."

# Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"amit.patel@example.com","password":"Owner123!"}'
$token = $loginResponse.token

# Get room 307 (the one mentioned in the error)
$roomsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/status" -Method GET -Headers @{"Authorization"="Bearer $token"}
$room307 = $roomsResponse.data | Where-Object { $_.roomNumber -eq "307" }

# Get beds for room 307
$bedsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/rooms/$($room307.id)/beds" -Method GET -Headers @{"Authorization"="Bearer $token"}

Write-Host "Room 307 beds:"
$bedsResponse.data | ForEach-Object {
    Write-Host "  Bed $($_.bedNumber): status=$($_.status), bookingId=$($_.bookingId)"
}

# Try to create a booking with detailed error handling
$vacantBed = $bedsResponse.data | Where-Object { $_.status -eq "vacant" } | Select-Object -First 1

if ($vacantBed) {
    Write-Host "Attempting to book bed $($vacantBed.bedNumber)..."
    
    $bookingData = @{
        roomId = $room307.id
        bedId = $vacantBed.id
        guestName = "Debug Test Guest"
        guestEmail = "debug@example.com"
        guestPhone = "+91 9876543210"
        checkIn = (Get-Date).ToString("yyyy-MM-dd")
        checkOut = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        guests = 1
        totalAmount = 1500
        paymentStatus = "pending"
    } | ConvertTo-Json
    
    try {
        $bookingResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/internal/bookings" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body $bookingData
        Write-Host "✅ Booking created successfully: $($bookingResponse.data.id)"
    } catch {
        Write-Host "❌ Booking failed: $($_.Exception.Message)"
        
        # Try to get detailed error response
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody"
        }
    }
} else {
    Write-Host "❌ No vacant beds available in room 307"
}